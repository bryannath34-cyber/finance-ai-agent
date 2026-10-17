from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from app.core.security import get_current_user
from app.schemas.common import DataResponse
from app.schemas.category import CategoryCreate, CategoryResponse
from app.services.finance_service import FinanceService

router = APIRouter(prefix="/categories", tags=["Categories"])

@router.get("", response_model=DataResponse[List[CategoryResponse]])
def get_user_categories(
    type: Optional[str] = Query(None, pattern="^(INCOME|EXPENSE)$"),
    user: dict = Depends(get_current_user)
):
    """Mengambil daftar kategori mutasi (sistem dan kustom pengguna)."""
    categories = FinanceService.get_categories(user["id"], cat_type=type)
    return DataResponse(
        success=True,
        message="Daftar kategori berhasil diambil.",
        data=categories
    )

@router.post("", response_model=DataResponse[CategoryResponse])
def create_user_category(payload: CategoryCreate, user: dict = Depends(get_current_user)):
    """Menambahkan kategori pengeluaran atau pemasukan baru."""
    cat = FinanceService.create_category(
        user_id=user["id"],
        name=payload.name,
        cat_type=payload.type
    )
    return DataResponse(
        success=True,
        message=f"Kategori '{payload.name}' berhasil dibuat.",
        data=cat
    )
