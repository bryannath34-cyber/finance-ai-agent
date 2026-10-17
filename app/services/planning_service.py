import json
import logging
from typing import List, Dict, Any, Optional
from datetime import date, datetime, timezone
from decimal import Decimal
from fastapi import HTTPException, status
import oci

from app.core.config import settings
from app.core.database import get_db_connection, get_db_cursor
from app.services.finance_service import FinanceService
from app.services.ai_service import get_genai_client, parse_indonesian_amount

logger = logging.getLogger("personal_finance.planning_service")

class PlanningService:
    # =========================================================================
    # 1. ANGGARAN BULANAN & LIMIT KATEGORI
    # =========================================================================
    @staticmethod
    def get_budget_overview(user_id: int, year: Optional[int] = None, month: Optional[int] = None) -> Dict[str, Any]:
        """
        Mengambil ikhtisar anggaran bulanan dan limit kategori:
        - Membandingkan pagu anggaran dengan realisasi pengeluaran aktual di buku besar.
        - Menghitung persentase serapan, sisa plafon, dan status overbudget.
        """
        today = date.today()
        period_year = year or today.year
        period_month = month or today.month

        with get_db_cursor(commit=False) as cur:
            # 1. Pagu Total Bulanan
            cur.execute("""
                SELECT limit_amount 
                FROM monthly_budgets 
                WHERE user_id = %s AND period_year = %s AND period_month = %s
            """, (user_id, period_year, period_month))
            row_mb = cur.fetchone()
            total_limit = Decimal(str(row_mb["limit_amount"])) if row_mb else Decimal("0.00")

            # 2. Total Pengeluaran Aktual Bulan Ini (Buku Besar)
            cur.execute("""
                SELECT COALESCE(SUM(
                    CASE 
                        WHEN is_reversal = FALSE THEN amount 
                        ELSE -amount 
                    END
                ), 0) as spent
                FROM transactions
                WHERE user_id = %s 
                  AND type = 'EXPENSE'
                  AND YEAR(transaction_date) = %s 
                  AND MONTH(transaction_date) = %s
            """, (user_id, period_year, period_month))
            spent_row = cur.fetchone()
            total_spent = Decimal(str(spent_row["spent"])) if spent_row else Decimal("0.00")

            # 3. Pagu Spesifik per Kategori
            cur.execute("""
                SELECT 
                    cb.category_id, c.name as category_name, cb.limit_amount,
                    COALESCE((
                        SELECT SUM(
                            CASE 
                                WHEN t.is_reversal = FALSE THEN t.amount 
                                ELSE -t.amount 
                            END
                        )
                        FROM transactions t
                        WHERE t.user_id = cb.user_id 
                          AND t.category_id = cb.category_id
                          AND t.type = 'EXPENSE'
                          AND YEAR(t.transaction_date) = cb.period_year
                          AND MONTH(t.transaction_date) = cb.period_month
                    ), 0) as spent_amount
                FROM category_budgets cb
                JOIN categories c ON cb.category_id = c.id
                WHERE cb.user_id = %s AND cb.period_year = %s AND cb.period_month = %s
                ORDER BY cb.limit_amount DESC
            """, (user_id, period_year, period_month))
            cat_rows = cur.fetchall()

        total_rem = total_limit - total_spent if total_limit > 0 else Decimal("0.00")
        total_pct = float((total_spent / total_limit * 100)) if total_limit > 0 else 0.0

        categories = []
        for cr in cat_rows:
            lim = Decimal(str(cr["limit_amount"]))
            sp = Decimal(str(cr["spent_amount"]))
            rem = lim - sp
            pct = float((sp / lim * 100)) if lim > 0 else 0.0
            categories.append({
                "category_id": cr["category_id"],
                "category_name": cr["category_name"],
                "limit_amount": lim,
                "spent_amount": sp,
                "remaining_amount": rem,
                "percentage_spent": round(pct, 1),
                "is_over": sp > lim
            })

        return {
            "period_year": period_year,
            "period_month": period_month,
            "total_limit": total_limit,
            "total_spent": total_spent,
            "total_remaining": total_rem,
            "percentage_spent": round(total_pct, 1),
            "is_over": total_spent > total_limit if total_limit > 0 else False,
            "categories": categories
        }

    @staticmethod
    def set_monthly_budget(user_id: int, year: int, month: int, limit_amount: Decimal) -> Dict[str, Any]:
        """Menetapkan atau memperbarui pagu anggaran total bulanan."""
        with get_db_cursor(commit=True) as cur:
            cur.execute("""
                INSERT INTO monthly_budgets (user_id, period_year, period_month, limit_amount)
                VALUES (%s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE limit_amount = VALUES(limit_amount)
            """, (user_id, year, month, limit_amount))
        return {"success": True, "message": f"Anggaran bulanan {month}/{year} berhasil disimpan sebesar Rp {limit_amount:,.0f}."}

    @staticmethod
    def set_category_budget(user_id: int, category_id: int, year: int, month: int, limit_amount: Decimal) -> Dict[str, Any]:
        """Menetapkan atau memperbarui pagu anggaran per kategori pengeluaran."""
        with get_db_cursor(commit=True) as cur:
            # Pastikan kategori milik pengguna dan bertipe EXPENSE
            cur.execute("SELECT id, name, type FROM categories WHERE id = %s AND user_id = %s", (category_id, user_id))
            cat = cur.fetchone()
            if not cat:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kategori tidak ditemukan.")
            if cat["type"] != "EXPENSE":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Anggaran kategori hanya dapat diterapkan pada kategori pengeluaran (EXPENSE).")

            cur.execute("""
                INSERT INTO category_budgets (user_id, category_id, period_year, period_month, limit_amount)
                VALUES (%s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE limit_amount = VALUES(limit_amount)
            """, (user_id, category_id, year, month, limit_amount))

        return {"success": True, "message": f"Anggaran kategori '{cat['name']}' berhasil disimpan sebesar Rp {limit_amount:,.0f}."}

    # =========================================================================
    # 2. TARGET TABUNGAN (SAVINGS GOALS)
    # =========================================================================
    @staticmethod
    def get_savings_goals(user_id: int) -> List[Dict[str, Any]]:
        """Mengambil daftar target tabungan beserta saldo real-time akun yang didedikasikan."""
        accounts = FinanceService.get_accounts_with_balance(user_id)
        bal_map = {a["id"]: a["current_balance"] for a in accounts}

        with get_db_cursor(commit=False) as cur:
            cur.execute("""
                SELECT g.id, g.dedicated_account_id, a.name as account_name,
                       g.name, g.target_amount, g.target_date, g.status, g.created_at
                FROM savings_goals g
                JOIN accounts a ON g.dedicated_account_id = a.id
                WHERE g.user_id = %s
                ORDER BY g.status ASC, g.id DESC
            """, (user_id,))
            rows = cur.fetchall()

        results = []
        for r in rows:
            tgt = Decimal(str(r["target_amount"]))
            cur_bal = bal_map.get(r["dedicated_account_id"], Decimal("0.00"))
            pct = float((cur_bal / tgt * 100)) if tgt > 0 else 0.0
            results.append({
                "id": r["id"],
                "dedicated_account_id": r["dedicated_account_id"],
                "account_name": r["account_name"],
                "name": r["name"],
                "target_amount": tgt,
                "current_balance": cur_bal,
                "target_date": r["target_date"],
                "status": r["status"],
                "progress_percent": round(max(0.0, min(100.0, pct)), 1),
                "is_achieved": cur_bal >= tgt,
                "created_at": r["created_at"]
            })
        return results

    @staticmethod
    def create_savings_goal(user_id: int, dedicated_account_id: int, name: str, target_amount: Decimal, target_date: Optional[date] = None) -> Dict[str, Any]:
        """Membuat target tabungan baru yang terikat pada rekening/kantong dana tertentu."""
        with get_db_cursor(commit=True) as cur:
            # Validasi kepemilikan rekening
            cur.execute("SELECT id, name FROM accounts WHERE id = %s AND user_id = %s", (dedicated_account_id, user_id))
            acc = cur.fetchone()
            if not acc:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rekening tidak ditemukan.")

            # Cek apakah rekening sudah memiliki target aktif (constraint uq_goals_active_account)
            cur.execute("""
                SELECT id, name FROM savings_goals 
                WHERE dedicated_account_id = %s AND user_id = %s AND status = 'ACTIVE'
            """, (dedicated_account_id, user_id))
            existing = cur.fetchone()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Rekening '{acc['name']}' sudah dipakai untuk target tabungan aktif '{existing['name']}'. Gunakan rekening lain atau selesaikan target tersebut terlebih dahulu."
                )

            cur.execute("""
                INSERT INTO savings_goals (user_id, dedicated_account_id, name, target_amount, target_date, status)
                VALUES (%s, %s, %s, %s, %s, 'ACTIVE')
            """, (user_id, dedicated_account_id, name, target_amount, target_date))
            goal_id = cur.lastrowid

        return {"success": True, "message": f"Target tabungan '{name}' berhasil dibuat.", "goal_id": goal_id}

    @staticmethod
    def update_goal_status(user_id: int, goal_id: int, new_status: str) -> Dict[str, Any]:
        """Memperbarui status target tabungan (ACTIVE / ACHIEVED / CANCELLED)."""
        with get_db_cursor(commit=True) as cur:
            cur.execute("""
                UPDATE savings_goals 
                SET status = %s 
                WHERE id = %s AND user_id = %s
            """, (new_status, goal_id, user_id))
            if cur.rowcount == 0:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target tabungan tidak ditemukan.")

        return {"success": True, "message": f"Status target tabungan berhasil diubah menjadi '{new_status}'."}

    # =========================================================================
    # 3. AI FINANCIAL COPILOT: ANALISIS KEPUTUSAN PEMBELIAN & POLA PENGELUARAN
    # =========================================================================
    @staticmethod
    def analyze_purchase_decision(user_id: int, query: str, target_account_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Fitur Unggulan AI Decision Copilot:
        1. Mengekstrak barang dan estimasi harga dari kalimat pengguna.
        2. Mengambil snapshot finansial real-time (saldo, sisa pagu anggaran, target tabungan).
        3. Menghitung dampak matematis deterministik (apakah saldo minus, anggaran jebol).
        4. OCI GenAI (Cohere Command A Osaka) menghasilkan analisis objektif dan rekomendasi bijak.
        5. Menyimpan ke purchase_scenarios untuk jejak audit pertimbangan.
        """
        accounts = FinanceService.get_accounts_with_balance(user_id)
        budget_overview = PlanningService.get_budget_overview(user_id)
        goals = PlanningService.get_savings_goals(user_id)

        # 1. Ekstraksi Item & Nominal Cepat
        cost = parse_indonesian_amount(query) or Decimal("0.00")
        item_name = "Barang Rencana Pembelian"

        # Coba minta OCI GenAI mengekstrak entitas pertanyaan pembelian jika nominal belum dapat
        client = get_genai_client()
        extraction_prompt = f"""Kamu adalah parser entitas pembelian.
Diberikan kalimat pengguna: "{query}"
Ekstrak dalam JSON format berikut:
{{
  "item_name": "<nama barang atau jasa yang ingin dibeli>",
  "estimated_cost": <angka rupiah tanpa simbol, integer>
}}
Hanya balas dengan JSON."""

        if client and settings.OCI_COMPARTMENT_OCID:
            try:
                chat_models = oci.generative_ai_inference.models
                chat_req = chat_models.CohereChatRequest(
                    api_format=chat_models.BaseChatRequest.API_FORMAT_COHERE,
                    message=extraction_prompt,
                    max_tokens=200,
                    temperature=0.1
                )
                chat_details = chat_models.ChatDetails(
                    compartment_id=settings.OCI_COMPARTMENT_OCID,
                    serving_mode=chat_models.OnDemandServingMode(model_id=settings.OCI_GENAI_MODEL_ID),
                    chat_request=chat_req
                )
                res = client.chat(chat_details)
                txt = res.data.chat_response.text.strip()
                cleaned = txt.replace("```json", "").replace("```", "").strip()
                parsed = json.loads(cleaned)
                if parsed.get("item_name"):
                    item_name = parsed["item_name"]
                if parsed.get("estimated_cost") and cost == 0:
                    cost = Decimal(str(parsed["estimated_cost"]))
            except Exception as e:
                logger.warning("Gagal ekstraksi cepat AI: %s", e)

        if cost <= 0:
            cost = Decimal("500000") # Fallback jika nominal tidak terdeteksi

        # 2. Tentukan Rekening Sasaran
        target_acc = None
        if target_account_id:
            target_acc = next((a for a in accounts if a["id"] == target_account_id), None)
        if not target_acc:
            # Cari rekening bank dengan saldo tertinggi
            bank_accs = [a for a in accounts if a["type"] in ("BANK", "EWALLET", "CASH")]
            bank_accs.sort(key=lambda x: x["current_balance"], reverse=True)
            target_acc = bank_accs[0] if bank_accs else accounts[0] if accounts else None

        acc_name = target_acc["name"] if target_acc else "Rekening Utama"
        acc_bal = target_acc["current_balance"] if target_acc else Decimal("0.00")
        bal_after = acc_bal - cost

        tot_limit = budget_overview["total_limit"]
        tot_spent = budget_overview["total_spent"]
        rem_budget = budget_overview["total_remaining"]
        budget_after = rem_budget - cost

        # 3. Penentuan Vonis Deterministik
        if bal_after < 0:
            verdict = "BERISIKO"
            verdict_badge = "🔴 Sangat Berisiko (Saldo Kurang)"
        elif tot_limit > 0 and budget_after < 0:
            verdict = "PERLU_PERTIMBANGAN"
            verdict_badge = "🟡 Perlu Pertimbangan (Melebihi Anggaran)"
        else:
            verdict = "AMAN"
            verdict_badge = "🟢 Relatif Aman untuk Dibeli"

        # 4. Snapshot Finansial
        snapshot = {
            "rekening_terpilih": acc_name,
            "saldo_saat_ini": float(acc_bal),
            "saldo_setelah_beli": float(bal_after),
            "total_anggaran_bulan_ini": float(tot_limit),
            "total_pengeluaran_saat_ini": float(tot_spent),
            "sisa_anggaran_bulan_ini": float(rem_budget),
            "sisa_anggaran_setelah_beli": float(budget_after),
            "total_kekayaan_bersih": float(sum([a["current_balance"] for a in accounts])),
            "target_tabungan_aktif": len([g for g in goals if g["status"] == "ACTIVE"])
        }

        # 5. Penalaran Analitis OCI GenAI (Cohere Command A Osaka)
        advice_text = ""
        advice_prompt = f"""Kamu adalah Penasihat Keuangan Pribadi (Financial Copilot AI) yang cerdas, empatik, dan rasional.
Pengguna berkonsultasi mengenai rencana pembelian barang:
- Pertanyaan Pengguna: "{query}"
- Barang yang ingin dibeli: {item_name}
- Estimasi Harga: Rp {cost:,.0f}
- Rekening yang dipakai: {acc_name} (Saldo saat ini: Rp {acc_bal:,.0f} -> Sisa setelah beli: Rp {bal_after:,.0f})
- Anggaran Bulanan: Pagu Rp {tot_limit:,.0f}, Sudah Terpakai Rp {tot_spent:,.0f}, Sisa Anggaran: Rp {rem_budget:,.0f} (Jika dibeli sisa: Rp {budget_after:,.0f})
- Vonis Kalkulator Sistem: {verdict}

Berikan analisis keuangan yang objektif dalam 2-3 paragraf berbahasa Indonesia yang bersahabat:
1. Simpulkan apakah pembelian ini aman dilakukan sekarang atau lebih baik ditunda/dicicil.
2. Jelaskan dampaknya secara nyata terhadap arus kas dan plafon anggaran bulanannya.
3. Berikan saran taktis atau alternatif opsi bijak bagi pengguna."""

        if client and settings.OCI_COMPARTMENT_OCID:
            try:
                chat_models = oci.generative_ai_inference.models
                chat_req = chat_models.CohereChatRequest(
                    api_format=chat_models.BaseChatRequest.API_FORMAT_COHERE,
                    message=advice_prompt,
                    max_tokens=600,
                    temperature=0.3
                )
                chat_details = chat_models.ChatDetails(
                    compartment_id=settings.OCI_COMPARTMENT_OCID,
                    serving_mode=chat_models.OnDemandServingMode(model_id=settings.OCI_GENAI_MODEL_ID),
                    chat_request=chat_req
                )
                res = client.chat(chat_details)
                advice_text = res.data.chat_response.text.strip()
            except Exception as e:
                logger.error("Gagal mendapatkan saran AI: %s", e)
                advice_text = f"Pembelian {item_name} sebesar Rp {cost:,.0f} bernilai {verdict}. Sisa saldo rekening Anda akan menjadi Rp {bal_after:,.0f}."

        # 6. Simpan Memori ke purchase_scenarios
        scenario_id = None
        try:
            with get_db_cursor(commit=True) as cur:
                cur.execute("""
                    INSERT INTO purchase_scenarios (
                        user_id, item_name, estimated_cost, target_account_id,
                        ai_summary_advice, financial_snapshot, user_decision
                    ) VALUES (%s, %s, %s, %s, %s, %s, 'CONSIDERING')
                """, (
                    user_id, item_name, cost,
                    target_acc["id"] if target_acc else None,
                    advice_text,
                    json.dumps(snapshot)
                ))
                scenario_id = cur.lastrowid
        except Exception as e:
            logger.error("Gagal menyimpan purchase scenario: %s", e)

        return {
            "item_name": item_name,
            "estimated_cost": cost,
            "verdict": verdict,
            "verdict_badge": verdict_badge,
            "advice": advice_text,
            "financial_snapshot": snapshot,
            "scenario_id": scenario_id
        }

    @staticmethod
    def get_purchase_scenarios(user_id: int, limit: int = 10) -> List[Dict[str, Any]]:
        """Mengambil riwayat memori konsultasi skenario pembelian terdahulu."""
        with get_db_cursor(commit=False) as cur:
            cur.execute("""
                SELECT ps.id, ps.item_name, ps.estimated_cost, a.name as target_account_name,
                       ps.ai_summary_advice, ps.financial_snapshot, ps.user_decision, ps.created_at
                FROM purchase_scenarios ps
                LEFT JOIN accounts a ON ps.target_account_id = a.id
                WHERE ps.user_id = %s
                ORDER BY ps.id DESC
                LIMIT %s
            """, (user_id, limit))
            rows = cur.fetchall()

        results = []
        for r in rows:
            snap = r["financial_snapshot"]
            if isinstance(snap, str):
                try:
                    snap = json.loads(snap)
                except Exception:
                    snap = {}
            results.append({
                "id": r["id"],
                "item_name": r["item_name"],
                "estimated_cost": Decimal(str(r["estimated_cost"])),
                "target_account_name": r["target_account_name"] or "Rekening Umum",
                "ai_summary_advice": r["ai_summary_advice"],
                "financial_snapshot": snap,
                "user_decision": r["user_decision"],
                "created_at": r["created_at"]
            })
        return results

    @staticmethod
    def analyze_spending_patterns(user_id: int) -> Dict[str, Any]:
        """
        Detektif Pola Pengeluaran:
        Membandingkan buku besar bulan ini vs bulan sebelumnya per kategori, lalu AI menjelaskan perubahannya.
        """
        today = date.today()
        c_year = today.year
        c_month = today.month

        # Hitung bulan lalu
        if c_month == 1:
            p_year = c_year - 1
            p_month = 12
        else:
            p_year = c_year
            p_month = c_month - 1

        with get_db_cursor(commit=False) as cur:
            # Ambil per kategori untuk bulan ini dan bulan lalu
            cur.execute("""
                SELECT 
                    c.id as category_id,
                    c.name as category_name,
                    COALESCE(SUM(CASE WHEN YEAR(t.transaction_date) = %s AND MONTH(t.transaction_date) = %s THEN (CASE WHEN t.is_reversal = FALSE THEN t.amount ELSE -t.amount END) ELSE 0 END), 0) as current_spent,
                    COALESCE(SUM(CASE WHEN YEAR(t.transaction_date) = %s AND MONTH(t.transaction_date) = %s THEN (CASE WHEN t.is_reversal = FALSE THEN t.amount ELSE -t.amount END) ELSE 0 END), 0) as prev_spent
                FROM categories c
                LEFT JOIN transactions t ON c.id = t.category_id AND t.user_id = c.user_id AND t.type = 'EXPENSE'
                WHERE c.user_id = %s AND c.type = 'EXPENSE'
                GROUP BY c.id, c.name
                HAVING current_spent > 0 OR prev_spent > 0
                ORDER BY current_spent DESC
            """, (c_year, c_month, p_year, p_month, user_id))
            cat_rows = cur.fetchall()

        c_total = sum([Decimal(str(r["current_spent"])) for r in cat_rows])
        p_total = sum([Decimal(str(r["prev_spent"])) for r in cat_rows])
        diff_tot = c_total - p_total
        pct_tot = float((diff_tot / p_total * 100)) if p_total > 0 else 0.0

        comparisons = []
        for r in cat_rows:
            cs = Decimal(str(r["current_spent"]))
            ps = Decimal(str(r["prev_spent"]))
            df = cs - ps
            pct = float((df / ps * 100)) if ps > 0 else (100.0 if cs > 0 else 0.0)
            comparisons.append({
                "category_name": r["category_name"],
                "current_spent": float(cs),
                "prev_spent": float(ps),
                "diff": float(df),
                "percentage_change": round(pct, 1)
            })

        # Kirim ke AI untuk narasi penjelas
        c_month_str = today.strftime("%B %Y")
        p_month_str = date(p_year, p_month, 1).strftime("%B %Y")
        
        prompt = f"""Kamu adalah analis keuangan pribadi.
Bandingkan pengeluaran bulan {c_month_str} dengan bulan {p_month_str}:
- Total Bulan Ini: Rp {c_total:,.0f}
- Total Bulan Lalu: Rp {p_total:,.0f}
- Selisih: Rp {diff_tot:,.0f} ({pct_tot:+.1f}%)
Rincian Kategori: {json.dumps(comparisons)}

Berikan ringkasan cerdas dalam 2 paragraf: jelaskan kategori mana yang paling melonjak atau hemat, dan berikan evaluasi apakah pengeluaran pengguna terkontrol dengan baik."""

        ai_summary = ""
        client = get_genai_client()
        if client and settings.OCI_COMPARTMENT_OCID:
            try:
                chat_models = oci.generative_ai_inference.models
                chat_req = chat_models.CohereChatRequest(
                    api_format=chat_models.BaseChatRequest.API_FORMAT_COHERE,
                    message=prompt,
                    max_tokens=500,
                    temperature=0.3
                )
                chat_details = chat_models.ChatDetails(
                    compartment_id=settings.OCI_COMPARTMENT_OCID,
                    serving_mode=chat_models.OnDemandServingMode(model_id=settings.OCI_GENAI_MODEL_ID),
                    chat_request=chat_req
                )
                res = client.chat(chat_details)
                ai_summary = res.data.chat_response.text.strip()
            except Exception as e:
                logger.error("Gagal analisa pola AI: %s", e)
                ai_summary = f"Total pengeluaran bulan ini Rp {c_total:,.0f} ({pct_tot:+.1f}% dibanding bulan lalu Rp {p_total:,.0f})."

        return {
            "current_month_str": c_month_str,
            "previous_month_str": p_month_str,
            "current_month_spent": c_total,
            "previous_month_spent": p_total,
            "diff_amount": diff_tot,
            "percentage_change": round(pct_tot, 1),
            "category_comparisons": comparisons,
            "ai_summary": ai_summary or f"Total pengeluaran tercatat Rp {c_total:,.0f}."
        }
