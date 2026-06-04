from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List

from database import get_db
from models import Transaction, TagMapping
from schemas import SaveRequest, SaveResponse, TransactionOut, MonthInfo, CommentsUpdate
from services.tag_service import resolve_tags

router = APIRouter()


@router.get("/months", response_model=List[MonthInfo])
def get_months(db: Session = Depends(get_db)):
    rows = (
        db.query(Transaction.month, func.count(Transaction.id).label("count"))
        .group_by(Transaction.month)
        .order_by(Transaction.month.desc())
        .all()
    )
    return [MonthInfo(month=r.month, count=r.count) for r in rows]


@router.post("/transactions/save", response_model=SaveResponse)
def save_transactions(request: SaveRequest, db: Session = Depends(get_db)):
    existing = (
        db.query(Transaction).filter(Transaction.month == request.month).first()
    )
    if existing:
        if not request.replace:
            raise HTTPException(
                status_code=409,
                detail="Month already exists. Set replace=true to overwrite.",
            )
        db.query(Transaction).filter(Transaction.month == request.month).delete()
        db.commit()

    # Resolve tags for all particulars (cache-first, batch LLM for unknowns)
    all_particulars = [t.particulars for t in request.transactions]
    tag_map = resolve_tags(all_particulars, db)
    tags_resolved = len(tag_map)

    db_transactions = [
        Transaction(
            date=t.date,
            amount=t.amount,
            type=t.type,
            particulars=t.particulars,
            comments=t.comments,
            month=request.month,
        )
        for t in request.transactions
    ]
    db.add_all(db_transactions)
    db.commit()

    return SaveResponse(saved_count=len(db_transactions), tags_resolved=tags_resolved)


@router.get("/transactions", response_model=List[TransactionOut])
def get_transactions(
    month: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    tx_type: Optional[str] = None,
    tag: Optional[str] = None,
    category: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Transaction)
    if month:
        query = query.filter(Transaction.month == month)
    if date_from:
        query = query.filter(Transaction.date >= date_from)
    if date_to:
        query = query.filter(Transaction.date <= date_to)
    if tx_type:
        query = query.filter(Transaction.type == tx_type)
    if min_amount is not None:
        query = query.filter(Transaction.amount >= min_amount)
    if max_amount is not None:
        query = query.filter(Transaction.amount <= max_amount)
    if tag or category:
        tag_subquery = db.query(TagMapping.particulars)
        if tag:
            tag_subquery = tag_subquery.filter(TagMapping.tag == tag)
        if category:
            tag_subquery = tag_subquery.filter(TagMapping.category == category)
        matching = [r.particulars for r in tag_subquery.all()]
        query = query.filter(Transaction.particulars.in_(matching))

    transactions = query.order_by(Transaction.date, Transaction.id).all()

    # Fetch tag/category for these transactions via join on particulars
    particulars_set = list({t.particulars for t in transactions})
    tag_rows = (
        db.query(TagMapping).filter(TagMapping.particulars.in_(particulars_set)).all()
    )
    tag_map = {row.particulars: row for row in tag_rows}

    result = []
    for t in transactions:
        mapping = tag_map.get(t.particulars)
        result.append(
            TransactionOut(
                id=t.id,
                date=t.date,
                amount=t.amount,
                type=t.type,
                particulars=t.particulars,
                comments=t.comments,
                month=t.month,
                tag=mapping.tag if mapping else None,
                category=mapping.category if mapping else None,
                ignored=bool(mapping.ignored) if mapping else False,
            )
        )
    return result


@router.put("/transactions/{transaction_id}/comments")
def update_comments(
    transaction_id: int,
    update: CommentsUpdate,
    db: Session = Depends(get_db),
):
    t = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transaction not found")
    t.comments = update.comments
    db.commit()
    return {"ok": True}


@router.delete("/months/{month}")
def delete_month(month: str, db: Session = Depends(get_db)):
    deleted = db.query(Transaction).filter(Transaction.month == month).delete()
    db.commit()
    return {"deleted": deleted}
