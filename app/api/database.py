import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel
from app.core.database import get_db_cursor
from app.core.security import get_current_user

router = APIRouter(prefix="/database", tags=["MySQL Database Explorer"])
logger = logging.getLogger("personal_finance.database_explorer")

VALID_TABLES = {
    "accounts",
    "app_users",
    "categories",
    "category_budgets",
    "monthly_budgets",
    "purchase_scenarios",
    "savings_goals",
    "system_audit_logs",
    "transaction_drafts",
    "transactions",
    "web_sessions",
}

class QueryRequest(BaseModel):
    query: str

@router.get("/tables")
def get_tables_overview(user: dict = Depends(get_current_user)):
    """Mengembalikan daftar semua tabel dalam database personal_finance beserta jumlah barisnya."""
    tables_info = []
    with get_db_cursor(commit=False) as cur:
        # Ambil semua tabel yang ada di database
        cur.execute("""
            SELECT table_name, engine, data_length, create_time
            FROM information_schema.tables
            WHERE table_schema = DATABASE()
            ORDER BY table_name ASC;
        """)
        raw_tables = cur.fetchall()

        for t in raw_tables:
            name = t["table_name"]
            if name not in VALID_TABLES:
                continue

            # Hitung row count akurat
            try:
                cur.execute(f"SELECT COUNT(*) as total FROM `{name}`")
                total_cnt = cur.fetchone()["total"]
            except Exception:
                total_cnt = 0

            size_kb = round((t["data_length"] or 0) / 1024, 2)
            tables_info.append({
                "table_name": name,
                "row_count": total_cnt,
                "data_size_kb": size_kb,
                "engine": t["engine"] or "InnoDB",
                "create_time": str(t["create_time"] or "")
            })

    return {
        "success": True,
        "database": "personal_finance",
        "total_tables": len(tables_info),
        "tables": tables_info
    }


@router.get("/table/{table_name}")
def get_table_data(
    table_name: str,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    user: dict = Depends(get_current_user)
):
    """Mengembalikan struktur kolom dan isi data baris dari tabel MySQL yang dipilih."""
    if table_name not in VALID_TABLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tabel '{table_name}' tidak diizinkan atau tidak terdaftar dalam skema aplikasi."
        )

    offset = (page - 1) * limit

    with get_db_cursor(commit=False) as cur:
        # 1. Ambil struktur kolom tabel
        cur.execute("""
            SELECT column_name, data_type, is_nullable, column_key, column_default, extra
            FROM information_schema.columns
            WHERE table_schema = DATABASE() AND table_name = %s
            ORDER BY ordinal_position ASC;
        """, (table_name,))
        columns = cur.fetchall()

        # 2. Hitung total baris
        cur.execute(f"SELECT COUNT(*) as total FROM `{table_name}`")
        total_rows = cur.fetchone()["total"]

        # 3. Tentukan primary key atau urutan default
        pk_cols = [c["column_name"] for c in columns if c["column_key"] == "PRI"]
        order_clause = f"ORDER BY `{pk_cols[0]}` DESC" if pk_cols else ""

        # 4. Ambil isi data baris
        cur.execute(f"SELECT * FROM `{table_name}` {order_clause} LIMIT %s OFFSET %s", (limit, offset))
        raw_rows = cur.fetchall()

        # 5. Sanitasi data sensitif (misal: password_hash)
        clean_rows = []
        for r in raw_rows:
            row_dict = {}
            for k, v in r.items():
                if k == "password_hash" and v:
                    row_dict[k] = "$argon2id$... [TERLINDUNGI]"
                elif hasattr(v, "isoformat"):
                    row_dict[k] = v.isoformat()
                elif isinstance(v, bytes):
                    row_dict[k] = f"<bytes {len(v)}B>"
                else:
                    row_dict[k] = v
            clean_rows.append(row_dict)

    return {
        "success": True,
        "table": table_name,
        "columns": columns,
        "rows": clean_rows,
        "total_rows": total_rows,
        "page": page,
        "limit": limit,
        "total_pages": max(1, (total_rows + limit - 1) // limit)
    }


@router.post("/query")
def execute_readonly_query(req: QueryRequest, user: dict = Depends(get_current_user)):
    """Menjalankan kueri SQL baca (SELECT, SHOW, DESCRIBE, EXPLAIN) secara aman dari web."""
    clean_q = req.query.strip().rstrip(";")
    first_word = clean_q.split()[0].upper() if clean_q else ""

    ALLOWED_COMMANDS = {"SELECT", "SHOW", "DESCRIBE", "DESC", "EXPLAIN"}
    if first_word not in ALLOWED_COMMANDS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Hanya kueri baca aman ({', '.join(ALLOWED_COMMANDS)}) yang diperbolehkan di web console."
        )

    # Batasi agar tidak menjalankan mutasi berbahaya
    DANGEROUS = ["DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "TRUNCATE", "RENAME", "GRANT", "REVOKE"]
    for d in DANGEROUS:
        # Cek spasi sebelum dan sesudah keyword
        if f" {d} " in f" {clean_q.upper()} ":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Kueri mengandung kata kunci modifikasi '{d}' yang dilarang pada Web Studio."
            )

    try:
        with get_db_cursor(commit=False) as cur:
            cur.execute(clean_q)
            rows = cur.fetchall() or []
            
            # Format baris
            clean_rows = []
            for r in rows[:100]:  # Batasi 100 baris pertama
                row_dict = {}
                for k, v in r.items():
                    if k == "password_hash" and v:
                        row_dict[k] = "$argon2id$... [TERLINDUNGI]"
                    elif hasattr(v, "isoformat"):
                        row_dict[k] = v.isoformat()
                    else:
                        row_dict[k] = v
                clean_rows.append(row_dict)

            cols = list(clean_rows[0].keys()) if clean_rows else []

            return {
                "success": True,
                "query": clean_q,
                "columns": cols,
                "rows": clean_rows,
                "row_count": len(clean_rows)
            }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Galat sintaks SQL: {str(e)}"
        )
