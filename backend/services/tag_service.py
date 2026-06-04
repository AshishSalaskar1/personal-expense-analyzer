from sqlalchemy.orm import Session
from models import TagMapping
from services import llm


def resolve_tags(particulars: list[str], db: Session) -> dict[str, str]:
    """
    Cache-aware tag resolver:
    1. Fetch any known mappings from DB.
    2. For unknowns, call LLM in one batch (chunked if large).
    3. Persist new mappings to DB.
    4. Return full {particular: tag} map for all inputs.
    """
    if not particulars:
        return {}

    unique = list(set(particulars))

    # Check DB cache
    existing_rows = (
        db.query(TagMapping).filter(TagMapping.particulars.in_(unique)).all()
    )
    known: dict[str, str] = {row.particulars: row.tag for row in existing_rows}
    unknown = [p for p in unique if p not in known]

    new_mappings: dict[str, str] = {}
    if unknown:
        new_mappings = llm.resolve_tags_batch(unknown)
        # Persist new mappings
        for particular, tag in new_mappings.items():
            db.merge(TagMapping(particulars=particular, tag=tag, category=None))
        db.commit()

    return {**known, **new_mappings}
