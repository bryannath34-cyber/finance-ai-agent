from typing import Optional, List
from decimal import Decimal
from pydantic import BaseModel, Field

class ParseTextRequest(BaseModel):
    text: str = Field(..., min_length=2, max_length=1000, description="Kalimat mutasi keuangan")

class ParsedDraftItem(BaseModel):
    type: str = Field(..., pattern="^(INCOME|EXPENSE|TRANSFER)$")
    amount: Decimal = Field(..., gt=0)
    admin_fee: Decimal = Field(default=Decimal("0.00"), ge=0)
    source_account_name: Optional[str] = None
    destination_account_name: Optional[str] = None
    category_name: Optional[str] = None
    description: Optional[str] = None
    transaction_date: Optional[str] = None

class LLMParseResult(BaseModel):
    batch_id: str
    items_count: int
    drafts: List[dict]
