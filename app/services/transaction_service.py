import uuid
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, timezone, date
from decimal import Decimal
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
    def list_transactions(user_id: int, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """Mengambil riwayat buku besar resmi pengguna."""
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
                WHERE t.user_id = %s
                ORDER BY t.transaction_date DESC, t.id DESC
                LIMIT %s OFFSET %s
            """, (user_id, limit, offset))
            return cur.fetchall()
