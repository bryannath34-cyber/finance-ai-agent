from typing import Optional, List
from decimal import Decimal
from datetime import date, datetime
from pydantic import BaseModel, Field

class DraftItemResponse(BaseModel):
    id: int
    batch_id: str
    type: str
    amount: Decimal
    admin_fee: Decimal
    source_account_id: Optional[int] = None
    source_account_name: Optional[str] = None
    destination_account_id: Optional[int] = None
    destination_account_name: Optional[str] = None
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    description: Optional[str] = None
    transaction_date: date
    status: str
    expires_at: datetime

class UpdateDraftRequest(BaseModel):
    amount: Optional[Decimal] = Field(None, gt=0)
    admin_fee: Optional[Decimal] = Field(None, ge=0)
    source_account_id: Optional[int] = None
    destination_account_id: Optional[int] = None
    category_id: Optional[int] = None
    description: Optional[str] = Field(None, max_length=255)
    transaction_date: Optional[date] = None

class ConfirmBatchRequest(BaseModel):
    batch_id: str = Field(..., min_length=1, max_length=64)

class ConfirmBatchResponse(BaseModel):
    success: bool = True
    message: str
    batch_id: str
    confirmed_count: int
    primary_transactions_count: int
    admin_fee_transactions_count: int

class TransactionItemResponse(BaseModel):
    id: int
    draft_id: Optional[int] = None
    ledger_role: str
    parent_transaction_id: Optional[int] = None
    reverses_transaction_id: Optional[int] = None
    type: str
    amount: Decimal
    source_account_id: Optional[int] = None
    source_account_name: Optional[str] = None
    destination_account_id: Optional[int] = None
    destination_account_name: Optional[str] = None
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    description: Optional[str] = None
    transaction_date: date
    is_reversal: bool
    created_at: datetime

class ReverseTransactionRequest(BaseModel):
    transaction_id: int = Field(..., gt=0)
    reason: Optional[str] = Field("Koreksi kesalahan pencatatan", max_length=255)
