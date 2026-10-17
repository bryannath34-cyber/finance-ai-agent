from typing import List
from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.schemas.common import DataResponse, BaseResponse
from app.schemas.account import AccountCreate, AccountResponse
from app.services.finance_service import FinanceService

router = APIRouter(prefix="/accounts", tags=["Accounts"])

@router.get("", response_model=DataResponse[List[AccountResponse]])
def get_user_accounts(user: dict = Depends(get_current_user)):
    """Mengambil daftar rekening pengguna beserta kalkulasi saldo bersih terkini."""
    accounts = FinanceService.get_accounts_with_balance(user["id"])
    return DataResponse(
        success=True,
        message="Daftar rekening berhasil diambil.",
        data=accounts
    )

@router.post("", response_model=DataResponse[AccountResponse])
def create_user_account(payload: AccountCreate, user: dict = Depends(get_current_user)):
    """Membuat rekening baru (Kas Tunai, Bank, atau E-Wallet)."""
    acc = FinanceService.create_account(
        user_id=user["id"],
        name=payload.name,
        acc_type=payload.type,
        opening_balance=payload.opening_balance,
        opening_date=payload.opening_balance_date
    )
    return DataResponse(
        success=True,
        message=f"Rekening '{payload.name}' berhasil dibuat.",
        data=acc
    )
