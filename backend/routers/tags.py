from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import List

from database import get_db
from models import TagMapping, Transaction
from schemas import TagResolveRequest, TagMappingOut, TagMappingUpdate, TagIgnoreUpdate
from services.tag_service import resolve_tags

router = APIRouter()


@router.post("/tags/resolve")
def resolve_tags_endpoint(
    request: TagResolveRequest, db: Session = Depends(get_db)
) -> dict:
    """
    Takes a list of particulars, returns {particular: tag} for each.
    Uses DB cache first; calls LLM only for unknowns.
    """
    return resolve_tags(request.particulars, db)


@router.get("/tag-mappings", response_model=List[TagMappingOut])
def get_tag_mappings(db: Session = Depends(get_db)):
    mappings = (
        db.query(TagMapping)
        .order_by(TagMapping.tag, TagMapping.particulars)
        .all()
    )

    # Aggregate transaction stats per particulars
    agg_rows = (
        db.query(
            Transaction.particulars,
            func.sum(
                case((Transaction.type == "debit", Transaction.amount), else_=0)
            ).label("total_amount"),
            func.count(Transaction.id).label("tx_count"),
            func.sum(case((Transaction.type == "debit", 1), else_=0)).label("debit_count"),
            func.sum(case((Transaction.type == "credit", 1), else_=0)).label("credit_count"),
            func.max(Transaction.date).label("last_date"),
        )
        .group_by(Transaction.particulars)
        .all()
    )
    agg_map = {r.particulars: r for r in agg_rows}

    results = []
    for m in mappings:
        agg = agg_map.get(m.particulars)
        tx_type = None
        if agg:
            if agg.debit_count and agg.credit_count:
                tx_type = "mixed"
            elif agg.debit_count:
                tx_type = "debit"
            elif agg.credit_count:
                tx_type = "credit"
        results.append(
            TagMappingOut(
                particulars=m.particulars,
                tag=m.tag,
                category=m.category,
                ignored=bool(m.ignored),
                type=tx_type,
                total_amount=round(agg.total_amount, 2) if agg else None,
                tx_count=agg.tx_count if agg else 0,
                last_date=agg.last_date if agg else None,
            )
        )
    return results


@router.put("/tag-mappings/ignore")
def set_tag_ignored(update: TagIgnoreUpdate, db: Session = Depends(get_db)):
    """Set ignored=True/False for all particulars that share a given tag."""
    rows = db.query(TagMapping).filter(TagMapping.tag == update.tag).all()
    if not rows:
        raise HTTPException(status_code=404, detail="Tag not found")
    for row in rows:
        row.ignored = update.ignored
    db.commit()
    return {"ok": True, "affected": len(rows)}


@router.put("/tag-mappings", response_model=TagMappingOut)
def update_tag_mapping(
    update: TagMappingUpdate, db: Session = Depends(get_db)
):
    """Update the category for a tag mapping. particulars is in the request body."""
    mapping = (
        db.query(TagMapping)
        .filter(TagMapping.particulars == update.particulars)
        .first()
    )
    if not mapping:
        raise HTTPException(status_code=404, detail="Tag mapping not found")
    mapping.category = update.category
    db.commit()
    db.refresh(mapping)
    return mapping
