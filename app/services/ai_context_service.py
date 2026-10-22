#!/usr/bin/env python3
"""
app/services/ai_context_service.py

Layanan Penyedia Konteks Keuangan Menyeluruh (Full Financial Context Engine):
Menarik seluruh data historis dan real-time dari database pengguna:
1. Rekening & Total Kekayaan Bersih (Net Worth)
2. Ringkasan Arus Kas Seumur Hidup (Lifetime Cashflow)
3. Tren Arus Kas Bulanan (6-12 bulan terakhir)
4. Distribusi Pengeluaran & Pemasukan per Kategori
5. Riwayat 100 Transaksi Terakhir (Tanggal, Nominal, Kategori, Rekening, Deskripsi)
6. Status Anggaran Bulanan & Limit Kategori
7. Target Tabungan & Persentase Pencapaian
8. Analisis Deterministik Lokal untuk Konsultasi Finansial Tanpa Halusinasi
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import date, datetime, timedelta
from decimal import Decimal
from app.core.database import get_db_cursor

logger = logging.getLogger("personal_finance.ai_context_service")


def _format_idr(amt: Any) -> str:
    """Format nominal angka ke representasi Rupiah Indonesia yang rapi."""
    try:
        val = Decimal(str(amt or 0))
        if val % 1 != 0:
            return f"Rp {val:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        return f"Rp {val:,.0f}".replace(",", ".")
    except Exception:
        return "Rp 0"


class AIContextService:
    @staticmethod
    def get_user_financial_context(user_id: int) -> Dict[str, Any]:
        """
        Mengambil dan mengagregasikan seluruh data keuangan pengguna dari database
        untuk disajikan sebagai konteks lengkap bagi AI Financial Copilot.
        """
        today = date.today()
        current_year = today.year
        current_month = today.month

        context: Dict[str, Any] = {
            "user_id": user_id,
            "as_of_date": today.isoformat(),
            "accounts": [],
            "total_net_worth": Decimal("0.00"),
            "lifetime_stats": {
                "total_income": Decimal("0.00"),
                "total_expense": Decimal("0.00"),
                "net_savings": Decimal("0.00"),
                "transaction_count": 0,
            },
            "monthly_history": [],
            "current_month_stats": {
                "year": current_year,
                "month": current_month,
                "income": Decimal("0.00"),
                "expense": Decimal("0.00"),
                "net": Decimal("0.00"),
                "savings_rate_pct": 0.0,
            },
            "category_spending_all_time": [],
            "category_spending_this_month": [],
            "recent_transactions": [],
            "budget_overview": {
                "total_limit": Decimal("0.00"),
                "total_spent": Decimal("0.00"),
                "remaining": Decimal("0.00"),
                "percentage_used": 0.0,
                "category_limits": [],
            },
            "savings_goals": [],
        }

        try:
            with get_db_cursor(commit=False) as cur:
                # -------------------------------------------------------------
                # 1. REKENING & SALDO AKHIR
                # -------------------------------------------------------------
                cur.execute("""
                    SELECT 
                        a.id, a.name, a.type, a.opening_balance,
                        a.opening_balance + COALESCE(SUM(
                            CASE 
                                WHEN t.destination_account_id = a.id AND t.is_reversal = FALSE THEN t.amount
                                WHEN t.destination_account_id = a.id AND t.is_reversal = TRUE THEN -t.amount
                                WHEN t.source_account_id = a.id AND t.is_reversal = FALSE THEN -t.amount
                                WHEN t.source_account_id = a.id AND t.is_reversal = TRUE THEN t.amount
                                ELSE 0
                            END
                        ), 0) AS current_balance
                    FROM accounts a
                    LEFT JOIN transactions t ON (t.source_account_id = a.id OR t.destination_account_id = a.id) AND t.user_id = a.user_id
                    WHERE a.user_id = %s AND a.is_active = TRUE
                    GROUP BY a.id, a.name, a.type, a.opening_balance
                    ORDER BY a.id ASC
                """, (user_id,))
                acc_rows = cur.fetchall() or []
                total_nw = Decimal("0.00")
                for r in acc_rows:
                    bal = Decimal(str(r["current_balance"]))
                    total_nw += bal
                    context["accounts"].append({
                        "id": r["id"],
                        "name": r["name"],
                        "type": r["type"],
                        "balance": bal,
                        "balance_formatted": _format_idr(bal),
                    })
                context["total_net_worth"] = total_nw

                # -------------------------------------------------------------
                # 2. STATISTIK SEUMUR HIDUP (LIFETIME CASHFLOW)
                # -------------------------------------------------------------
                cur.execute("""
                    SELECT 
                        type,
                        COUNT(*) as tx_count,
                        COALESCE(SUM(CASE WHEN is_reversal = FALSE THEN amount ELSE -amount END), 0) as total_amount
                    FROM transactions
                    WHERE user_id = %s
                    GROUP BY type
                """, (user_id,))
                summary_rows = cur.fetchall() or []
                tot_inc = Decimal("0.00")
                tot_exp = Decimal("0.00")
                tot_cnt = 0
                for r in summary_rows:
                    amt = Decimal(str(r["total_amount"]))
                    cnt = int(r["tx_count"])
                    tot_cnt += cnt
                    if r["type"] == "INCOME":
                        tot_inc += amt
                    elif r["type"] == "EXPENSE":
                        tot_exp += amt
                context["lifetime_stats"]["total_income"] = tot_inc
                context["lifetime_stats"]["total_expense"] = tot_exp
                context["lifetime_stats"]["net_savings"] = tot_inc - tot_exp
                context["lifetime_stats"]["transaction_count"] = tot_cnt

                # -------------------------------------------------------------
                # 3. TREN ARUS KAS BULANAN (12 BULAN TERAKHIR)
                # -------------------------------------------------------------
                cur.execute("""
                    SELECT 
                        YEAR(transaction_date) as yr,
                        MONTH(transaction_date) as mo,
                        type,
                        COALESCE(SUM(CASE WHEN is_reversal = FALSE THEN amount ELSE -amount END), 0) as total_amount,
                        COUNT(*) as count
                    FROM transactions
                    WHERE user_id = %s
                    GROUP BY YEAR(transaction_date), MONTH(transaction_date), type
                    ORDER BY yr DESC, mo DESC
                    LIMIT 36
                """, (user_id,))
                monthly_rows = cur.fetchall() or []
                month_map: Dict[str, Dict[str, Any]] = {}
                for r in monthly_rows:
                    key = f"{r['yr']}-{int(r['mo']):02d}"
                    if key not in month_map:
                        month_map[key] = {
                            "period": key,
                            "year": r["yr"],
                            "month": r["mo"],
                            "income": Decimal("0.00"),
                            "expense": Decimal("0.00"),
                        }
                    amt = Decimal(str(r["total_amount"]))
                    if r["type"] == "INCOME":
                        month_map[key]["income"] += amt
                    elif r["type"] == "EXPENSE":
                        month_map[key]["expense"] += amt

                sorted_months = sorted(month_map.values(), key=lambda m: (m["year"], m["month"]), reverse=True)
                for m in sorted_months:
                    net = m["income"] - m["expense"]
                    rate = float((net / m["income"]) * 100) if m["income"] > 0 else 0.0
                    m["net"] = net
                    m["savings_rate_pct"] = round(rate, 1)
                    context["monthly_history"].append(m)

                # Update current month stats
                cur_key = f"{current_year}-{current_month:02d}"
                if cur_key in month_map:
                    context["current_month_stats"] = month_map[cur_key]

                # -------------------------------------------------------------
                # 4. DISTRIBUSI PENGELUARAN PER KATEGORI (ALL TIME & BULAN INI)
                # -------------------------------------------------------------
                # All time expense categories
                cur.execute("""
                    SELECT 
                        c.name as category_name,
                        COALESCE(SUM(CASE WHEN t.is_reversal = FALSE THEN t.amount ELSE -t.amount END), 0) as total_amount,
                        COUNT(t.id) as tx_count
                    FROM categories c
                    JOIN transactions t ON t.category_id = c.id AND t.user_id = c.user_id
                    WHERE c.user_id = %s AND t.type = 'EXPENSE'
                    GROUP BY c.id, c.name
                    HAVING total_amount > 0
                    ORDER BY total_amount DESC
                """, (user_id,))
                cat_all = cur.fetchall() or []
                for c in cat_all:
                    amt = Decimal(str(c["total_amount"]))
                    pct = float((amt / tot_exp) * 100) if tot_exp > 0 else 0.0
                    context["category_spending_all_time"].append({
                        "category": c["category_name"],
                        "total_spent": amt,
                        "formatted": _format_idr(amt),
                        "percentage": round(pct, 1),
                        "tx_count": int(c["tx_count"]),
                    })

                # This month expense categories
                cur.execute("""
                    SELECT 
                        c.name as category_name,
                        COALESCE(SUM(CASE WHEN t.is_reversal = FALSE THEN t.amount ELSE -t.amount END), 0) as total_amount,
                        COUNT(t.id) as tx_count
                    FROM categories c
                    JOIN transactions t ON t.category_id = c.id AND t.user_id = c.user_id
                    WHERE c.user_id = %s 
                      AND t.type = 'EXPENSE'
                      AND YEAR(t.transaction_date) = %s 
                      AND MONTH(t.transaction_date) = %s
                    GROUP BY c.id, c.name
                    HAVING total_amount > 0
                    ORDER BY total_amount DESC
                """, (user_id, current_year, current_month))
                cat_month = cur.fetchall() or []
                cur_exp = context["current_month_stats"]["expense"]
                for c in cat_month:
                    amt = Decimal(str(c["total_amount"]))
                    pct = float((amt / cur_exp) * 100) if cur_exp > 0 else 0.0
                    context["category_spending_this_month"].append({
                        "category": c["category_name"],
                        "total_spent": amt,
                        "formatted": _format_idr(amt),
                        "percentage": round(pct, 1),
                        "tx_count": int(c["tx_count"]),
                    })

                # -------------------------------------------------------------
                # 5. RIWAYAT 100 TRANSAKSI TERAKHIR (MUTASI BUKU BESAR)
                # -------------------------------------------------------------
                cur.execute("""
                    SELECT 
                        t.id, t.transaction_date, t.type, t.amount, t.description, t.is_reversal,
                        COALESCE(c.name, 'Tanpa Kategori') as category_name,
                        sa.name as source_account_name,
                        da.name as destination_account_name
                    FROM transactions t
                    LEFT JOIN categories c ON t.category_id = c.id
                    LEFT JOIN accounts sa ON t.source_account_id = sa.id
                    LEFT JOIN accounts da ON t.destination_account_id = da.id
                    WHERE t.user_id = %s
                    ORDER BY t.transaction_date DESC, t.id DESC
                    LIMIT 100
                """, (user_id,))
                tx_rows = cur.fetchall() or []
                for t in tx_rows:
                    amt = Decimal(str(t["amount"]))
                    t_date = t["transaction_date"]
                    t_date_str = t_date.strftime("%Y-%m-%d") if isinstance(t_date, (date, datetime)) else str(t_date)
                    context["recent_transactions"].append({
                        "id": t["id"],
                        "date": t_date_str,
                        "type": t["type"],
                        "amount": amt,
                        "amount_formatted": _format_idr(amt),
                        "category": t["category_name"],
                        "source_account": t["source_account_name"],
                        "destination_account": t["destination_account_name"],
                        "description": t["description"] or "-",
                        "is_reversal": bool(t["is_reversal"]),
                    })

                # -------------------------------------------------------------
                # 6. ANGGARAN BULAN INI (BUDGET OVERVIEW & CATEGORY LIMITS)
                # -------------------------------------------------------------
                cur.execute("""
                    SELECT limit_amount 
                    FROM monthly_budgets 
                    WHERE user_id = %s AND period_year = %s AND period_month = %s
                """, (user_id, current_year, current_month))
                row_mb = cur.fetchone()
                tot_limit = Decimal(str(row_mb["limit_amount"])) if row_mb else Decimal("0.00")
                tot_spent = context["current_month_stats"]["expense"]
                rem_budget = tot_limit - tot_spent if tot_limit > 0 else Decimal("0.00")
                pct_used = float((tot_spent / tot_limit) * 100) if tot_limit > 0 else 0.0

                context["budget_overview"]["total_limit"] = tot_limit
                context["budget_overview"]["total_spent"] = tot_spent
                context["budget_overview"]["remaining"] = rem_budget
                context["budget_overview"]["percentage_used"] = round(pct_used, 1)

                # Category limits
                cur.execute("""
                    SELECT 
                        cb.category_id, c.name as category_name, cb.limit_amount,
                        COALESCE(SUM(
                            CASE 
                                WHEN t.is_reversal = FALSE THEN t.amount 
                                ELSE -t.amount 
                            END
                        ), 0) as spent
                    FROM category_budgets cb
                    JOIN categories c ON cb.category_id = c.id AND cb.user_id = c.user_id
                    LEFT JOIN transactions t ON t.category_id = c.id 
                                            AND t.user_id = cb.user_id 
                                            AND t.type = 'EXPENSE'
                                            AND YEAR(t.transaction_date) = cb.period_year 
                                            AND MONTH(t.transaction_date) = cb.period_month
                    WHERE cb.user_id = %s AND cb.period_year = %s AND cb.period_month = %s
                    GROUP BY cb.category_id, c.name, cb.limit_amount
                """, (user_id, current_year, current_month))
                cat_budget_rows = cur.fetchall() or []
                for cb in cat_budget_rows:
                    lim = Decimal(str(cb["limit_amount"]))
                    sp = Decimal(str(cb["spent"]))
                    context["budget_overview"]["category_limits"].append({
                        "category_name": cb["category_name"],
                        "limit": lim,
                        "spent": sp,
                        "remaining": lim - sp,
                        "percentage_used": round(float((sp / lim) * 100), 1) if lim > 0 else 0.0,
                    })

                # -------------------------------------------------------------
                # 7. TARGET TABUNGAN (SAVINGS GOALS)
                # -------------------------------------------------------------
                cur.execute("""
                    SELECT 
                        g.id, g.name, g.target_amount, g.target_date, g.status,
                        a.name as account_name,
                        a.opening_balance + COALESCE(SUM(
                            CASE 
                                WHEN t.destination_account_id = a.id AND t.is_reversal = FALSE THEN t.amount
                                WHEN t.destination_account_id = a.id AND t.is_reversal = TRUE THEN -t.amount
                                WHEN t.source_account_id = a.id AND t.is_reversal = FALSE THEN -t.amount
                                WHEN t.source_account_id = a.id AND t.is_reversal = TRUE THEN t.amount
                                ELSE 0
                            END
                        ), 0) AS current_balance
                    FROM savings_goals g
                    JOIN accounts a ON g.dedicated_account_id = a.id AND g.user_id = a.user_id
                    LEFT JOIN transactions t ON (t.source_account_id = a.id OR t.destination_account_id = a.id) AND t.user_id = a.user_id
                    WHERE g.user_id = %s
                    GROUP BY g.id, g.name, g.target_amount, g.target_date, g.status, a.name, a.opening_balance
                    ORDER BY g.status = 'ACTIVE' DESC, g.id ASC
                """, (user_id,))
                goal_rows = cur.fetchall() or []
                for g in goal_rows:
                    tgt = Decimal(str(g["target_amount"]))
                    cur_bal = Decimal(str(g["current_balance"]))
                    progress = float((cur_bal / tgt) * 100) if tgt > 0 else 0.0
                    t_date = g["target_date"]
                    t_date_str = t_date.strftime("%Y-%m-%d") if isinstance(t_date, (date, datetime)) else (str(t_date) if t_date else "-")
                    context["savings_goals"].append({
                        "name": g["name"],
                        "target_amount": tgt,
                        "current_balance": cur_bal,
                        "target_date": t_date_str,
                        "status": g["status"],
                        "dedicated_account": g["account_name"],
                        "progress_pct": round(progress, 1),
                        "is_achieved": cur_bal >= tgt,
                    })

        except Exception as e:
            logger.error("Gagal menarik konteks keuangan lengkap untuk User %s: %s", user_id, e, exc_info=True)

        return context

    @staticmethod
    def format_context_for_prompt(ctx: Dict[str, Any]) -> str:
        """
        Mengubah seluruh konteks database keuangan pengguna menjadi teks terstruktur padat informasi
        untuk diumpankan ke model AI (LLM).
        """
        # 1. Rekening
        acc_lines = []
        for a in ctx.get("accounts", []):
            acc_lines.append(f"- {a['name']} ({a['type']}): {_format_idr(a['balance'])}")
        acc_text = "\n".join(acc_lines) if acc_lines else "- Belum ada rekening aktif."

        # 2. Arus Kas Seumur Hidup
        lf = ctx.get("lifetime_stats", {})
        lf_text = (
            f"- Total Pemasukan: {_format_idr(lf.get('total_income', 0))}\n"
            f"- Total Pengeluaran: {_format_idr(lf.get('total_expense', 0))}\n"
            f"- Selisih Bersih (Tabungan Kumulatif): {_format_idr(lf.get('net_savings', 0))}\n"
            f"- Total Transaksi Tercatat: {lf.get('transaction_count', 0)} transaksi"
        )

        # 3. Bulan Ini
        cm = ctx.get("current_month_stats", {})
        cm_text = (
            f"- Periode: Bulan {cm.get('month', '-')}/{cm.get('year', '-')}\n"
            f"- Pemasukan Bulan Ini: {_format_idr(cm.get('income', 0))}\n"
            f"- Pengeluaran Bulan Ini: {_format_idr(cm.get('expense', 0))}\n"
            f"- Arus Kas Bersih Bulan Ini: {_format_idr(cm.get('net', 0))}\n"
            f"- Rasio Tabungan (Savings Rate): {cm.get('savings_rate_pct', 0)}%"
        )

        # 4. Kategori Pengeluaran Terbesar Bulan Ini
        cat_month_lines = []
        for c in ctx.get("category_spending_this_month", [])[:7]:
            cat_month_lines.append(f"- {c['category']}: {_format_idr(c['total_spent'])} ({c['percentage']}% dari total belanja, {c['tx_count']}x transaksi)")
        cat_month_text = "\n".join(cat_month_lines) if cat_month_lines else "- Belum ada pengeluaran tercatat di bulan ini."

        # 5. Kategori Pengeluaran Terbesar All-Time
        cat_all_lines = []
        for c in ctx.get("category_spending_all_time", [])[:7]:
            cat_all_lines.append(f"- {c['category']}: {_format_idr(c['total_spent'])} ({c['percentage']}%, {c['tx_count']}x)")
        cat_all_text = "\n".join(cat_all_lines) if cat_all_lines else "- Belum ada transaksi pengeluaran."

        # 6. Status Anggaran
        bg = ctx.get("budget_overview", {})
        bg_lines = [
            f"- Batas Anggaran Total: {_format_idr(bg.get('total_limit', 0))}",
            f"- Realisasi Pengeluaran: {_format_idr(bg.get('total_spent', 0))} (Terpakai {bg.get('percentage_used', 0)}%)",
            f"- Sisa Anggaran: {_format_idr(bg.get('remaining', 0))}",
        ]
        if bg.get("category_limits"):
            bg_lines.append("Limit per Kategori:")
            for cl in bg["category_limits"]:
                bg_lines.append(f"  * {cl['category_name']}: Limit {_format_idr(cl['limit'])}, Terpakai {_format_idr(cl['spent'])} ({cl['percentage_used']}%)")
        bg_text = "\n".join(bg_lines)

        # 7. Target Tabungan
        goals_lines = []
        for g in ctx.get("savings_goals", []):
            goals_lines.append(f"- {g['name']}: Target {_format_idr(g['target_amount'])}, Terkumpul {_format_idr(g['current_balance'])} ({g['progress_pct']}%) di {g['dedicated_account']}, Deadline: {g['target_date']}")
        goals_text = "\n".join(goals_lines) if goals_lines else "- Belum ada target tabungan aktif."

        # 8. Riwayat Transaksi Nyata Terbaru (maksimal 40 transaksi terpadat)
        tx_lines = []
        for t in ctx.get("recent_transactions", [])[:40]:
            if t.get("is_reversal"):
                continue
            desc = t["description"] if t["description"] and t["description"] != "-" else t["category"]
            acc = t["source_account"] or t["destination_account"] or "Akun"
            tx_lines.append(f"- [{t['date']}] {t['type']} {_format_idr(t['amount'])} ({t['category']}) '{desc}' via {acc}")
        tx_text = "\n".join(tx_lines) if tx_lines else "- Belum ada transaksi tercatat."

        prompt_context = f"""=== REKAP DATABASE KEUANGAN PENGGUNA TERLENGKAP (REAL-TIME BUKU BESAR) ===
AS OF DATE: {ctx.get('as_of_date')}
TOTAL KEKAYAAN BERSIH (NET WORTH): {_format_idr(ctx.get('total_net_worth', 0))}

[1. REKENING & SALDO AKTUAL]
{acc_text}

[2. ARUS KAS SEUMUR HIDUP]
{lf_text}

[3. KONDISI KEUANGAN BULAN INI]
{cm_text}

[4. KATEGORI PENGELUARAN TERBESAR BULAN INI]
{cat_month_text}

[5. KATEGORI PENGELUARAN TERBESAR SEPANJANG WAKTU]
{cat_all_text}

[6. STATUS ANGGARAN (BUDGET)]
{bg_text}

[7. TARGET TABUNGAN (SAVINGS GOALS)]
{goals_text}

[8. LOG 40 TRANSAKSI TERAKHIR DARI DATABASE]
{tx_text}
=========================================================================="""
        return prompt_context

    @staticmethod
    def generate_rule_based_financial_analysis(ctx: Dict[str, Any], query: str) -> str:
        """
        Mesin Analisis Finansial Deterministik Lokal:
        Menghasilkan jawaban berbasis data nyata dari database ketika LLM offline
        atau untuk memastikan keakuratan angka 100%.
        """
        q_lower = query.lower()
        nw = ctx.get("total_net_worth", Decimal(0))
        cm = ctx.get("current_month_stats", {})
        lf = ctx.get("lifetime_stats", {})
        cat_month = ctx.get("category_spending_this_month", [])
        cat_all = ctx.get("category_spending_all_time", [])
        bg = ctx.get("budget_overview", {})
        goals = ctx.get("savings_goals", [])
        txs = ctx.get("recent_transactions", [])

        # 1. Kategori Paling Boros / Pengeluaran Terbesar
        if any(w in q_lower for w in ("paling boros", "paling besar", "terbesar", "terbanyak", "banyak keluar", "habis di mana", "kategori apa")):
            if cat_month:
                top = cat_month[0]
                lines = [
                    f"Berdasarkan database transaksi Anda bulan ini ({cm.get('month')}/{cm.get('year')}):\n",
                    f"Kategori paling banyak menyerap dana Anda adalah **{top['category']}** dengan total pengeluaran sebesar **{_format_idr(top['total_spent'])}** ({top['percentage']}% dari total belanja bulan ini).\n",
                    "Rincian 3 kategori pengeluaran tertinggi bulan ini:",
                ]
                for idx, c in enumerate(cat_month[:3], 1):
                    lines.append(f"{idx}. **{c['category']}**: {_format_idr(c['total_spent'])} ({c['percentage']}%, {c['tx_count']} transaksi)")
                lines.append(f"\nTotal seluruh pengeluaran Anda bulan ini tercatat sebesar **{_format_idr(cm.get('expense', 0))}**.")
                return "\n".join(lines)
            elif cat_all:
                top = cat_all[0]
                return (
                    f"Berdasarkan seluruh histori transaksi di database Anda, kategori pengeluaran terbesar adalah **{top['category']}** "
                    f"dengan total **{_format_idr(top['total_spent'])}** ({top['percentage']}% dari total pengeluaran seumur hidup)."
                )
            else:
                return "Belum ada transaksi pengeluaran yang tercatat di database akun Anda."

        # 2. Perbandingan Bulan Ini vs Bulan Lalu / Tren
        is_monthly_compare = (
            "bulan lalu" in q_lower or
            "banding" in q_lower or
            "perbandingan" in q_lower or
            "tren" in q_lower or
            any(w in q_lower for w in ("pengeluaran naik", "pengeluaran turun", "kenapa naik", "kenapa turun"))
        )
        if is_monthly_compare:
            history = ctx.get("monthly_history", [])
            if len(history) >= 2:
                cur_m = history[0]
                prev_m = history[1]
                exp_diff = cur_m["expense"] - prev_m["expense"]
                inc_diff = cur_m["income"] - prev_m["income"]
                
                exp_status = "meningkat" if exp_diff > 0 else "menurun"
                inc_status = "meningkat" if inc_diff > 0 else "menurun"

                return (
                    f"Perbandingan Pengeluaran Bulan Ini ({cur_m['period']}) vs Bulan Lalu ({prev_m['period']}):\n\n"
                    f"• Pengeluaran Bulan Ini: **{_format_idr(cur_m['expense'])}**\n"
                    f"• Pengeluaran Bulan Lalu: **{_format_idr(prev_m['expense'])}**\n"
                    f"• Selisih Pengeluaran: **{_format_idr(abs(exp_diff))}** ({exp_status} dibanding bulan lalu)\n\n"
                    f"• Pemasukan Bulan Ini: **{_format_idr(cur_m['income'])}** (Bulan lalu: {_format_idr(prev_m['income'])})\n"
                    f"• Rasio Tabungan Bulan Ini: **{cur_m['savings_rate_pct']}%**\n\n"
                    f"Catatan: Jagalah rasio tabungan tetap positif di atas 20% untuk kesehatan arus kas."
                )

        # 3. Pertanyaan Mengenai Kategori Tertentu (Makanan, Transport, dll.)
        for c in cat_month + cat_all:
            c_name = c["category"].lower()
            if any(term in q_lower for term in (c_name, c_name.split()[0])):
                # Cari transaksi spesifik terkait kategori ini
                related_txs = [t for t in txs if c["category"].lower() in t.get("category", "").lower()][:3]
                tx_examples = "\n".join([f"• [{t['date']}] {_format_idr(t['amount'])} - {t['description']}" for t in related_txs])
                return (
                    f"Data Pengeluaran Kategori **{c['category']}** dari Database:\n\n"
                    f"• Total Pengeluaran: **{_format_idr(c['total_spent'])}**\n"
                    f"• Frekuensi Transaksi: **{c['tx_count']} kali**\n\n"
                    f"Beberapa transaksi terakhir pada kategori ini:\n"
                    f"{tx_examples if tx_examples else '• Belum ada rincian transaksi.'}"
                )

        # 4. Pertanyaan Mengenai Target Tabungan & Budget
        if any(w in q_lower for w in ("tabung", "nabung", "target", "goal", "anggaran", "budget")):
            lines = [
                "Laporan Status Anggaran & Target Tabungan Anda:\n",
                f"• Total Kekayaan Bersih: **{_format_idr(nw)}**",
                f"• Sisa Anggaran Belanja Bulan Ini: **{_format_idr(bg.get('remaining', 0))}** (Batas: {_format_idr(bg.get('total_limit', 0))})\n",
            ]
            if goals:
                lines.append("Progres Target Tabungan:")
                for g in goals:
                    lines.append(f"• **{g['name']}**: Terkumpul **{_format_idr(g['current_balance'])}** dari target **{_format_idr(g['target_amount'])}** ({g['progress_pct']}%) di rekening {g['dedicated_account']}")
            else:
                lines.append("• Belum ada target tabungan yang dibuat. Anda dapat membuatnya di tab Anggaran & Tabungan.")
            return "\n".join(lines)

        # 5. Konsultasi Finansial Menyeluruh / Saran Keuangan Umum
        top_cats = ", ".join([f"**{c['category']}** ({_format_idr(c['total_spent'])})" for c in cat_month[:2]]) if cat_month else "belum ada"
        return (
            f"Evaluasi Keuangan Berdasarkan Database Anda:\n\n"
            f"1. **Kekayaan Bersih Saat Ini:** **{_format_idr(nw)}** yang tersebar di {len(ctx.get('accounts', []))} rekening aktif.\n"
            f"2. **Arus Kas Bulan Ini:** Pemasukan **{_format_idr(cm.get('income', 0))}** dengan pengeluaran **{_format_idr(cm.get('expense', 0))}**, menyisakan arus kas bersih **{_format_idr(cm.get('net', 0))}** (Tingkat tabungan: **{cm.get('savings_rate_pct', 0)}%**).\n"
            f"3. **Alokasi Terbesar:** Pengeluaran terbesar Anda bulan ini berpusat pada {top_cats}.\n"
            f"4. **Rekomendasi:** Pertahankan batas pengeluaran harian dan prioritaskan menyisihkan minimal 20% di awal saat pemasukan masuk langsung ke rekening tabungan."
        )
