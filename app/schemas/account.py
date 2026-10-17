from typing import Optional
from decimal import Decimal
from datetime import date
from pydantic import BaseModel, Field

class AccountCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50, description="Nama kantong dana/rekening")
    type: str = Field(..., pattern="^(CASH|BANK|EWALLET)$", description="Tipe rekening: CASH, BANK, EWALLET")
    opening_balance: Decimal = Field(default=Decimal("0.00"), description="Saldo awal rekening")
    opening_balance_date: Optional[date] = Field(default=None, description="Tanggal saldo awal")

class AccountResponse(BaseModel):
    id: int
    name: str
    type: str
    opening_balance: Decimal
    opening_balance_date: date
    current_balance: Decimal
    is_negative: bool
    is_active: bool
