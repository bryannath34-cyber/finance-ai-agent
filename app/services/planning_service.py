import re
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import date, datetime, timezone, timedelta
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

        # 1. Ekstraksi Nominal dan Klasifikasi Niat Pertanyaan
        query_clean = query.strip()
        query_lower = query_clean.lower()

        # Ekstraksi nominal angka jika ada (misal: "350rb", "1,5jt", "500000")
        cost = parse_indonesian_amount(query_clean) or Decimal("0.00")

        # Cek apakah pengguna mengindikasikan pembelian barang/jasa spesifik (bukan sekadar kata umum "belanja")
        purchase_intent = bool(re.search(r'\b(beli|membeli|pembelian|checkout|bayar|order|sewa|borong|biaya|tarif|ongkos|harga)\b', query_lower))

        client = get_genai_client()
        item_name = ""
        is_purchase = False

        if cost > 0 or purchase_intent:
            # Skenario Pembelian Barang / Jasa
            if client and settings.OCI_COMPARTMENT_OCID:
                try:
                    chat_models = oci.generative_ai_inference.models
                    extraction_prompt = f"""Kamu adalah parser entitas pembelian.
Diberikan kalimat pengguna: "{query_clean}"
Ekstrak dalam JSON format berikut:
{{
  "is_purchase": true,
  "item_name": "<nama barang atau jasa yang ingin dibeli>",
  "estimated_cost": <angka rupiah integer tanpa simbol, isi 0 jika tidak ada harga disebutkan>
}}
Hanya balas dengan JSON."""
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
                    if parsed.get("item_name") and parsed["item_name"].lower() not in ("tidak ada", "none", "null", ""):
                        item_name = parsed["item_name"]
                    if parsed.get("estimated_cost") and cost == 0:
                        cost = Decimal(str(parsed["estimated_cost"]))
                    if parsed.get("is_purchase") is False and cost == 0:
                        is_purchase = False
                    else:
                        is_purchase = True
                except Exception as e:
                    logger.warning("Gagal ekstraksi cepat AI: %s", e)
                    is_purchase = (cost > 0)

            if not item_name:
                item_name = "Rencana Pembelian Barang" if is_purchase else "Konsultasi Strategi Finansial"
        else:
            # Skenario Konsultasi Finansial / Perencanaan Tabungan
            is_purchase = False
            item_name = "Konsultasi Alokasi Belanja & Tabungan"
            cost = Decimal("0.00")

        # 2. Tentukan Rekening Sasaran
        target_acc = None
        if target_account_id:
            target_acc = next((a for a in accounts if a["id"] == target_account_id), None)
        if not target_acc:
            # Pilih rekening dengan saldo positif tertinggi, atau rekening pertama
            positive_accs = [a for a in accounts if a["current_balance"] > 0]
            positive_accs.sort(key=lambda x: x["current_balance"], reverse=True)
            target_acc = positive_accs[0] if positive_accs else (accounts[0] if accounts else None)

        acc_name = target_acc["name"] if target_acc else "Rekening Utama"
        acc_bal = target_acc["current_balance"] if target_acc else Decimal("0.00")
        bal_after = acc_bal - cost

        tot_limit = budget_overview["total_limit"]
        tot_spent = budget_overview["total_spent"]
        rem_budget = budget_overview["total_remaining"]
        budget_after = rem_budget - cost

        # 3. Penentuan Vonis Deterministik
        if is_purchase and cost > 0:
            if bal_after < 0:
                verdict = "BERISIKO"
                verdict_badge = "🔴 Sangat Berisiko (Saldo Kurang)"
            elif tot_limit > 0 and budget_after < 0:
                verdict = "PERLU_PERTIMBANGAN"
                verdict_badge = "🟡 Perlu Pertimbangan (Melebihi Anggaran)"
            else:
                verdict = "AMAN"
                verdict_badge = "🟢 Relatif Aman untuk Dibeli"
        else:
            # Mode Konsultasi Finansial Umum
            negative_accs = [a for a in accounts if a["current_balance"] < 0]
            if negative_accs:
                verdict = "PERLU_PERTIMBANGAN"
                verdict_badge = "⚠️ Perlu Penyeimbangan Arus Kas"
            elif tot_limit > 0 and rem_budget < 0:
                verdict = "PERLU_PERTIMBANGAN"
                verdict_badge = "⚠️ Pengeluaran Melebihi Anggaran"
            else:
                verdict = "AMAN"
                verdict_badge = "💡 Panduan Strategi Finansial"

        # 4. Snapshot Finansial Real-Time
        snapshot = {
            "query": query_clean,
            "is_purchase": is_purchase,
            "rekening_terpilih": acc_name,
            "saldo_saat_ini": float(acc_bal),
            "saldo_setelah_beli": float(bal_after),
            "total_anggaran_bulan_ini": float(tot_limit),
            "total_pengeluaran_saat_ini": float(tot_spent),
            "sisa_anggaran_bulan_ini": float(rem_budget),
            "sisa_anggaran_setelah_beli": float(budget_after),
            "total_kekayaan_bersih": float(sum([a["current_balance"] for a in accounts])),
            "target_tabungan_aktif": len([g for g in goals if g.get("status") == "ACTIVE"])
        }

        # Format ringkasan akun dan target untuk AI
        acc_summary_lines = [f"- {a['name']}: Rp {float(a['current_balance']):,.0f}" for a in accounts]
        accounts_summary = "\n".join(acc_summary_lines)

        goals_summary_lines = []
        for g in goals:
            if g.get("status") == "ACTIVE":
                goals_summary_lines.append(f"- {g['name']}: Target Rp {float(g['target_amount']):,.0f} (Terkumpul Rp {float(g.get('current_balance', 0)):,.0f})")
        goals_summary = "\n".join(goals_summary_lines) if goals_summary_lines else "Belum ada target tabungan aktif yang diset."

        # 5. Penalaran Analitis OCI GenAI (Cohere Command A Osaka)
        advice_text = ""
        advisor_mode = "RULES_FALLBACK"
        advisor_notice = "OCI GenAI belum bisa dihubungi; hasil ini memakai perhitungan sistem dan bukan jawaban model AI."
        if is_purchase and cost > 0:
            advice_prompt = f"""Kamu adalah Penasihat Keuangan Pribadi (Financial Copilot AI) yang cerdas, empatik, dan rasional.
Pengguna berkonsultasi mengenai rencana pembelian barang:
- Pertanyaan Pengguna: "{query_clean}"
- Barang yang ingin dibeli: {item_name}
- Estimasi Harga: Rp {cost:,.0f}
- Rekening yang dipakai: {acc_name} (Saldo saat ini: Rp {acc_bal:,.0f} -> Sisa setelah beli: Rp {bal_after:,.0f})
- Anggaran Bulanan: Pagu Rp {tot_limit:,.0f}, Sudah Terpakai Rp {tot_spent:,.0f}, Sisa Anggaran: Rp {rem_budget:,.0f} (Jika dibeli sisa: Rp {budget_after:,.0f})
- Target Tabungan Pengguna:
{goals_summary}
- Vonis Kalkulator Sistem: {verdict}

Berikan analisis keuangan yang objektif dalam 2-3 paragraf berbahasa Indonesia yang bersahabat:
1. Simpulkan apakah pembelian ini aman dilakukan sekarang atau lebih baik ditunda/dicicil.
2. Jelaskan dampaknya secara nyata terhadap arus kas dan plafon anggaran bulanannya.
3. Berikan saran taktis atau alternatif opsi bijak bagi pengguna."""
        else:
            advice_prompt = f"""Kamu adalah Penasihat Keuangan Pribadi (Financial Copilot AI) yang cerdas, solutif, dan profesional.
Pengguna meminta panduan / konsultasi strategi finansial dengan pertanyaan:
"{query_clean}"

Berikut data posisi keuangan riil pengguna saat ini:
- Rekening & Saldo Kas:
{accounts_summary}
- Pagu Anggaran Bulan Ini: Rp {tot_limit:,.0f} | Realisasi Belanja: Rp {tot_spent:,.0f} | Sisa Anggaran: Rp {rem_budget:,.0f}
- Target Tabungan:
{goals_summary}

Instruksi Analisis & Rekomendasi:
1. Jawab pertanyaan pengguna secara LANGSUNG, terstruktur, dan aplikatif. JANGAN mengarang atau mengasumsikan pembelian barang seharga Rp 500.000 karena pengguna sedang berkonsultasi strategi keuangan.
2. Hubungkan analisis Anda dengan kondisi finansial riil pengguna di atas (misal: jika ada rekening bersaldo negatif seperti Kas Tunai, berikan saran cara menormalkannya terlebih dahulu).
3. Berikan pembagian proporsi atau strategi praktis untuk menyeimbangkan alokasi belanja bulanan dengan setoran target tabungan (misal rumus 50/30/20 atau pemanfaatan sisa pagu anggaran).
4. Sampaikan dalam 2-3 paragraf berbahasa Indonesia yang hangat, memotivasi, dan mudah dijalankan."""

        if client and settings.OCI_COMPARTMENT_OCID:
            try:
                chat_models = oci.generative_ai_inference.models
                chat_req = chat_models.CohereChatRequest(
                    api_format=chat_models.BaseChatRequest.API_FORMAT_COHERE,
                    message=advice_prompt,
                    max_tokens=650,
                    temperature=0.3
                )
                chat_details = chat_models.ChatDetails(
                    compartment_id=settings.OCI_COMPARTMENT_OCID,
                    serving_mode=chat_models.OnDemandServingMode(model_id=settings.OCI_GENAI_MODEL_ID),
                    chat_request=chat_req
                )
                res = client.chat(chat_details)
                advice_text = res.data.chat_response.text.strip()
                if advice_text:
                    advisor_mode = "OCI_GENAI"
                    advisor_notice = None
            except Exception as e:
                logger.warning("Gagal mendapatkan saran OCI GenAI (%s)", type(e).__name__)

        if not advice_text:
            if is_purchase and cost > 0:
                advice_text = (
                    f"Perhitungan sistem menilai rencana {item_name} sebesar Rp {cost:,.0f} sebagai {verdict_badge}. "
                    f"Jika diteruskan, saldo rekening terpilih diperkirakan menjadi Rp {bal_after:,.0f} dan sisa anggaran "
                    f"menjadi Rp {budget_after:,.0f}. Periksa kembali kebutuhan pokok dan target tabungan sebelum memutuskan."
                )
            else:
                advice_text = (
                    f"Ringkasan perhitungan: saldo bersih tercatat Rp {snapshot['total_kekayaan_bersih']:,.0f}, "
                    f"dengan sisa anggaran bulan ini Rp {rem_budget:,.0f}. Tinjau transaksi terbaru dan pastikan "
                    "setoran rutin untuk target tabungan tetap sesuai kemampuan arus kas."
                )
            advisor_mode = "RULES_FALLBACK"

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
            "scenario_id": scenario_id,
            "is_purchase": is_purchase,
            "advisor_mode": advisor_mode,
            "advisor_notice": advisor_notice
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
        analysis_mode = "RULES_FALLBACK"
        analysis_notice = "OCI GenAI belum bisa dihubungi; ringkasan ini dibuat dari perhitungan transaksi."
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
                if ai_summary:
                    analysis_mode = "OCI_GENAI"
                    analysis_notice = None
            except Exception as e:
                logger.warning("Gagal analisa pola dengan OCI GenAI (%s)", type(e).__name__)

        if not ai_summary:
            ai_summary = (
                f"Ringkasan perhitungan: pengeluaran bulan ini Rp {c_total:,.0f}, "
                f"berubah {pct_tot:+.1f}% dibanding bulan lalu Rp {p_total:,.0f}. "
                "Tinjau kategori dengan kenaikan terbesar sebelum mengubah anggaran."
            )

        return {
            "current_month_str": c_month_str,
            "previous_month_str": p_month_str,
            "current_month_spent": c_total,
            "previous_month_spent": p_total,
            "diff_amount": diff_tot,
            "percentage_change": round(pct_tot, 1),
            "category_comparisons": comparisons,
            "ai_summary": ai_summary,
            "analysis_mode": analysis_mode,
            "analysis_notice": analysis_notice
        }

    # =========================================================================
    # 4. LAPORAN KEUANGAN & DIAGRAM REALTIME (ANALYTICS)
    # =========================================================================
    @staticmethod
    def get_financial_reports(user_id: int, year: Optional[int] = None, month: Optional[int] = None) -> Dict[str, Any]:
        """
        Menghasilkan analitik laporan keuangan riil dari buku besar transaksi:
        - Arus kas 12 bulan (Jan - Des) untuk diagram batang.
        - Komposisi pengeluaran per kategori bulan terpilih.
        - Riwayat mutasi per bulan dengan tren persentase.
        - Pengeluaran harian 10 hari terakhir untuk sparkline/bar insight.
        - Titik sparkline kekayaan bersih 5 bulan terakhir.
        """
        today = date.today()
        period_year = year or today.year
        period_month = month or today.month

        month_labels = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
        month_names_full = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]

        with get_db_cursor(commit=False) as cur:
            # 1. Arus Kas 12 Bulan (Jan - Des)
            cur.execute("""
                SELECT 
                    MONTH(transaction_date) as mo,
                    type,
                    COALESCE(SUM(CASE WHEN is_reversal = FALSE THEN amount ELSE -amount END), 0) as total_amt,
                    COUNT(*) as tx_count
                FROM transactions
                WHERE user_id = %s 
                  AND YEAR(transaction_date) = %s
                  AND type IN ('INCOME', 'EXPENSE')
                GROUP BY mo, type
            """, (user_id, period_year))
            cashflow_rows = cur.fetchall()

            # 2. Komposisi Pengeluaran per Kategori Bulan Ini
            cur.execute("""
                SELECT 
                    c.name as category_name,
                    COALESCE(SUM(CASE WHEN t.is_reversal = FALSE THEN t.amount ELSE -t.amount END), 0) as spent
                FROM transactions t
                JOIN categories c ON t.category_id = c.id
                WHERE t.user_id = %s 
                  AND t.type = 'EXPENSE'
                  AND YEAR(t.transaction_date) = %s 
                  AND MONTH(t.transaction_date) = %s
                GROUP BY c.id, c.name
                HAVING spent > 0
                ORDER BY spent DESC
            """, (user_id, period_year, period_month))
            cat_rows = cur.fetchall()

            # 3. Pengeluaran Bulan Sebelumnya untuk komparasi delta
            prev_year = period_year if period_month > 1 else period_year - 1
            prev_month = period_month - 1 if period_month > 1 else 12
            cur.execute("""
                SELECT COALESCE(SUM(CASE WHEN is_reversal = FALSE THEN amount ELSE -amount END), 0) as spent
                FROM transactions
                WHERE user_id = %s 
                  AND type = 'EXPENSE'
                  AND YEAR(transaction_date) = %s 
                  AND MONTH(transaction_date) = %s
            """, (user_id, prev_year, prev_month))
            prev_spent_row = cur.fetchone()
            prev_month_expense = Decimal(str(prev_spent_row["spent"])) if prev_spent_row else Decimal("0.00")

            # 4. Pengeluaran Harian 10 Hari Terakhir (untuk Insight Bar Chart)
            cur.execute("""
                SELECT 
                    DATE(transaction_date) as tx_day,
                    COALESCE(SUM(CASE WHEN is_reversal = FALSE THEN amount ELSE -amount END), 0) as spent
                FROM transactions
                WHERE user_id = %s 
                  AND type = 'EXPENSE'
                  AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 9 DAY)
                GROUP BY tx_day
                ORDER BY tx_day ASC
            """, (user_id,))
            daily_rows = {str(r["tx_day"]): Decimal(str(r["spent"])) for r in cur.fetchall()}

            # 5. Agregasi Riwayat Semua Bulan yang Ada Transaksi
            cur.execute("""
                SELECT 
                    YEAR(transaction_date) as yr,
                    MONTH(transaction_date) as mo,
                    type,
                    COALESCE(SUM(CASE WHEN is_reversal = FALSE THEN amount ELSE -amount END), 0) as amt
                FROM transactions
                WHERE user_id = %s AND type IN ('INCOME', 'EXPENSE')
                GROUP BY yr, mo, type
                ORDER BY yr DESC, mo DESC
            """, (user_id,))
            history_rows = cur.fetchall()

        # 6. Saldo Akun / Kekayaan Bersih Saat Ini
        user_accounts = FinanceService.get_accounts_with_balance(user_id)
        current_net_worth = sum([a["current_balance"] for a in user_accounts if a.get("is_active", True)], Decimal("0.00"))

        # Proses data 12 bulan
        monthly_map = {m: {"income": Decimal("0.00"), "expense": Decimal("0.00"), "income_cnt": 0, "expense_cnt": 0} for m in range(1, 13)}
        for r in cashflow_rows:
            m = r["mo"]
            t = r["type"]
            amt = Decimal(str(r["total_amt"]))
            cnt = int(r["tx_count"])
            if t == "INCOME":
                monthly_map[m]["income"] += amt
                monthly_map[m]["income_cnt"] += cnt
            elif t == "EXPENSE":
                monthly_map[m]["expense"] += amt
                monthly_map[m]["expense_cnt"] += cnt

        monthly_cashflow = []
        for m in range(1, 13):
            inc = monthly_map[m]["income"]
            exp = monthly_map[m]["expense"]
            monthly_cashflow.append({
                "year": period_year,
                "month": m,
                "month_label": month_labels[m],
                "income": inc,
                "expense": exp,
                "net_cashflow": inc - exp,
            })

        # Ringkasan Bulan Berjalan
        cur_inc = monthly_map[period_month]["income"]
        cur_exp = monthly_map[period_month]["expense"]
        cur_net = cur_inc - cur_exp
        inc_count = monthly_map[period_month]["income_cnt"]
        exp_count = monthly_map[period_month]["expense_cnt"]
        savings_rate = float(round((cur_net / cur_inc * 100), 1)) if cur_inc > 0 else 0.0

        exp_diff = cur_exp - prev_month_expense
        exp_change_pct = float(round((exp_diff / prev_month_expense * 100), 1)) if prev_month_expense > 0 else (100.0 if cur_exp > 0 else 0.0)

        # Komposisi Kategori
        total_cat_spent = sum([Decimal(str(r["spent"])) for r in cat_rows]) or cur_exp or Decimal("1.00")
        category_composition = []
        for r in cat_rows:
            sp = Decimal(str(r["spent"]))
            pct = float(round((sp / total_cat_spent * 100), 1))
            category_composition.append({
                "category_name": r["category_name"],
                "spent_amount": sp,
                "percentage": pct
            })

        # Riwayat per bulan (history table)
        hist_by_month = {}
        for r in history_rows:
            key = f"{r['yr']}-{r['mo']:02d}"
            if key not in hist_by_month:
                hist_by_month[key] = {"year": r["yr"], "month": r["mo"], "income": Decimal("0.00"), "expense": Decimal("0.00")}
            if r["type"] == "INCOME":
                hist_by_month[key]["income"] += Decimal(str(r["amt"]))
            elif r["type"] == "EXPENSE":
                hist_by_month[key]["expense"] += Decimal(str(r["amt"]))

        cur_key = f"{period_year}-{period_month:02d}"
        if cur_key not in hist_by_month:
            hist_by_month[cur_key] = {"year": period_year, "month": period_month, "income": cur_inc, "expense": cur_exp}

        monthly_history = []
        sorted_keys = sorted(hist_by_month.keys(), reverse=True)
        for i, k in enumerate(sorted_keys):
            item = hist_by_month[k]
            inc = item["income"]
            exp = item["expense"]
            net = inc - exp
            prev_exp = Decimal("0.00")
            if i + 1 < len(sorted_keys):
                prev_exp = hist_by_month[sorted_keys[i + 1]]["expense"]
            chg = float(round(((exp - prev_exp) / prev_exp * 100), 1)) if prev_exp > 0 else 0.0
            p_str = f"{month_names_full[item['month']]} {item['year']}"
            monthly_history.append({
                "period_str": p_str,
                "year": item["year"],
                "month": item["month"],
                "income": inc,
                "expense": exp,
                "net_cashflow": net,
                "expense_change_percent": chg
            })

        # Daily spending 10 hari terakhir
        daily_spending = []
        for i in range(9, -1, -1):
            d = today - timedelta(days=i)
            d_str = d.strftime("%Y-%m-%d")
            spent = daily_rows.get(d_str, Decimal("0.00"))
            daily_spending.append({
                "date_str": d_str,
                "day_label": str(d.day),
                "spent_amount": spent
            })

        # Sparkline 5 bulan terakhir
        sparkline_months = []
        past_points = []
        for i in range(4, -1, -1):
            m_target = period_month - i
            y_target = period_year
            while m_target < 1:
                m_target += 12
                y_target -= 1
            sparkline_months.append(month_labels[m_target])
            t_key = f"{y_target}-{m_target:02d}"
            net_mo = hist_by_month.get(t_key, {}).get("income", Decimal("0.00")) - hist_by_month.get(t_key, {}).get("expense", Decimal("0.00"))
            past_points.append(net_mo)

        accum = current_net_worth
        rev_points = [accum]
        for p in reversed(past_points[1:]):
            accum = max(Decimal("0.00"), accum - p)
            rev_points.append(accum)
        sparkline_points = list(reversed(rev_points))

        return {
            "period_year": period_year,
            "period_month": period_month,
            "current_income": cur_inc,
            "current_expense": cur_exp,
            "current_net": cur_net,
            "savings_rate": savings_rate,
            "income_count": inc_count,
            "expense_count": exp_count,
            "prev_month_expense": prev_month_expense,
            "expense_change_percent": exp_change_pct,
            "monthly_cashflow": monthly_cashflow,
            "category_composition": category_composition,
            "monthly_history": monthly_history,
            "daily_spending": daily_spending,
            "sparkline_points": sparkline_points,
            "sparkline_months": sparkline_months,
        }

