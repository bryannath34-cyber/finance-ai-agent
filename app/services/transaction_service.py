import uuid
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, timezone, date
from decimal import Decimal
import pymysql
from fastapi import HTTPException, status
from app.core.database import get_db_connection, get_db_cursor

logger = logging.getLogger("personal_finance.transaction_service")

class TransactionService:
    @staticmethod
    def create_batch_drafts(user_id: int, draft_items: List[Dict[str, Any]]) -> str:
        """
        Menyimpan hasil ekstraksi AI menjadi draft sementara dengan batch_id unik dan kedaluwarsa 15 menit.
        """
        if not draft_items:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tidak ada data draft untuk dibuat.")

        batch_id = str(uuid.uuid4())
        now_utc = datetime.now(timezone.utc)
        expires_at = now_utc + timedelta(minutes=15)
        expires_at_str = expires_at.strftime("%Y-%m-%d %H:%M:%S")

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                for item in draft_items:
                    tx_date = item.get("transaction_date") or date.today()
                    if isinstance(tx_date, str):
                        try:
                            tx_date = datetime.strptime(tx_date, "%Y-%m-%d").date()
                        except ValueError:
                            tx_date = date.today()

                    cur.execute("""
                        INSERT INTO transaction_drafts (
                            user_id, batch_id, type, amount, admin_fee, source_account_id,
                            destination_account_id, category_id, description, transaction_date,
                            status, expires_at
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s,
                            %s, %s, %s, %s,
                            'PENDING', %s
                        )
                    """, (
                        user_id, batch_id, item["type"], item["amount"], item.get("admin_fee", Decimal("0.00")),
                        item.get("source_account_id"), item.get("destination_account_id"),
                        item.get("category_id"), item.get("description"), tx_date,
                        expires_at_str
                    ))
                conn.commit()

        logger.info("Batch draft %s berisi %s item berhasil dibuat untuk User ID %s", batch_id, len(draft_items), user_id)
        return batch_id

    @staticmethod
    def get_batch_drafts(user_id: int, batch_id: str) -> List[Dict[str, Any]]:
        """Mengambil seluruh draft transaksi dalam batch dengan nama akun dan kategori."""
        with get_db_cursor(commit=False) as cur:
            cur.execute("""
                SELECT 
                    d.id, d.batch_id, d.type, d.amount, d.admin_fee,
                    d.source_account_id, sa.name as source_account_name,
                    d.destination_account_id, da.name as destination_account_name,
                    d.category_id, c.name as category_name,
                    d.description, d.transaction_date, d.status, d.expires_at
                FROM transaction_drafts d
                LEFT JOIN accounts sa ON d.source_account_id = sa.id AND sa.user_id = d.user_id
                LEFT JOIN accounts da ON d.destination_account_id = da.id AND da.user_id = d.user_id
                LEFT JOIN categories c ON d.category_id = c.id AND c.user_id = d.user_id
                WHERE d.user_id = %s AND d.batch_id = %s
                ORDER BY d.id ASC
            """, (user_id, batch_id))
            return cur.fetchall()

    @staticmethod
    def update_draft(user_id: int, draft_id: int, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Memperbarui kolom draft transaksi yang masih berstatus PENDING."""
        with get_db_cursor(commit=True) as cur:
            # Ambil data draft saat ini
            cur.execute("SELECT id, status FROM transaction_drafts WHERE id = %s AND user_id = %s", (draft_id, user_id))
            draft = cur.fetchone()
            if not draft:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Draft transaksi tidak ditemukan.")
            if draft["status"] != "PENDING":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Draft yang sudah final tidak dapat diubah.")

            set_clauses = []
            params = []
            for col in ["amount", "admin_fee", "source_account_id", "destination_account_id", "category_id", "description", "transaction_date"]:
                if col in update_data and update_data[col] is not None:
                    set_clauses.append(f"{col} = %s")
                    params.append(update_data[col])

            if set_clauses:
                query = f"UPDATE transaction_drafts SET {', '.join(set_clauses)} WHERE id = %s AND user_id = %s"
                params.extend([draft_id, user_id])
                cur.execute(query, tuple(params))

        return {"success": True, "message": "Draft transaksi berhasil diperbarui."}

    @staticmethod
    def cancel_draft(user_id: int, draft_id: int) -> Dict[str, Any]:
        """Membatalkan draft transaksi individual per baris."""
        now_utc_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        with get_db_cursor(commit=True) as cur:
            cur.execute("""
                UPDATE transaction_drafts
                SET status = 'CANCELLED', cancelled_at = %s
                WHERE id = %s AND user_id = %s AND status = 'PENDING'
            """, (now_utc_str, draft_id, user_id))
            if cur.rowcount == 0:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Draft tidak dapat dibatalkan (sudah final atau tidak ditemukan).")

        return {"success": True, "message": "Draft transaksi berhasil dibatalkan."}

    @staticmethod
    def confirm_batch(user_id: int, batch_id: str, ip_address: str = "127.0.0.1") -> Dict[str, Any]:
        """
        Alur Konfirmasi Batch Atomik:
        1. SELECT ... FOR UPDATE pada batch draft untuk mencegah race condition / double-click.
        2. Validasi kedaluwarsa: jika ada draft lewat waktu, tandai EXPIRED dan rollback.
        3. Abaikan baris CANCELLED (fitur pembatalan parsial per baris).
        4. Masukkan baris PRIMARY ke transactions.
        5. Masukkan baris ADMIN_FEE jika admin_fee > 0 (terhubung via parent_transaction_id).
        6. Update status draft ke CONFIRMED secara atomik.
        """
        now_utc = datetime.now(timezone.utc)
        now_utc_str = now_utc.strftime("%Y-%m-%d %H:%M:%S")

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # 1. Kunci seluruh baris draft pada batch
                cur.execute("""
                    SELECT id, batch_id, type, amount, admin_fee, source_account_id,
                           destination_account_id, category_id, description, transaction_date,
                           status, expires_at
                    FROM transaction_drafts
                    WHERE batch_id = %s AND user_id = %s
                    FOR UPDATE
                """, (batch_id, user_id))
                drafts = cur.fetchall()

                # Validasi 1: Batch kosong
                if not drafts:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch transaksi tidak ditemukan.")

                # Validasi 2: Kedaluwarsa (> 15 menit)
                expired_drafts = [d for d in drafts if d["status"] == "PENDING" and d["expires_at"] <= now_utc.replace(tzinfo=None)]
                if expired_drafts:
                    # Buka transaksi terpisah untuk menandai EXPIRED
                    cur.execute("""
                        UPDATE transaction_drafts
                        SET status = 'EXPIRED'
                        WHERE batch_id = %s AND user_id = %s AND status = 'PENDING'
                    """, (batch_id, user_id))
                    conn.commit()
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Batch draf telah kedaluwarsa dan ditandai EXPIRED. Silakan lakukan input ulang."
                    )

                # Validasi 3: Status draft
                if any(d["status"] in ("CONFIRMED", "EXPIRED") for d in drafts):
                    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Batch sudah pernah diproses atau kedaluwarsa.")

                pending_drafts = [d for d in drafts if d["status"] == "PENDING"]
                if not pending_drafts:
                    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Tidak ada draf pending yang tersisa untuk dikonfirmasi.")

                # 2. Cari Kategori Sistem "Biaya Admin" untuk user (dengan auto-fallback)
                cur.execute("""
                    SELECT id FROM categories 
                    WHERE user_id = %s AND (is_system = TRUE OR name = 'Biaya Admin')
                    ORDER BY is_system DESC LIMIT 1
                """, (user_id,))
                admin_cat_row = cur.fetchone()
                if admin_cat_row:
                    admin_cat_id = admin_cat_row["id"]
                else:
                    cur.execute("""
                        INSERT INTO categories (user_id, name, type, is_system, is_active)
                        VALUES (%s, 'Biaya Admin', 'EXPENSE', TRUE, TRUE)
                    """, (user_id,))
                    admin_cat_id = cur.lastrowid

                # 3. Update status draft ke CONFIRMED
                cur.execute("""
                    UPDATE transaction_drafts
                    SET status = 'CONFIRMED', confirmed_at = %s
                    WHERE batch_id = %s AND user_id = %s AND status = 'PENDING'
                """, (now_utc_str, batch_id, user_id))

                primary_count = 0
                admin_fee_count = 0

                # 4. Terbitkan transaksi buku besar resmi
                for draft in pending_drafts:
                    # Insert baris PRIMARY
                    cur.execute("""
                        INSERT INTO transactions (
                            user_id, draft_id, ledger_role, type, amount, source_account_id,
                            destination_account_id, category_id, description, transaction_date,
                            is_reversal
                        ) VALUES (
                            %s, %s, 'PRIMARY', %s, %s, %s,
                            %s, %s, %s, %s,
                            FALSE
                        )
                    """, (
                        user_id, draft["id"], draft["type"], draft["amount"],
                        draft["source_account_id"], draft["destination_account_id"],
                        draft["category_id"], draft["description"], draft["transaction_date"]
                    ))
                    primary_tx_id = cur.lastrowid
                    primary_count += 1

                    # Jika ada Biaya Admin pada transfer
                    if draft["type"] == "TRANSFER" and draft["admin_fee"] > 0:
                        fee_desc = f"Biaya Admin Transfer: {draft['description'] or ''}".strip()
                        cur.execute("""
                            INSERT INTO transactions (
                                user_id, draft_id, ledger_role, parent_transaction_id, type, amount,
                                source_account_id, destination_account_id, category_id, description,
                                transaction_date, is_reversal
                            ) VALUES (
                                %s, %s, 'ADMIN_FEE', %s, 'EXPENSE', %s,
                                %s, NULL, %s, %s,
                                %s, FALSE
                            )
                        """, (
                            user_id, draft["id"], primary_tx_id, draft["admin_fee"],
                            draft["source_account_id"], admin_cat_id, fee_desc,
                            draft["transaction_date"]
                        ))
                        admin_fee_count += 1

                # 5. Catat Audit Log
                audit_details = f"Batch {batch_id} dikonfirmasi: {primary_count} transaksi utama, {admin_fee_count} biaya admin."[:255]
                client_ip = (ip_address or "127.0.0.1")[:45]
                cur.execute("""
                    INSERT INTO system_audit_logs (user_id, event_type, details, ip_address)
                    VALUES (%s, 'BATCH_CONFIRMED', %s, %s)
                """, (user_id, audit_details, client_ip))

                conn.commit()

        logger.info("Batch %s sukses dikonfirmasi: %s utama, %s admin fee", batch_id, primary_count, admin_fee_count)
        return {
            "success": True,
            "message": f"Berhasil mengonfirmasi {primary_count} transaksi.",
            "batch_id": batch_id,
            "confirmed_count": len(pending_drafts),
            "primary_transactions_count": primary_count,
            "admin_fee_transactions_count": admin_fee_count
        }

    @staticmethod
    def list_transactions(
        user_id: int, 
        limit: int = 100, 
        offset: int = 0,
        year: Optional[int] = None,
        month: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Mengambil riwayat buku besar resmi pengguna dengan dukungan filter tahun dan bulan."""
        where_clauses = ["t.user_id = %s"]
        params: List[Any] = [user_id]

        if year is not None:
            where_clauses.append("YEAR(t.transaction_date) = %s")
            params.append(year)
        if month is not None:
            where_clauses.append("MONTH(t.transaction_date) = %s")
            params.append(month)

        where_sql = " AND ".join(where_clauses)
        params.extend([limit, offset])

        with get_db_cursor(commit=False) as cur:
            cur.execute(f"""
                SELECT 
                    t.id, t.draft_id, t.ledger_role, t.parent_transaction_id, t.reverses_transaction_id,
                    t.type, t.amount, t.description, t.transaction_date, t.is_reversal, t.created_at,
                    t.source_account_id, sa.name as source_account_name,
                    t.destination_account_id, da.name as destination_account_name,
                    t.category_id, c.name as category_name
                FROM transactions t
                LEFT JOIN accounts sa ON t.source_account_id = sa.id AND sa.user_id = t.user_id
                LEFT JOIN accounts da ON t.destination_account_id = da.id AND da.user_id = t.user_id
                LEFT JOIN categories c ON t.category_id = c.id AND c.user_id = t.user_id
                WHERE {where_sql}
                ORDER BY t.transaction_date DESC, t.id DESC
                LIMIT %s OFFSET %s
            """, tuple(params))
            return cur.fetchall()

    @staticmethod
    def get_transaction_by_id(user_id: int, transaction_id: int) -> Dict[str, Any]:
        """Mengambil rincian satu transaksi buku besar berdasarkan ID."""
        with get_db_cursor(commit=False) as cur:
            cur.execute("""
                SELECT 
                    t.id, t.draft_id, t.ledger_role, t.parent_transaction_id, t.reverses_transaction_id,
                    t.type, t.amount, t.description, t.transaction_date, t.is_reversal, t.created_at,
                    t.source_account_id, sa.name as source_account_name,
                    t.destination_account_id, da.name as destination_account_name,
                    t.category_id, c.name as category_name
                FROM transactions t
                LEFT JOIN accounts sa ON t.source_account_id = sa.id AND sa.user_id = t.user_id
                LEFT JOIN accounts da ON t.destination_account_id = da.id AND da.user_id = t.user_id
                LEFT JOIN categories c ON t.category_id = c.id AND c.user_id = t.user_id
                WHERE t.id = %s AND t.user_id = %s
            """, (transaction_id, user_id))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaksi tidak ditemukan.")
            return row

    @staticmethod
    def create_manual_transaction(user_id: int, payload: Dict[str, Any], ip_address: str = "127.0.0.1") -> Dict[str, Any]:
        """
        Mencatat transaksi manual langsung ke buku besar (membuat draft status CONFIRMED otomatis).
        Mendukung tipe EXPENSE, INCOME, dan TRANSFER (termasuk biaya admin).
        """
        tx_type = payload.get("type")
        amount = payload.get("amount")
        admin_fee = payload.get("admin_fee") or Decimal("0.00")
        source_account_id = payload.get("source_account_id")
        destination_account_id = payload.get("destination_account_id")
        category_id = payload.get("category_id")
        description = payload.get("description")
        tx_date = payload.get("transaction_date") or date.today()
        if isinstance(tx_date, str):
            try:
                tx_date = datetime.strptime(tx_date, "%Y-%m-%d").date()
            except ValueError:
                tx_date = date.today()

        # Validasi konsistensi tipe transaksi
        if tx_type == "EXPENSE":
            if not source_account_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rekening sumber wajib dipilih untuk pengeluaran.")
            if destination_account_id is not None:
                destination_account_id = None
            if not category_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Kategori pengeluaran wajib dipilih.")
            admin_fee = Decimal("0.00")
        elif tx_type == "INCOME":
            if not destination_account_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rekening tujuan wajib dipilih untuk pemasukan.")
            if source_account_id is not None:
                source_account_id = None
            if not category_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Kategori pemasukan wajib dipilih.")
            admin_fee = Decimal("0.00")
        elif tx_type == "TRANSFER":
            if not source_account_id or not destination_account_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rekening sumber dan tujuan wajib dipilih untuk transfer.")
            if source_account_id == destination_account_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rekening sumber dan tujuan tidak boleh sama.")
            category_id = None
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Tipe transaksi '{tx_type}' tidak valid.")

        now_utc = datetime.now(timezone.utc)
        now_utc_str = now_utc.strftime("%Y-%m-%d %H:%M:%S")
        expires_at_str = (now_utc + timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S")
        batch_id = str(uuid.uuid4())

        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    # Verifikasi kepemilikan rekening
                    if source_account_id:
                        cur.execute("SELECT id FROM accounts WHERE id = %s AND user_id = %s", (source_account_id, user_id))
                        if not cur.fetchone():
                            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rekening sumber tidak ditemukan.")
                    if destination_account_id:
                        cur.execute("SELECT id FROM accounts WHERE id = %s AND user_id = %s", (destination_account_id, user_id))
                        if not cur.fetchone():
                            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rekening tujuan tidak ditemukan.")

                    # Verifikasi kepemilikan kategori
                    if category_id:
                        cur.execute("SELECT id FROM categories WHERE id = %s AND user_id = %s", (category_id, user_id))
                        if not cur.fetchone():
                            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kategori tidak ditemukan.")

                    # 1. Masukkan draft otomatis berstatus CONFIRMED (memenuhi trigger & constraint foreign key)
                    cur.execute("""
                        INSERT INTO transaction_drafts (
                            user_id, batch_id, type, amount, admin_fee, source_account_id,
                            destination_account_id, category_id, description, transaction_date,
                            status, confirmed_at, expires_at
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s,
                            %s, %s, %s, %s,
                            'CONFIRMED', %s, %s
                        )
                    """, (
                        user_id, batch_id, tx_type, amount, admin_fee, source_account_id,
                        destination_account_id, category_id, description, tx_date,
                        now_utc_str, expires_at_str
                    ))
                    draft_id = cur.lastrowid

                    # 2. Masukkan transaksi PRIMARY ke buku besar
                    cur.execute("""
                        INSERT INTO transactions (
                            user_id, draft_id, ledger_role, type, amount, source_account_id,
                            destination_account_id, category_id, description, transaction_date,
                            is_reversal
                        ) VALUES (
                            %s, %s, 'PRIMARY', %s, %s, %s,
                            %s, %s, %s, %s,
                            FALSE
                        )
                    """, (
                        user_id, draft_id, tx_type, amount,
                        source_account_id, destination_account_id,
                        category_id, description, tx_date
                    ))
                    primary_tx_id = cur.lastrowid

                    # 3. Jika transfer dengan biaya admin > 0
                    if tx_type == "TRANSFER" and admin_fee > 0:
                        cur.execute("""
                            SELECT id FROM categories 
                            WHERE user_id = %s AND (is_system = TRUE OR name = 'Biaya Admin')
                            ORDER BY is_system DESC LIMIT 1
                        """, (user_id,))
                        admin_cat_row = cur.fetchone()
                        if admin_cat_row:
                            admin_cat_id = admin_cat_row["id"]
                        else:
                            cur.execute("""
                                INSERT INTO categories (user_id, name, type, is_system, is_active)
                                VALUES (%s, 'Biaya Admin', 'EXPENSE', TRUE, TRUE)
                            """, (user_id,))
                            admin_cat_id = cur.lastrowid

                        fee_desc = f"Biaya Admin Transfer: {description or ''}".strip()
                        cur.execute("""
                            INSERT INTO transactions (
                                user_id, draft_id, ledger_role, parent_transaction_id, type, amount,
                                source_account_id, destination_account_id, category_id, description,
                                transaction_date, is_reversal
                            ) VALUES (
                                %s, %s, 'ADMIN_FEE', %s, 'EXPENSE', %s,
                                %s, NULL, %s, %s,
                                %s, FALSE
                            )
                        """, (
                            user_id, draft_id, primary_tx_id, admin_fee,
                            source_account_id, admin_cat_id, fee_desc,
                            tx_date
                        ))

                    # 4. Audit Log
                    audit_details = f"Transaksi manual dibuat (ID {primary_tx_id}): {tx_type} Rp {amount}."[:255]
                    client_ip = (ip_address or "127.0.0.1")[:45]
                    cur.execute("""
                        INSERT INTO system_audit_logs (user_id, event_type, details, ip_address)
                        VALUES (%s, 'MANUAL_TX_CREATED', %s, %s)
                    """, (user_id, audit_details, client_ip))

                    conn.commit()

            return TransactionService.get_transaction_by_id(user_id, primary_tx_id)
        except HTTPException:
            raise
        except pymysql.MySQLError as e:
            err_code = e.args[0] if e.args else None
            err_msg = str(e)
            logger.error("MySQL error saat mencatat transaksi manual: %s", e)
            if err_code == 1142 or "command denied" in err_msg.lower():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Database user 'fin_bot_app' belum memiliki hak akses pada tabel MySQL: {err_msg}. Silakan jalankan: python scripts/fix_crud_grants.py"
                )
            elif err_code == 3819 or "check constraint" in err_msg.lower():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Validasi data transaksi tidak sesuai aturan bisnis database: {err_msg}"
                )
            elif "trigger" in err_msg.lower() or "gagal insert ledger" in err_msg.lower():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Validasi trigger database gagal: {err_msg}"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Database error saat mencatat transaksi: {err_msg}"
                )
        except Exception as e:
            logger.error("Error tidak terduga saat mencatat transaksi manual: %s", e, exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Gagal mencatat transaksi: {str(e)}"
            )

    @staticmethod
    def update_transaction(user_id: int, transaction_id: int, update_data: Dict[str, Any], ip_address: str = "127.0.0.1") -> Dict[str, Any]:
        """
        Menyunting transaksi buku besar (nominal, tanggal, kategori, rekening, deskripsi).
        Memvalidasi aturan bisnis dan sinkronisasi saldo real-time.
        """
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    # 1. Kunci baris transaksi (tanpa FOR UPDATE agar aman jika hak UPDATE belum diberikan)
                    cur.execute("""
                        SELECT id, draft_id, ledger_role, parent_transaction_id, reverses_transaction_id,
                               type, amount, source_account_id, destination_account_id, category_id,
                               description, transaction_date, is_reversal
                        FROM transactions
                        WHERE id = %s AND user_id = %s
                    """, (transaction_id, user_id))
                    tx = cur.fetchone()
                    if not tx:
                        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaksi tidak ditemukan.")

                    if tx["is_reversal"]:
                        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Jurnal pembalik tidak dapat disunting secara manual.")

                    # Cek apakah transaksi sudah pernah dibalik
                    cur.execute("SELECT id FROM transactions WHERE reverses_transaction_id = %s AND user_id = %s", (transaction_id, user_id))
                    if cur.fetchone():
                        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Transaksi yang telah dibalik tidak dapat disunting.")

                    tx_type = tx["type"]

                    # Nilai baru dengan fallback ke nilai lama
                    new_amount = update_data.get("amount") if update_data.get("amount") is not None else tx["amount"]
                    new_desc = update_data.get("description") if "description" in update_data else tx["description"]
                    new_date = update_data.get("transaction_date") if update_data.get("transaction_date") is not None else tx["transaction_date"]
                    if isinstance(new_date, str):
                        try:
                            new_date = datetime.strptime(new_date, "%Y-%m-%d").date()
                        except ValueError:
                            new_date = tx["transaction_date"]

                    new_src = update_data.get("source_account_id") if "source_account_id" in update_data else tx["source_account_id"]
                    new_dest = update_data.get("destination_account_id") if "destination_account_id" in update_data else tx["destination_account_id"]
                    new_cat = update_data.get("category_id") if "category_id" in update_data else tx["category_id"]

                    # Validasi konsistensi berdasarkan tipe
                    if tx_type == "EXPENSE":
                        new_dest = None
                        if not new_src:
                            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rekening sumber wajib diisi untuk pengeluaran.")
                        if not new_cat:
                            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Kategori wajib dipilih untuk pengeluaran.")
                    elif tx_type == "INCOME":
                        new_src = None
                        if not new_dest:
                            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rekening tujuan wajib diisi untuk pemasukan.")
                        if not new_cat:
                            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Kategori wajib dipilih untuk pemasukan.")
                    elif tx_type == "TRANSFER":
                        new_cat = None
                        if not new_src or not new_dest:
                            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rekening sumber dan tujuan wajib diisi untuk transfer.")
                        if new_src == new_dest:
                            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rekening sumber dan tujuan tidak boleh sama.")

                    # Verifikasi rekening dan kategori jika diubah
                    if new_src:
                        cur.execute("SELECT id FROM accounts WHERE id = %s AND user_id = %s", (new_src, user_id))
                        if not cur.fetchone():
                            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rekening sumber tidak valid.")
                    if new_dest:
                        cur.execute("SELECT id FROM accounts WHERE id = %s AND user_id = %s", (new_dest, user_id))
                        if not cur.fetchone():
                            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rekening tujuan tidak valid.")
                    if new_cat:
                        cur.execute("SELECT id FROM categories WHERE id = %s AND user_id = %s", (new_cat, user_id))
                        if not cur.fetchone():
                            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kategori tidak valid.")

                    # Update baris transaksi utama
                    cur.execute("""
                        UPDATE transactions
                        SET amount = %s, source_account_id = %s, destination_account_id = %s,
                            category_id = %s, description = %s, transaction_date = %s
                        WHERE id = %s AND user_id = %s
                    """, (new_amount, new_src, new_dest, new_cat, new_desc, new_date, transaction_id, user_id))

                    # Jika ada transaksi anak biaya admin (ADMIN_FEE)
                    cur.execute("""
                        UPDATE transactions
                        SET source_account_id = %s, transaction_date = %s
                        WHERE parent_transaction_id = %s AND user_id = %s
                    """, (new_src, new_date, transaction_id, user_id))

                    # Audit Log
                    try:
                        audit_details = f"Transaksi ID {transaction_id} diperbarui: Rp {new_amount} ({tx_type})."[:255]
                        client_ip = (ip_address or "127.0.0.1")[:45]
                        cur.execute("""
                            INSERT INTO system_audit_logs (user_id, event_type, details, ip_address)
                            VALUES (%s, 'TRANSACTION_UPDATED', %s, %s)
                        """, (user_id, audit_details, client_ip))
                    except Exception as e_audit:
                        logger.warning("Audit log transaksi gagal: %s", e_audit)

                    conn.commit()

            return TransactionService.get_transaction_by_id(user_id, transaction_id)
        except HTTPException:
            raise
        except pymysql.MySQLError as e:
            err_code = e.args[0] if e.args else None
            err_msg = str(e)
            logger.error("MySQL error saat memperbarui transaksi %s: %s", transaction_id, e)
            if err_code == 1142 or "command denied" in err_msg.lower():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Database user 'fin_bot_app' belum memiliki hak akses UPDATE pada tabel transactions. Silakan jalankan: GRANT SELECT, INSERT, UPDATE, DELETE ON personal_finance.transactions TO 'fin_bot_app'@'%'; FLUSH PRIVILEGES;"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Database error saat memperbarui transaksi: {err_msg}"
                )
        except Exception as e:
            logger.error("Error tidak terduga saat memperbarui transaksi %s: %s", transaction_id, e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Gagal memperbarui transaksi: {str(e)}"
            )

    @staticmethod
    def delete_transaction(user_id: int, transaction_id: int, ip_address: str = "127.0.0.1") -> Dict[str, Any]:
        """
        Menghapus transaksi dari buku besar secara aman.
        - Menghapus transaksi anak (biaya admin) terlebih dahulu bila ada.
        - Mencegah penghapusan jika transaksi telah memiliki jurnal pembalik.
        - Menghapus draft terkait jika tidak ada transaksi lain yang merujuk.
        """
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    # 1. Kunci dan periksa transaksi (tanpa FOR UPDATE agar aman jika hak UPDATE belum diberikan)
                    cur.execute("""
                        SELECT id, draft_id, ledger_role, parent_transaction_id, reverses_transaction_id, is_reversal, amount, type
                        FROM transactions
                        WHERE id = %s AND user_id = %s
                    """, (transaction_id, user_id))
                    tx = cur.fetchone()
                    if not tx:
                        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaksi tidak ditemukan.")

                    draft_id = tx["draft_id"]

                    # 2. Tangani transaksi anak dan jurnal pembalik secara berantai (cascade cleanup)
                    # Cari seluruh transaksi anak (misal: ADMIN_FEE pada transfer)
                    cur.execute("SELECT id FROM transactions WHERE parent_transaction_id = %s AND user_id = %s", (transaction_id, user_id))
                    child_rows = cur.fetchall()
                    child_ids = [c["id"] for c in child_rows] if child_rows else []
                    all_target_ids = [transaction_id] + child_ids

                    # Cari semua jurnal pembalik yang membalik transaksi ini atau anak-anaknya
                    format_target_ids = ','.join(['%s'] * len(all_target_ids))
                    cur.execute(f"""
                        SELECT id FROM transactions 
                        WHERE reverses_transaction_id IN ({format_target_ids}) AND user_id = %s
                    """, (*all_target_ids, user_id))
                    reversal_rows = cur.fetchall()
                    reversal_ids = [r["id"] for r in reversal_rows] if reversal_rows else []

                    # Jika ada jurnal pembalik, hapus anak pembalik dulu lalu pembaliknya (mencegah fk_tx_parent & fk_tx_reverses)
                    if reversal_ids:
                        format_rev_ids = ','.join(['%s'] * len(reversal_ids))
                        cur.execute(f"""
                            DELETE FROM transactions 
                            WHERE parent_transaction_id IN ({format_rev_ids}) AND user_id = %s
                        """, (*reversal_ids, user_id))

                        cur.execute(f"""
                            DELETE FROM transactions 
                            WHERE reverses_transaction_id IN ({format_target_ids}) AND user_id = %s
                        """, (*all_target_ids, user_id))

                    # 3. Hapus transaksi anak (misal: ADMIN_FEE yang merujuk parent_transaction_id ini)
                    cur.execute("DELETE FROM transactions WHERE parent_transaction_id = %s AND user_id = %s", (transaction_id, user_id))

                    # 4. Hapus transaksi ini
                    cur.execute("DELETE FROM transactions WHERE id = %s AND user_id = %s", (transaction_id, user_id))

                    # 4. Hapus draft jika tidak ada lagi transaksi yang menggunakannya (graceful)
                    if draft_id:
                        try:
                            cur.execute("SELECT id FROM transactions WHERE draft_id = %s AND user_id = %s LIMIT 1", (draft_id, user_id))
                            if not cur.fetchone():
                                cur.execute("DELETE FROM transaction_drafts WHERE id = %s AND user_id = %s", (draft_id, user_id))
                        except Exception as e_draft:
                            logger.warning("Draft ID %s tidak dapat dibersihkan otomatis: %s", draft_id, e_draft)

                    # 5. Audit Log (graceful)
                    try:
                        audit_details = f"Transaksi ID {transaction_id} ({tx['type']} Rp {tx['amount']}) berhasil dihapus."[:255]
                        client_ip = (ip_address or "127.0.0.1")[:45]
                        cur.execute("""
                            INSERT INTO system_audit_logs (user_id, event_type, details, ip_address)
                            VALUES (%s, 'TRANSACTION_DELETED', %s, %s)
                        """, (user_id, audit_details, client_ip))
                    except Exception as e_audit:
                        logger.warning("Pencatatan audit log transaksi gagal: %s", e_audit)

                    conn.commit()

            logger.info("Transaksi ID %s berhasil dihapus untuk User ID %s", transaction_id, user_id)
            return {"success": True, "message": "Transaksi berhasil dihapus dari buku besar."}
        except HTTPException:
            raise
        except pymysql.MySQLError as e:
            err_code = e.args[0] if e.args else None
            err_msg = str(e)
            logger.error("MySQL error saat menghapus transaksi %s: %s", transaction_id, e)
            if err_code == 1142 or "command denied" in err_msg.lower():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Database user 'fin_bot_app' belum memiliki hak akses DELETE pada tabel transactions. Silakan jalankan sql/05_fix_transaction_crud_grants.sql di MySQL: GRANT SELECT, INSERT, UPDATE, DELETE ON personal_finance.transactions TO 'fin_bot_app'@'%'; FLUSH PRIVILEGES;"
                )
            elif err_code == 1451 or "foreign key constraint fails" in err_msg.lower():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Transaksi tidak dapat dihapus karena masih terikat dengan relasi data transaksi lain."
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Database error saat menghapus transaksi: {err_msg}"
                )
        except Exception as e:
            logger.error("Error tidak terduga saat menghapus transaksi %s: %s", transaction_id, e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Gagal menghapus transaksi: {str(e)}"
            )
