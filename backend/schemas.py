from pydantic import BaseModel, ConfigDict
from typing import Optional, List


class TransactionIn(BaseModel):
    date: str
    amount: float
    type: str
    particulars: str
    comments: Optional[str] = None


class TransactionOut(BaseModel):
    id: int
    date: str
    amount: float
    type: str
    particulars: str
    comments: Optional[str] = None
    month: str
    tag: Optional[str] = None
    category: Optional[str] = None


class UploadResponse(BaseModel):
    detected_month: Optional[str]
    month_mismatch: bool
    transactions: List[TransactionIn]


class SaveRequest(BaseModel):
    month: str
    transactions: List[TransactionIn]
    replace: bool = False


class SaveResponse(BaseModel):
    saved_count: int
    tags_resolved: int


class TagResolveRequest(BaseModel):
    particulars: List[str]


class TagMappingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    particulars: str
    tag: str
    category: Optional[str] = None


class TagMappingUpdate(BaseModel):
    particulars: str
    category: Optional[str] = None


class MonthInfo(BaseModel):
    month: str
    count: int


class CommentsUpdate(BaseModel):
    comments: Optional[str] = None
