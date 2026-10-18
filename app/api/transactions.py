import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Request
from app.core.security import get_current_user
from app.schemas.common import DataResponse, BaseResponse
from app.schemas.transaction import (
    DraftItemResponse,
    UpdateDraftRequest,
    ConfirmBatchRequest,
    ConfirmBatchResponse,
    TransactionItemResponse,
    ReverseTransactionRequest,
    CreateTransactionRequest,
    UpdateTransactionRequest,
)
from app.services.transaction_service import TransactionService
from app.services.finance_service import FinanceService

logger = logging.getLogger("personal_finance.transactions")

router = APIRouter(prefix="/transactions", tags=["Transactions"])

def _get_client_ip(request: Request) -> str:
    """Ekstraksi IP Address asli klien dengan prioritas X-Forwarded-For."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()[:45]
    if request.client and request.client.host:
        return request.client.host[:45]
    return "127.0.0.1"

@router.get("/drafts/{batch_id}", response_model=DataResponse[List[DraftItemResponse]])
def get_batch_drafts(batch_id: str, user: dict = Depends(get_current_user)):
    """Mengambil seluruh draft transaksi pada batch tertentu untuk direview di antarmuka web."""
    drafts = TransactionService.get_batch_drafts(user["id"], batch_id)
    return DataResponse(
        success=True,
        message=f"Berhasil mengambil {len(drafts)} draft.",
        data=drafts
    )

@router.patch("/drafts/{draft_id}", response_model=BaseResponse)
@router.put("/drafts/{draft_id}", response_model=BaseResponse)
def update_draft(draft_id: int, payload: UpdateDraftRequest, user: dict = Depends(get_current_user)):
    """Menyunting kolom nominal, akun, kategori, atau catatan pada draft berstatus PENDING."""
    logger.info("PATCH/PUT /drafts/%s oleh user %s: %s", draft_id, user.get("id"), payload)
    update_data = payload.model_dump(exclude_unset=True)
    res = TransactionService.update_draft(user["id"], draft_id, update_data)
    return BaseResponse(success=True, message=res["message"])

@router.post("/drafts/{draft_id}/cancel", response_model=BaseResponse)
def cancel_draft(draft_id: int, user: dict = Depends(get_current_user)):
    """Membatalkan draft transaksi individual per baris."""
    res = TransactionService.cancel_draft(user["id"], draft_id)
    return BaseResponse(success=True, message=res["message"])

@router.post("/confirm-batch", response_model=ConfirmBatchResponse)
def confirm_batch(
    payload: ConfirmBatchRequest,
    request: Request,
    user: dict = Depends(get_current_user)
):
    """
    Mengonfirmasi seluruh draft yang valid pada batch sekaligus:
    - Transaksi database atomik (SELECT ... FOR UPDATE)
    - Menyimpan ke buku besar transactions (PRIMARY dan ADMIN_FEE)
    - Menolak jika batch telah kedaluwarsa atau kosong
    """
    client_ip = _get_client_ip(request)
    res = TransactionService.confirm_batch(user["id"], payload.batch_id, ip_address=client_ip)
    return ConfirmBatchResponse(**res)

@router.get("", response_model=DataResponse[List[TransactionItemResponse]])
def list_transactions(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    year: Optional[int] = Query(None, ge=2000, le=2100),
    month: Optional[int] = Query(None, ge=1, le=12),
    user: dict = Depends(get_current_user)
):
    """Mengambil riwayat mutasi buku besar abadi (immutable ledger) dengan filter waktu."""
    txs = TransactionService.list_transactions(user["id"], limit=limit, offset=offset, year=year, month=month)
    return DataResponse(
        success=True,
        message=f"Berhasil mengambil {len(txs)} riwayat transaksi.",
        data=txs
    )

@router.post("", response_model=DataResponse[TransactionItemResponse])
def create_transaction(
    payload: CreateTransactionRequest,
    request: Request,
    user: dict = Depends(get_current_user)
):
    """Mencatat transaksi baru langsung ke buku besar."""
    client_ip = _get_client_ip(request)
    tx = TransactionService.create_manual_transaction(
        user_id=user["id"],
        payload=payload.model_dump(),
        ip_address=client_ip
    )
    return DataResponse(
        success=True,
        message="Transaksi berhasil dicatat ke buku besar.",
        data=tx
    )

@router.get("/{transaction_id}", response_model=DataResponse[TransactionItemResponse])
def get_transaction(
    transaction_id: int,
    user: dict = Depends(get_current_user)
):
    """Mengambil rincian transaksi buku besar berdasarkan ID."""
    tx = TransactionService.get_transaction_by_id(user["id"], transaction_id)
    return DataResponse(
        success=True,
        message="Berhasil mengambil data transaksi.",
        data=tx
    )

@router.put("/{transaction_id}", response_model=DataResponse[TransactionItemResponse])
def update_transaction(
    transaction_id: int,
    payload: UpdateTransactionRequest,
    request: Request,
    user: dict = Depends(get_current_user)
):
    """Menyunting transaksi buku besar yang telah dibukukan."""
    client_ip = _get_client_ip(request)
    update_data = payload.model_dump(exclude_unset=True)
    tx = TransactionService.update_transaction(
        user_id=user["id"],
        transaction_id=transaction_id,
        update_data=update_data,
        ip_address=client_ip
    )
    return DataResponse(
        success=True,
        message="Transaksi berhasil diperbarui.",
        data=tx
    )

@router.delete("/{transaction_id}", response_model=BaseResponse)
def delete_transaction(
    transaction_id: int,
    request: Request,
    user: dict = Depends(get_current_user)
):
    """Menghapus transaksi dari buku besar."""
    client_ip = _get_client_ip(request)
    res = TransactionService.delete_transaction(
        user_id=user["id"],
        transaction_id=transaction_id,
        ip_address=client_ip
    )
    return BaseResponse(
        success=True,
        message=res["message"]
    )

@router.post("/{transaction_id}/reverse", response_model=DataResponse[dict])
def reverse_transaction(
    transaction_id: int,
    payload: ReverseTransactionRequest,
    request: Request,
    user: dict = Depends(get_current_user)
):
    """
    Menerbitkan Jurnal Pembalik (Reversal Transaction) untuk membatalkan mutasi buku besar:
    - Menghasilkan baris pembalik ber-ledger_role = 'REVERSAL'
    - Jika mutasi berupa TRANSFER berbiaya admin, membalik biaya admin secara atomik
    """
    client_ip = _get_client_ip(request)
    res = FinanceService.reverse_transaction(
        user_id=user["id"],
        transaction_id=transaction_id,
        reason=payload.reason or "Koreksi pencatatan",
        ip_address=client_ip
    )
    return DataResponse(
        success=True,
        message=res["message"],
        data=res
    )

