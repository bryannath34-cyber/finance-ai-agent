import logging
import csv
import io
import re
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Request, UploadFile, File, HTTPException, Response
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
from app.services.export_service import ExportService

logger = logging.getLogger("personal_finance.transactions")

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.post("/import-csv", response_model=DataResponse[dict])
async def import_transactions_csv(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Impor CSV sebagai draft agar setiap baris tetap ditinjau sebelum masuk buku besar."""
    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(status_code=415, detail="Pilih berkas .csv.")
    raw = await file.read(2_000_001)
    if len(raw) > 2_000_000:
        raise HTTPException(status_code=413, detail="Ukuran CSV maksimal 2 MB.")
    try:
        content = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="CSV harus menggunakan encoding UTF-8.")
    try:
        dialect = csv.Sniffer().sniff(content[:4096], delimiters=",;\t")
    except csv.Error:
        dialect = csv.excel
    reader = csv.DictReader(io.StringIO(content), dialect=dialect)
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV kosong atau tidak memiliki header.")
    def normalize_header(value):
        value = str(value or "").replace("\ufeff", "").strip().lower()
        return re.sub(r"[^a-z0-9]+", "_", value).strip("_")

    header_aliases = {
        "type": {"type", "tipe", "jenis", "transaction_type", "tipe_transaksi", "jenis_transaksi"},
        "amount": {"amount", "nominal", "jumlah", "nilai", "amount_idr", "nominal_idr", "jumlah_idr"},
        "date": {"date", "tanggal", "transaction_date", "tanggal_transaksi"},
        "account": {"account", "akun", "rekening", "account_name", "nama_rekening"},
        "source_account": {"source_account", "rekening_sumber", "akun_sumber", "from_account"},
        "destination_account": {"destination_account", "rekening_tujuan", "akun_tujuan", "to_account"},
        "category": {"category", "kategori", "category_name", "nama_kategori"},
        "description": {"description", "deskripsi", "keterangan", "catatan", "memo"},
        "admin_fee": {"admin_fee", "biaya_admin", "biaya_administrasi", "fee"},
    }
    aliases_to_canonical = {
        alias: canonical
        for canonical, aliases in header_aliases.items()
        for alias in aliases
    }
    normalized_headers = {}
    for original_header in reader.fieldnames:
        normalized = normalize_header(original_header)
        canonical = aliases_to_canonical.get(normalized)
        if canonical and canonical not in normalized_headers:
            normalized_headers[canonical] = original_header
    required = {"type", "amount"}
    if not required.issubset(normalized_headers):
        raise HTTPException(
            status_code=400,
            detail=(
                "Kolom wajib transaksi belum ditemukan: jenis/tipe (contoh: EXPENSE) dan nominal/amount. "
                "Kolom opsional: tanggal, rekening, rekening_sumber, rekening_tujuan, kategori, deskripsi, biaya_admin."
            ),
        )

    def cell(row, *names):
        for name in names:
            key = normalized_headers.get(name)
            if key is not None:
                return str(row.get(key) or "").strip()
        return ""

    accounts_res = FinanceService.get_accounts_with_balance(user["id"])
    categories = FinanceService.get_categories(user["id"])
    accounts_by_name = {a["name"].strip().casefold(): a for a in accounts_res if a.get("is_active")}
    categories_by_key = {(c["type"], c["name"].strip().casefold()): c for c in categories if c.get("is_active")}
    existing = TransactionService.list_transactions(user["id"], limit=500, offset=0)
    known = set()
    def normalized_amount(value):
        try:
            return format(Decimal(str(value)).normalize(), "f")
        except (InvalidOperation, ValueError):
            return str(value)

    def parse_amount(value):
        cleaned = str(value or "").replace("Rp", "").replace("rp", "").replace(" ", "").strip()
        if "." in cleaned and "," in cleaned:
            if cleaned.rfind(",") > cleaned.rfind("."):
                cleaned = cleaned.replace(".", "").replace(",", ".")
            else:
                cleaned = cleaned.replace(",", "")
        elif "," in cleaned:
            cleaned = cleaned.replace(".", "").replace(",", ".")
        elif "." in cleaned:
            tail = cleaned.rsplit(".", 1)[-1]
            if len(tail) == 3 and cleaned.count(".") == 1:
                cleaned = cleaned.replace(".", "")
        return Decimal(cleaned)

    for tx in existing:
        known.add((str(tx["transaction_date"]), tx["type"], normalized_amount(tx["amount"]), tx.get("source_account_id"), tx.get("destination_account_id"), (tx.get("description") or "").strip().casefold()))

    draft_items = []
    duplicate_rows = []
    errors = []
    seen_csv = set()
    valid_duplicate_flags = []
    for row_number, row in enumerate(reader, start=2):
        if row_number > 1001:
            errors.append({"row": row_number, "message": "Maksimal 1.000 baris per impor."})
            break
        try:
            tx_type_value = normalize_header(cell(row, "type"))
            tx_type = {
                "pemasukan": "INCOME", "income": "INCOME", "masuk": "INCOME",
                "pengeluaran": "EXPENSE", "expense": "EXPENSE", "keluar": "EXPENSE",
                "transfer": "TRANSFER",
            }.get(tx_type_value, cell(row, "type").upper())
            if tx_type not in {"INCOME", "EXPENSE", "TRANSFER"}:
                raise ValueError("type harus INCOME, EXPENSE, atau TRANSFER")
            amount = parse_amount(cell(row, "amount"))
            if not amount.is_finite() or amount <= 0:
                raise ValueError("amount harus lebih besar dari 0")
            date_text = cell(row, "date") or datetime.now().strftime("%Y-%m-%d")
            tx_date = None
            for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
                try:
                    tx_date = datetime.strptime(date_text, fmt).date()
                    break
                except ValueError:
                    continue
            if tx_date is None:
                raise ValueError("date gunakan YYYY-MM-DD atau DD/MM/YYYY")

            account_name = cell(row, "account")
            source_name = cell(row, "source_account") or (account_name if tx_type != "INCOME" else "")
            destination_name = cell(row, "destination_account") or (account_name if tx_type == "INCOME" else "")
            source = accounts_by_name.get(source_name.casefold()) if source_name else None
            destination = accounts_by_name.get(destination_name.casefold()) if destination_name else None
            if tx_type in {"EXPENSE", "TRANSFER"} and not source:
                raise ValueError(f"rekening sumber '{source_name or '-'}' tidak ditemukan")
            if tx_type in {"INCOME", "TRANSFER"} and not destination:
                raise ValueError(f"rekening tujuan '{destination_name or '-'}' tidak ditemukan")
            if tx_type == "TRANSFER" and source["id"] == destination["id"]:
                raise ValueError("rekening sumber dan tujuan harus berbeda")
            category_name = cell(row, "category")
            category = categories_by_key.get((tx_type, category_name.casefold())) if category_name and tx_type != "TRANSFER" else None
            if tx_type != "TRANSFER" and not category:
                raise ValueError(f"kategori '{category_name or '-'}' untuk {tx_type} tidak ditemukan")
            fee = parse_amount(cell(row, "admin_fee") or "0")
            if not fee.is_finite() or fee < 0 or (fee > 0 and tx_type != "TRANSFER"):
                raise ValueError("admin_fee hanya boleh bernilai positif untuk transaksi TRANSFER")
            description = cell(row, "description")[:255] or "Impor CSV"
            signature = (str(tx_date), tx_type, normalized_amount(amount), source["id"] if source else None, destination["id"] if destination else None, description.strip().casefold())
            duplicate = signature in known or signature in seen_csv
            if duplicate:
                duplicate_rows.append(row_number)
            seen_csv.add(signature)
            valid_duplicate_flags.append(duplicate)
            draft_items.append({
                "type": tx_type, "amount": amount, "admin_fee": fee,
                "source_account_id": source["id"] if source else None,
                "destination_account_id": destination["id"] if destination else None,
                "category_id": category["id"] if category else None,
                "description": description, "transaction_date": tx_date,
            })
        except (ValueError, InvalidOperation) as exc:
            errors.append({"row": row_number, "message": str(exc)})

    if not draft_items:
        return DataResponse(success=True, message="Tidak ada baris valid untuk diimpor.", data={"batch_id": None, "drafts": [], "errors": errors, "duplicate_rows": []})
    batch_id = TransactionService.create_batch_drafts(user["id"], draft_items)
    drafts = TransactionService.get_batch_drafts(user["id"], batch_id)
    for idx, draft in enumerate(drafts):
        draft["possible_duplicate"] = valid_duplicate_flags[idx]
    return DataResponse(success=True, message=f"{len(drafts)} baris disiapkan sebagai draft.", data={"batch_id": batch_id, "drafts": drafts, "errors": errors, "duplicate_rows": duplicate_rows})

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

@router.api_route("/drafts/{draft_id}", methods=["POST", "PUT", "PATCH"], response_model=BaseResponse)
@router.api_route("/drafts/{draft_id}/update", methods=["POST", "PUT", "PATCH"], response_model=BaseResponse)
def update_draft(draft_id: int, payload: UpdateDraftRequest, user: dict = Depends(get_current_user)):
    """Menyunting kolom nominal, akun, kategori, atau catatan pada draft berstatus PENDING."""
    logger.info("UPDATE /drafts/%s oleh user %s: %s", draft_id, user.get("id"), payload)
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

@router.get("/export")
def export_transactions(
    year: Optional[int] = Query(None, ge=2000, le=2100),
    month: Optional[int] = Query(None, ge=1, le=12),
    type: Optional[str] = Query(None),
    format: str = Query("xlsx", regex="^(xlsx|csv)$"),
    user: dict = Depends(get_current_user)
):
    """
    Mengekspor data transaksi buku besar ke format Excel (.xlsx) atau CSV (.csv):
    - Mendukung filter tahun, bulan, dan jenis transaksi (EXPENSE/INCOME/ALL)
    - Menghasilkan tabel rapi dengan kolom tanggal, jenis, kategori, rekening, deskripsi, dan total di bawah
    """
    txs = TransactionService.get_transactions_for_export(
        user_id=user["id"],
        year=year,
        month=month,
        transaction_type=type
    )
    data_bytes, filename, media_type = ExportService.export(
        transactions=txs,
        year=year,
        month=month,
        transaction_type=type,
        format_type=format
    )
    return Response(
        content=data_bytes,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        }
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

