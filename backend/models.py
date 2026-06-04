from sqlalchemy import Column, Integer, String, Float, Boolean
from database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(String, nullable=False)        # ISO YYYY-MM-DD
    amount = Column(Float, nullable=False)       # absolute positive value
    type = Column(String, nullable=False)        # "debit" | "credit"
    particulars = Column(String, nullable=False) # raw description from statement
    comments = Column(String, nullable=True)     # user-editable notes
    month = Column(String, nullable=False)       # YYYY-MM (user-selected at upload)


class TagMapping(Base):
    __tablename__ = "tag_mappings"

    particulars = Column(String, primary_key=True)  # raw description (matches Transaction.particulars)
    tag = Column(String, nullable=False)             # LLM-resolved readable label
    category = Column(String, nullable=True)         # user fills manually
    ignored = Column(Boolean, nullable=False, default=False)  # excluded from dashboards
