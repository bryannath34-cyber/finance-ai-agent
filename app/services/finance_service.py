import logging
from typing import List, Dict, Any, Optional
from decimal import Decimal
from datetime import date
from fastapi import HTTPException, status
from app.core.database import get_db_connection, get_db_cursor

logger = logging.getLogger("personal_finance.finance_service")

class FinanceService:
    @staticmethod
    def get_accounts_with_balance(user_id: int) -> List[Dict[str, Any]]:
        """
        Menghitung saldo akhir bersih seluruh rekening pengguna berdasarkan formula netting akuntansi:
        Saldo Akhir = Saldo Awal + Arus Masuk Bersih - Arus Keluar Bersih
        """
        with get_db_cursor(commit=False) as cur:
            cur.execute("""
                SELECT 
                    a.id, a.name, a.type, a.opening_balance, a.opening_balance_date, a.is_active,
                    a.opening_balance + COALESCE(SUM(
                        CASE 
                            -- Arus Masuk (INCOME / TRANSFER masuk)
                            WHEN t.destination_account_id = a.id AND t.is_reversal = FALSE THEN t.amount
                            WHEN t.destination_account_id = a.id AND t.is_reversal = TRUE THEN -t.amount
                            -- Arus Keluar (EXPENSE / TRANSFER keluar)
                            WHEN t.source_account_id = a.id AND t.is_reversal = FALSE THEN -t.amount
                            WHEN t.source_account_id = a.id AND t.is_reversal = TRUE THEN t.amount
                            ELSE 0
                        END
                    ), 0) AS current_balance
                FROM accounts a
                LEFT JOIN transactions t ON (t.source_account_id = a.id OR t.destination_account_id = a.id) AND t.user_id = a.user_id
                WHERE a.user_id = %s
                GROUP BY a.id, a.name, a.type, a.opening_balance, a.opening_balance_date, a.is_active
                ORDER BY a.id ASC
            """, (user_id,))
            rows = cur.fetchall()

        results = []
        for r in rows:
            bal = Decimal(str(r["current_balance"]))
            results.append({
                "id": r["id"],
                "name": r["name"],
                "type": r["type"],
                "opening_balance": r["opening_balance"],
                "opening_balance_date": r["opening_balance_date"],
                "current_balance": bal,
                "is_negative": bal < 0,
                "is_active": bool(r["is_active"])
            })
        return results

    @staticmethod
    def create_account(user_id: int, name: str, acc_type: str, opening_balance: Decimal = Decimal("0.00"), opening_date: Optional[date] = None) -> Dict[str, Any]:
        """Membuat rekening / kantong dana baru."""
        if not opening_date:
            opening_date = date.today()

        with get_db_cursor(commit=True) as cur:
            # Cek duplikasi nama akun
            cur.execute("SELECT id FROM accounts WHERE user_id = %s AND name = %s", (user_id, name))
            if cur.fetchone():
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Rekening dengan nama '{name}' sudah ada.")

            cur.execute("""
                INSERT INTO accounts (user_id, name, type, opening_balance, opening_balance_date, is_active)
                VALUES (%s, %s, %s, %s, %s, TRUE)
            """, (user_id, name, acc_type, opening_balance, opening_date))
            acc_id = cur.lastrowid

        return {
            "id": acc_id,
            "name": name,
            "type": acc_type,
            "opening_balance": opening_balance,
            "opening_balance_date": opening_date,
            "current_balance": opening_balance,
            "is_negative": opening_balance < 0,
            "is_active": True
        }

    @staticmethod
    def get_categories(user_id: int, cat_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Mengambil daftar kategori milik pengguna dan kategori sistem."""
        query = """
            SELECT id, name, type, is_system, is_active
            FROM categories
            WHERE user_id = %s
        """
        params = [user_id]
        if cat_type:
            query += " AND type = %s"
            params.append(cat_type)
        query += " ORDER BY is_system DESC, name ASC"

        with get_db_cursor(commit=False) as cur:
            cur.execute(query, tuple(params))
            return cur.fetchall()

    @staticmethod
    def create_category(user_id: int, name: str, cat_type: str) -> Dict[str, Any]:
        """Menambahkan kategori kustom pengguna."""
        with get_db_cursor(commit=True) as cur:
            cur.execute("SELECT id FROM categories WHERE user_id = %s AND type = %s AND name = %s", (user_id, cat_type, name))
            if cur.fetchone():
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Kategori '{name}' ({cat_type}) sudah ada.")

            cur.execute("""
                INSERT INTO categories (user_id, name, type, is_system, is_active)
                VALUES (%s, %s, %s, FALSE, TRUE)
            """, (user_id, name, cat_type))
            cat_id = cur.lastrowid

        return {
            "id": cat_id,
            "name": name,
            "type": cat_type,
            "is_system": False,
            "is_active": True
        }

    @staticmethod
    def reverse_transaction(user_id: int, transaction_id: int, reason: str = "Koreksi pencatatan") -> Dict[str, Any]:
        """
        Eksekusi Jurnal Pembalik (Reversal Transaction):
        - Transaksi dibalik bersifat append-only dengan is_reversal = TRUE dan ledger_role = 'REVERSAL'.
        - Jika transaksi berupa TRANSFER berbiaya admin, membalik transaksi PRIMARY dan baris ADMIN_FEE secara atomik.
        """
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # 1. Kunci dan baca transaksi target
                cur.execute("""
                    SELECT id, user_id, type, amount, source_account_id, destination_account_id,
                           category_id, description, transaction_date, ledger_role, is_reversal,
                           parent_transaction_id, reverses_transaction_id
                    FROM transactions
                    WHERE id = %s AND user_id = %s
                    FOR UPDATE
                """, (transaction_id, user_id))
                target_tx = cur.fetchone()

                if not target_tx:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaksi tidak ditemukan.")

                if target_tx["is_reversal"]:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Transaksi jurnal pembalik tidak dapat dibalik kembali.")

                # 2. Cek apakah transaksi ini sudah pernah dibalik
                cur.execute("SELECT id FROM transactions WHERE user_id = %s AND reverses_transaction_id = %s", (user_id, transaction_id))
                if cur.fetchone():
                    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Transaksi ini sudah pernah dibalik sebelumnya.")

                # 3. Cari baris anak (admin fee) jika ada
                admin_fee_tx = None
                if target_tx["ledger_role"] == "PRIMARY":
                    cur.execute("""
                        SELECT id, user_id, type, amount, source_account_id, destination_account_id,
                               category_id, description, transaction_date, ledger_role, is_reversal
                        FROM transactions
                        WHERE parent_transaction_id = %s AND user_id = %s AND ledger_role = 'ADMIN_FEE'
                        FOR UPDATE
                    """, (transaction_id, user_id))
                    admin_fee_tx = cur.fetchone()

                # 4. Insert Jurnal Pembalik untuk Transaksi Utama
                rev_desc = f"[PEMBALIK] {target_tx['description'] or ''} (Alasan: {reason})".strip()
                cur.execute("""
                    INSERT INTO transactions (
                        user_id, draft_id, ledger_role, reverses_transaction_id, type, amount,
                        source_account_id, destination_account_id, category_id, description,
                        transaction_date, is_reversal
                    ) VALUES (
                        %s, NULL, 'REVERSAL', %s, %s, %s,
                        %s, %s, %s, %s,
                        %s, TRUE
                    )
                """, (
                    user_id, target_tx["id"], target_tx["type"], target_tx["amount"],
                    target_tx["source_account_id"], target_tx["destination_account_id"], target_tx["category_id"],
                    rev_desc, target_tx["transaction_date"]
                ))
                primary_rev_id = cur.lastrowid

                # 5. Insert Jurnal Pembalik untuk Biaya Admin jika ada (TRANSFER majemuk)
                admin_rev_id = None
                if admin_fee_tx:
                    fee_rev_desc = f"[PEMBALIK BIAYA ADMIN] {admin_fee_tx['description'] or ''}".strip()
                    cur.execute("""
                        INSERT INTO transactions (
                            user_id, draft_id, ledger_role, reverses_transaction_id, type, amount,
                            source_account_id, destination_account_id, category_id, description,
                            transaction_date, is_reversal
                        ) VALUES (
                            %s, NULL, 'REVERSAL', %s, %s, %s,
                            %s, %s, %s, %s,
                            %s, TRUE
                        )
                    """, (
                        user_id, admin_fee_tx["id"], admin_fee_tx["type"], admin_fee_tx["amount"],
                        admin_fee_tx["source_account_id"], admin_fee_tx["destination_account_id"], admin_fee_tx["category_id"],
                        fee_rev_desc, admin_fee_tx["transaction_date"]
                    ))
                    admin_rev_id = cur.lastrowid

                # 6. Audit Log
                cur.execute("""
                    INSERT INTO system_audit_logs (user_id, event_type, details)
                    VALUES (%s, 'REVERSAL_CREATED', %s)
                """, (user_id, f"Reversal dibuat untuk Tx ID: {transaction_id}. Alasan: {reason}"))

                conn.commit()

        logger.info("Transaksi ID %s berhasil dibalik oleh User ID %s", transaction_id, user_id)
        return {
            "success": True,
            "message": "Jurnal pembalik berhasil diterbitkan.",
            "original_transaction_id": transaction_id,
            "reversal_primary_id": primary_rev_id,
            "reversal_admin_fee_id": admin_rev_id
        }
