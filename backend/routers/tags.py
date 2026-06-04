from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import TagMapping
from schemas import TagResolveRequest, TagMappingOut, TagMappingUpdate
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
    return (
        db.query(TagMapping)
        .order_by(TagMapping.tag, TagMapping.particulars)
        .all()
    )


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
