import re
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo
try:
    import oci
except ImportError:
    oci = None

from app.core.config import settings
from app.services.finance_service import FinanceService
from app.services.transaction_service import TransactionService

logger = logging.getLogger("personal_finance.ai_service")

# Singleton OCI GenAI Client
_genai_client = None
_signer = None

def get_genai_client():
    global _genai_client, _signer
    if oci is None:
        return None
    if _genai_client is None:
        try:
            _signer = oci.auth.signers.InstancePrincipalsSecurityTokenSigner()
            _genai_client = oci.generative_ai_inference.GenerativeAiInferenceClient(
                config={"region": settings.OCI_REGION_GENAI},
                signer=_signer,
                service_endpoint=settings.OCI_GENAI_ENDPOINT,
                timeout=(10.0, 50.0)
            )
            logger.info("OCI GenAI Client terhubung ke %s", settings.OCI_GENAI_ENDPOINT)
        except Exception as e:
            logger.error("Gagal inisialisasi OCI GenAI Client: %s", e)
            _genai_client = None
    return _genai_client

def parse_indonesian_amount(text: str) -> Optional[Decimal]:
    """Helper konversi nominal khas Indonesia & format perbankan (misal: '8,637,518.23', '8.637.518,23', '8.5jt', '50rb', '250k')."""
    if not text:
        return None
    t = text.lower().replace("rp", "").replace("idr", "").strip()

    # 1. Nominal dengan akhiran satuan (misal: 8.5jt, 8,5 jt, 50rb, 250k, 1.2m)
    unit_match = re.search(r"(\d+(?:[.,]\d+)?)\s*(rb|ribu|k|jt|juta|m|miliar|milyar)\b", t)
    if unit_match:
        val_str = unit_match.group(1).replace(",", ".")
        unit = unit_match.group(2)
        try:
            val = Decimal(val_str)
            if unit in ("rb", "ribu", "k"):
                return val * Decimal(1000)
            elif unit in ("jt", "juta"):
                return val * Decimal(1000000)
            elif unit in ("m", "miliar", "milyar"):
                return val * Decimal(1000000000)
        except Exception:
            pass

    # 2. Angka berformat perbankan: 8,637,518.23 atau 8.637.518,23 atau 8,637,518 atau 8.637.518 atau 35000
    # Hapus terlebih dahulu pola tanggal & waktu agar angka tanggal/tahun tidak keliru dianggap nominal uang:
    # Contoh: "tanggal 22", "22 oktober", "22 okt", "tahun 2026", "22/10/2026", "jam 10"
    t_no_dates = re.sub(r"\b(?:tanggal|tgl)\s+\d{1,2}\b", " ", t)
    t_no_dates = re.sub(r"\b\d{1,2}\s+(?:januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|jan|feb|mar|apr|jun|jul|agu|ags|sep|okt|nov|des)\b", " ", t_no_dates)
    t_no_dates = re.sub(r"\b(?:tahun|thn)\s+\d{4}\b", " ", t_no_dates)
    t_no_dates = re.sub(r"\b20\d{2}\b", " ", t_no_dates)
    t_no_dates = re.sub(r"\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b", " ", t_no_dates)
    t_no_dates = re.sub(r"\b(?:jam|pukul)\s+\d{1,2}(?::\d{2})?\b", " ", t_no_dates)

    num_matches = re.finditer(r"(?:\b|\s|^)(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?)(?:\b|\s|$)", t_no_dates)
    candidates = []
    for m in num_matches:
        s = m.group(1).strip()
        if not s:
            continue
        cleaned = ""
        if "." in s and "," in s:
            last_dot = s.rfind(".")
            last_comma = s.rfind(",")
            if last_dot > last_comma:
                # Format US: 8,637,518.23 -> koma adalah ribuan, titik desimal
                cleaned = s.replace(",", "")
            else:
                # Format Indo/EU: 8.637.518,23 -> titik adalah ribuan, koma desimal
                cleaned = s.replace(".", "").replace(",", ".")
        elif "," in s:
            parts = s.split(",")
            if len(parts) > 1 and all(len(p) == 3 for p in parts[1:]):
                cleaned = s.replace(",", "")
            elif len(parts) == 2 and len(parts[1]) <= 2:
                cleaned = s.replace(",", ".")
            else:
                cleaned = s.replace(",", "")
        elif "." in s:
            parts = s.split(".")
            if len(parts) > 1 and all(len(p) == 3 for p in parts[1:]):
                cleaned = s.replace(".", "")
            elif len(parts) == 2 and len(parts[1]) <= 2:
                cleaned = s
            else:
                cleaned = s.replace(".", "")
        else:
            cleaned = s

        try:
            val = Decimal(cleaned)
            if val > 0:
                candidates.append(val)
        except Exception:
            continue

    if candidates:
        return candidates[0]
    return None

class AIService:
    @staticmethod
    def process_command(user_id: int, user_input: str) -> Dict[str, Any]:
        """
        Asisten Finansial AI Omnichannel:
        1. Menjawab pertanyaan saldo, uang, dan laporan pengeluaran (Inquiry)
        2. Memberikan evaluasi pertimbangan kelayakan belanja (Advisory)
        3. Menjelaskan kemampuan asisten dan panduan penggunaan (Capability)
        4. Mengekstrak mutasi multi-transaksi atau pencatatan saldo ke draft (Transaction Drafting)
        """
        raw_text = (user_input or "").strip()
        if not raw_text:
            return {
                "intent": "CAPABILITY",
                "ai_response": "Silakan ketik pertanyaan, kalimat mutasi, atau gunakan suara untuk berbicara dengan Asisten AI.",
                "items_count": 0,
                "drafts": []
            }

        t_lower = raw_text.lower()

        def _idr(amt: Any) -> str:
            try:
                val = Decimal(str(amt or 0))
                if val % 1 != 0:
                    return f"Rp {val:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
                return f"Rp {val:,.0f}".replace(",", ".")
            except Exception:
                return "Rp 0"

        # 1. KEMAMPUAN & PANDUAN PENGGUNAAN (CAPABILITY)
        capability_triggers = (
            "bisa apa", "ngapain aja", "bisa ngapain", "kamu bisa apa", "apa saja fitur",
            "apa fungsimu", "panduan", "bantuan", "help", "menu bantuan", "fitur ai"
        )
        if any(trig in t_lower for trig in capability_triggers):
            ai_msg = (
                "Halo! Saya adalah **Asisten Finansial AI** kamu. Saya siap membantu mengelola keuangan pribadi dengan fitur-fitur berikut:\n\n"
                "1. **Pencatatan Saldo / Uang Masuk:**\n"
                "   Ketik: *'di rekening gua ada 8jt'* atau *'gaji masuk 12jt ke BCA'*\n\n"
                "2. **Pencatatan Pengeluaran & Transfer:**\n"
                "   Ketik: *'beli makan 35rb pake gopay, bayar bensin 50rb bank'* atau *'transfer 100rb dari bank ke e-wallet'*\n\n"
                "3. **Tanya Saldo & Kekayaan Bersih:**\n"
                "   Ketik: *'saldo gua sekarang berapa?'* atau *'uang di rekening ada berapa?'*\n\n"
                "4. **Cek Pengeluaran & Anggaran Bulanan:**\n"
                "   Ketik: *'pengeluaran bulan ini berapa?'* atau *'sisa budget gua berapa?'*\n\n"
                "5. **Konsultasi Rencana Belanja:**\n"
                "   Ketik: *'aman gak beli laptop 8jt?'* atau *'bisa beli sepatu 700rb gak?'*\n\n"
                "Kamu juga dapat menggunakan tombol **Rekam suara** untuk berbicara langsung!"
            )
            return {
                "intent": "CAPABILITY",
                "ai_response": ai_msg,
                "items_count": 0,
                "drafts": []
            }

        # 2. KONSULTASI KELAYAKAN BELANJA & PENASIHAT FINANSIAL (ADVISORY)
        advisory_triggers = (
            "bisa beli", "aman gak", "aman ga", "boleh beli", "layak beli", "saran beli",
            "mampu beli", "pengen beli", "mau beli", "kira kira aman", "konsultasi",
            "penasehat", "penasihat", "advisory", "rekomendasi belanja", "rekomendasi tabungan",
            "apakah aman", "apakah bisa beli", "bisa gak beli", "bisa ga beli"
        )
        if any(adv in t_lower for adv in advisory_triggers):
            try:
                from app.services.planning_service import PlanningService
                adv_res = PlanningService.analyze_purchase_decision(user_id, raw_text)
                badge = adv_res.get("verdict_badge", "💡 Pertimbangan Finansial")
                advice = adv_res.get("advice", "Evaluasi kelayakan anggaran dan saldo akun.")
                cost = Decimal(str(adv_res.get("estimated_cost", 0)))
                snap = adv_res.get("financial_snapshot", {})
                after_bal = Decimal(str(snap.get("saldo_setelah_beli", snap.get("saldo_saat_ini", 0))))
                rem_budget = Decimal(str(snap.get("sisa_anggaran_setelah_beli", snap.get("sisa_anggaran_bulan_ini", 0))))
                is_purchase = adv_res.get("is_purchase", cost > 0)

                if is_purchase and cost > 0:
                    ai_msg = (
                        f"Pertimbangan Finansial: **{badge}**\n\n"
                        f"{advice}\n\n"
                        f"• Estimasi Biaya: **{_idr(cost)}**\n"
                        f"• Saldo Rekening Setelah Beli: **{_idr(after_bal)}**\n"
                        f"• Sisa batas pengeluaran: **{_idr(rem_budget)}**"
                    )
                else:
                    ai_msg = (
                        f"Penasihat Finansial AI: **{badge}**\n\n"
                        f"{advice}\n\n"
                        f"• Total Kekayaan Bersih: **{_idr(Decimal(str(snap.get('total_kekayaan_bersih', 0))))}**\n"
                        f"• Sisa Anggaran Bulan Ini: **{_idr(Decimal(str(snap.get('sisa_anggaran_bulan_ini', 0))))}**"
                    )

                return {
                    "intent": "PURCHASE_ADVISORY",
                    "ai_response": ai_msg,
                    "items_count": 0,
                    "drafts": [],
                    "advisory": adv_res
                }
            except Exception as e:
                logger.warning("Gagal memproses purchase decision via PlanningService: %s", e)

        # 3. KONSULTASI KEUANGAN MENYELURUH BERBASIS DATABASE (FULL FINANCIAL COPILOT)
        consultation_triggers = (
            "paling boros", "paling besar", "terbesar", "terbanyak", "habis di mana",
            "kategori apa", "kenapa", "mengapa", "gimana cara", "bagaimana cara", "saran",
            "rekomendasi", "konsultasi", "evaluasi", "analisa", "analisis", "tips",
            "trik", "pola", "kebiasaan", "bandingkan", "perbandingan", "bulan lalu",
            "tahun lalu", "minggu lalu", "riwayat", "histori", "sering beli",
            "sering jajan", "sering makan", "kondisi keuangan", "kesehatan keuangan",
            "posisi keuangan", "arus kas", "cashflow", "status keuangan",
            "bisa nabung", "cara hemat", "solusi keuangan", "rekap keuangan",
            "uang gua habis buat apa", "uangku habis untuk apa"
        )
        has_action_verb = any(v in t_lower for v in ("beli", "bayar", "transfer", "tf ", " tf", "setor", "simpan", "masuk", "terima", "tarik", "top up", "isi saldo"))
        has_amount_specified = parse_indonesian_amount(raw_text) is not None

        if any(trig in t_lower for trig in consultation_triggers) and not has_action_verb:
            return AIService.consult_financial_copilot(user_id, raw_text)

        # 4. TANYA SALDO & LAPORAN KEUANGAN (FINANCIAL INQUIRY)
        is_question_word = any(q in t_lower for q in ("berapa", "cek", "lihat", "gimana", "status", "kondisi", "posisi", "total saldo", "total uang", "total kekayaan"))
        has_financial_entity = any(f in t_lower for f in ("saldo", "uang", "duit", "dana", "pengeluaran", "anggaran", "budget", "rekening", "kas", "dompet", "bank", "wallet"))

        if (is_question_word and has_financial_entity and not has_action_verb and (not has_amount_specified or "berapa" in t_lower or "cek" in t_lower)):
            # Menanyakan pengeluaran / anggaran / tanggal spesifik
            if any(w in t_lower for w in ("pengeluaran", "keluar", "habis", "anggaran", "budget", "serapan", "boros")):
                try:
                    from app.services.ai_context_service import AIContextService
                    target_date = AIContextService.parse_date_from_text(raw_text)
                    if target_date:
                        ctx = AIContextService.get_user_financial_context(user_id)
                        ai_msg = AIContextService.generate_rule_based_financial_analysis(ctx, raw_text)
                        return {
                            "intent": "FINANCIAL_INQUIRY",
                            "ai_response": ai_msg,
                            "items_count": 0,
                            "drafts": []
                        }

                    from app.services.planning_service import PlanningService
                    overview = PlanningService.get_budget_overview(user_id)
                    total_spent = Decimal(str(overview.get("total_spent", 0)))
                    total_limit = Decimal(str(overview.get("total_limit", 0)))
                    rem = Decimal(str(overview.get("remaining", 0)))
                    pct = overview.get("percentage", 0)

                    ai_msg = (
                        f"Laporan Pengeluaran Bulan Ini:\n\n"
                        f"• Total Pengeluaran Aktual: **{_idr(total_spent)}**\n"
                        f"• Batas Pengeluaran Bulanan: **{_idr(total_limit)}**\n"
                        f"• Sisa Anggaran Tersedia: **{_idr(rem)}** (Serapan: **{pct}%**)\n\n"
                        f"Semua mutasi telah diverifikasi dan tercatat resmi di buku besar."
                    )
                    return {
                        "intent": "FINANCIAL_INQUIRY",
                        "ai_response": ai_msg,
                        "items_count": 0,
                        "drafts": []
                    }
                except Exception as e:
                    logger.warning("Gagal mengambil budget/spending overview untuk query AI: %s", e)

            accounts = FinanceService.get_accounts_with_balance(user_id)
            total_net_worth = sum(Decimal(str(a.get("current_balance", 0))) for a in accounts if a.get("is_active"))

            # Menanyakan saldo rekening tertentu
            is_bank_query = any(w in t_lower for w in ("rekening", "bank", "bca", "mandiri", "bri", "bni", "jago"))
            is_wallet_query = any(w in t_lower for w in ("wallet", "gopay", "ovo", "dana", "shopee"))
            is_cash_query = any(w in t_lower for w in ("kas", "tunai", "cash", "dompet"))

            if is_bank_query:
                target_acc = next((a for a in accounts if a.get("is_active") and a.get("name", "").lower() in t_lower), None)
                if not target_acc or (target_acc.get("type") != "BANK" and "bank" not in target_acc.get("name", "").lower()):
                    target_acc = next((a for a in accounts if a.get("is_active") and (a.get("type") == "BANK" or "bank" in a.get("name", "").lower())), None)
                if target_acc:
                    bal = Decimal(str(target_acc.get("current_balance", 0)))
                    ai_msg = f"Saldo di rekening **{target_acc['name']}** kamu saat ini adalah **{_idr(bal)}**."
                    return {
                        "intent": "FINANCIAL_INQUIRY",
                        "ai_response": ai_msg,
                        "items_count": 0,
                        "drafts": []
                    }

            if is_wallet_query:
                target_acc = next((a for a in accounts if a.get("is_active") and a.get("name", "").lower() in t_lower), None)
                if not target_acc or (target_acc.get("type") != "EWALLET" and "wallet" not in target_acc.get("name", "").lower()):
                    target_acc = next((a for a in accounts if a.get("is_active") and (a.get("type") == "EWALLET" or "wallet" in a.get("name", "").lower())), None)
                if target_acc:
                    bal = Decimal(str(target_acc.get("current_balance", 0)))
                    ai_msg = f"Saldo pada akun **{target_acc['name']}** kamu saat ini adalah **{_idr(bal)}**."
                    return {
                        "intent": "FINANCIAL_INQUIRY",
                        "ai_response": ai_msg,
                        "items_count": 0,
                        "drafts": []
                    }

            if is_cash_query:
                target_acc = next((a for a in accounts if a.get("is_active") and a.get("name", "").lower() in t_lower), None)
                if not target_acc or (target_acc.get("type") != "CASH" and not any(k in target_acc.get("name", "").lower() for k in ("kas", "tunai", "cash", "dompet"))):
                    target_acc = next((a for a in accounts if a.get("is_active") and (a.get("type") == "CASH" or any(k in a.get("name", "").lower() for k in ("kas", "tunai")))), None)
                if target_acc:
                    bal = Decimal(str(target_acc.get("current_balance", 0)))
                    ai_msg = f"Saldo pada **{target_acc['name']}** kamu saat ini adalah **{_idr(bal)}**."
                    return {
                        "intent": "FINANCIAL_INQUIRY",
                        "ai_response": ai_msg,
                        "items_count": 0,
                        "drafts": []
                    }

            # Menanyakan total saldo keseluruhan
            acc_lines = []
            for a in accounts:
                if a.get("is_active"):
                    acc_lines.append(f"• **{a['name']}**: {_idr(Decimal(str(a.get('current_balance', 0))))}")
            acc_details_str = "\n".join(acc_lines) if acc_lines else "• Belum ada rekening aktif."

            ai_msg = (
                f"Total kekayaan bersih kamu saat ini tercatat sebesar **{_idr(total_net_worth)}**.\n\n"
                f"Rincian saldo per rekening:\n"
                f"{acc_details_str}\n\n"
                f"Semua saldo terverifikasi secara real-time dari buku besar resmi."
            )
            return {
                "intent": "FINANCIAL_INQUIRY",
                "ai_response": ai_msg,
                "items_count": 0,
                "drafts": []
            }

        # 4. PENCATATAN TRANSAKSI / SALDO (TRANSACTION DRAFTING)
        parse_res = AIService.parse_finance_text(user_id, raw_text)
        drafts = parse_res.get("drafts", [])
        batch_id = parse_res.get("batch_id")
        items_count = parse_res.get("items_count", len(drafts))

        if items_count == 1:
            d = drafts[0]
            d_type = d.get("type")
            d_amt = Decimal(str(d.get("amount", 0)))
            d_desc = d.get("description") or raw_text
            
            if d_type == "INCOME":
                acc_name = d.get("destination_account_name") or "rekening yang perlu dipilih"
                cat_name = d.get("category_name") or "kategori yang perlu dipilih"
                ai_msg = (
                    f"Siap! Saya telah menyiapkan draft pencatatan saldo sebesar **{_idr(d_amt)}** "
                    f"ke rekening **{acc_name}** (kategori: {cat_name}).\n"
                    f"Silakan periksa detailnya pada tabel draft di bawah sebelum dikonfirmasi ke buku besar."
                )
            elif d_type == "TRANSFER":
                src = d.get("source_account_name") or "rekening sumber yang perlu dipilih"
                dst = d.get("destination_account_name") or "rekening tujuan yang perlu dipilih"
                fee = Decimal(str(d.get("admin_fee", 0)))
                fee_str = f" dengan biaya admin {_idr(fee)}" if fee > 0 else ""
                ai_msg = (
                    f"Baik, draft transfer dana sebesar **{_idr(d_amt)}** dari **{src}** ke **{dst}**{fee_str} "
                    f"telah disiapkan. Silakan tinjau pada tabel draft di bawah."
                )
            else: # EXPENSE
                src = d.get("source_account_name") or "rekening yang perlu dipilih"
                cat_name = d.get("category_name") or "kategori yang perlu dipilih"
                ai_msg = (
                    f"Draft pengeluaran sebesar **{_idr(d_amt)}** untuk **{d_desc}** dari rekening **{src}** "
                    f"(kategori: {cat_name}) telah disiapkan.\n"
                    f"Silakan tinjau dan konfirmasi pada tabel draft di bawah."
                )
        elif items_count > 1:
            ai_msg = (
                f"Saya berhasil mengekstrak **{items_count} draft transaksi** dari kalimat kamu. "
                f"Silakan periksa rincian masing-masing mutasi pada tabel draft di bawah sebelum melakukan konfirmasi serentak."
            )
        else:
            ai_msg = (
                "Saya telah menganalisis kalimat kamu. Silakan periksa tabel draft di bawah atau tuliskan perintah "
                "transaksi seperti *'beli makan 30rb'* atau *'di rekening gua ada 8jt'*."
            )

        return {
            "intent": "TRANSACTION_DRAFT",
            "batch_id": batch_id,
            "items_count": items_count,
            "drafts": drafts,
            "ai_response": ai_msg
        }

    @staticmethod
    def consult_financial_copilot(user_id: int, user_input: str) -> Dict[str, Any]:
        """
        Konsultasi Finansial Menyeluruh Berbasis Database (Full Financial Context AI Copilot):
        1. Menarik seluruh data keuangan dari database: rekening, saldo, histori arus kas seumur hidup,
           tren bulanan, kategori pengeluaran terbesar, transaksi riil, budget, dan tabungan.
        2. Mengirim prompt kaya data ke OCI GenAI (Cohere Command di Osaka).
        3. Menjalankan fallback analitis berbasis database jika OCI GenAI offline / tidak tersedia.
        """
        from app.services.ai_context_service import AIContextService, _format_idr
        ctx = AIContextService.get_user_financial_context(user_id)
        prompt_context = AIContextService.format_context_for_prompt(ctx)

        target_date = AIContextService.parse_date_from_text(user_input)
        date_section = ""
        if target_date:
            date_txs = []
            try:
                date_txs = AIContextService.get_transactions_by_date(user_id, target_date)
            except Exception:
                date_txs = []
            if not date_txs and ctx.get("recent_transactions"):
                target_iso = target_date.strftime("%Y-%m-%d")
                date_txs = [
                    t for t in ctx["recent_transactions"]
                    if t.get("date") == target_iso and not t.get("is_reversal")
                ]
            expense_txs = [t for t in date_txs if t.get("type") in ("EXPENSE", "PENGELUARAN")]
            income_txs = [t for t in date_txs if t.get("type") in ("INCOME", "PEMASUKAN")]
            tot_exp = sum(Decimal(str(t["amount"])) for t in expense_txs)
            tot_inc = sum(Decimal(str(t["amount"])) for t in income_txs)
            fmt_date = f"{target_date.day} {AIContextService.MONTH_NAMES.get(target_date.month, '')} {target_date.year}".strip()

            tx_lines = [f"- {t.get('description', t.get('category'))} ({t.get('category')}): {_format_idr(t['amount'])} [{t.get('type')}]" for t in date_txs]
            tx_str = "\n".join(tx_lines) if tx_lines else "Tidak ada transaksi tercatat."
            date_section = f"""
[DATA MUTASI SPESIFIK TANGGAL YANG DITANYAKAN: {fmt_date}]
• Total Pengeluaran: {_format_idr(tot_exp)} ({len(expense_txs)} transaksi)
• Total Pemasukan: {_format_idr(tot_inc)} ({len(income_txs)} transaksi)
Rincian Mutasi:
{tx_str}
"""

        full_prompt = f"""Kamu adalah Personal Finance AI Copilot & Penasihat Keuangan Pribadi yang cerdas, objektif, empatik, dan berwawasan luas.
Kamu memiliki akses PENUH ke seluruh database keuangan pengguna berikut secara real-time dari buku besar resmi:

{prompt_context}
{date_section}
INSTRUKSI PENTING UNTUK ASISTEN:
1. Jawab pertanyaan pengguna secara akurat berdasarkan angka, kategori, dan transaksi riil dari database di atas.
2. Jika pengguna menanyakan tanggal tertentu, sebutkan total pengeluaran dan rincian transaksi riil pada tanggal tersebut secara spesifik.
3. Berikan saran yang solutif, terukur, dan realistis sesuai kondisi keuangannya.
4. Format jawaban dengan markdown rapi (bullet points, bold untuk angka penting).
5. Jangan berasumsi atau mengarang data transaksi di luar database yang diberikan.

PERTANYAAN PENGGUNA:
"{user_input}"
"""
        client = get_genai_client()
        ai_reply = ""
        if client and settings.OCI_COMPARTMENT_OCID and oci is not None:
            try:
                chat_models = oci.generative_ai_inference.models
                chat_req = chat_models.CohereChatRequest(
                    api_format=chat_models.BaseChatRequest.API_FORMAT_COHERE,
                    message=full_prompt,
                    max_tokens=1000,
                    temperature=0.3
                )
                chat_details = chat_models.ChatDetails(
                    compartment_id=settings.OCI_COMPARTMENT_OCID,
                    serving_mode=chat_models.OnDemandServingMode(model_id=settings.OCI_GENAI_MODEL_ID),
                    chat_request=chat_req
                )
                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                    future = executor.submit(client.chat, chat_details)
                    res = future.result(timeout=40.0)
                ai_reply = res.data.chat_response.text.strip()
            except concurrent.futures.TimeoutError:
                logger.warning("Panggilan OCI GenAI konsultasi timeout (>40 detik). Mengalihkan ke analisis rule-based.")
                ai_reply = ""
            except Exception as e:
                logger.warning("Panggilan OCI GenAI untuk konsultasi gagal: %s", e)
                ai_reply = ""

        if not ai_reply:
            ai_reply = AIContextService.generate_rule_based_financial_analysis(ctx, user_input)

        return {
            "intent": "FINANCIAL_CONSULTATION",
            "ai_response": ai_reply,
            "items_count": 0,
            "drafts": [],
            "financial_context": ctx
        }

    @staticmethod
    def parse_finance_text(user_id: int, user_input: str) -> Dict[str, Any]:
        """
        Mengekstrak teks kalimat bebas menjadi draft multi-transaksi terstruktur:
        1. Mengambil rekening dan kategori sah milik user di DB.
        2. Mengirim prompt terstruktur ke OCI GenAI (Cohere Command A di Osaka).
        3. Memetakan hasil teks AI ke ID database asli milik pengguna (Anti-IDOR).
        4. Menyimpan ke transaction_drafts dengan batch_id unik.
        """
        accounts = FinanceService.get_accounts_with_balance(user_id)
        categories = FinanceService.get_categories(user_id)

        acc_map = {a["name"].lower(): a["id"] for a in accounts if a["is_active"]}
        cat_map = {c["name"].lower(): (c["id"], c["type"]) for c in categories if c["is_active"]}

        acc_names_str = ", ".join([f"'{a['name']}'" for a in accounts if a["is_active"]])
        inc_cats_str = ", ".join([f"'{c['name']}'" for c in categories if c["type"] == "INCOME" and c["is_active"]])
        exp_cats_str = ", ".join([f"'{c['name']}'" for c in categories if c["type"] == "EXPENSE" and c["is_active"]])

        today_str = datetime.now(ZoneInfo("Asia/Jakarta")).date().isoformat()

        prompt = f"""Kamu adalah asisten pencatatan keuangan pribadi berbahasa Indonesia yang sangat teliti dan cerdas.
Tugasmu adalah menganalisis kalimat mutasi keuangan dari pengguna dan mengubahnya menjadi format JSON murni.

INFORMASI PENTING PENGGUNA:
- Tanggal hari ini: {today_str} (Zona Waktu: Asia/Jakarta).
- Daftar Rekening sah: [{acc_names_str}]
- Kategori Pemasukan sah: [{inc_cats_str}]
- Kategori Pengeluaran sah: [{exp_cats_str}]

ATURAN STRUKTUR JSON:
Kembalikan HANYA array JSON [] tanpa teks pengantar, tanpa markdown ```json.
Setiap elemen objek dalam array wajib memiliki properti:
- "type": "INCOME" (pemasukan/saldo masuk/catat uang), "EXPENSE" (pengeluaran/beli/bayar), atau "TRANSFER" (pindah dana antar-rekening).
- "amount": angka nominal float/int murni tanpa pemisah ribuan (misal 50000 untuk 50rb/50k, 1500000 untuk 1,5jt, 8637518.23 untuk '8,637,518.23' atau '8.637.518,23'). JANGAN PERNAH memotong angka ribuan menjadi angka satuan (misal jangan ubah 8,637,518.23 menjadi 8 atau 9)!
- "admin_fee": angka biaya admin (default 0, hanya relevan jika transfer berbiaya admin).
- "source_account_name": nama rekening sumber (wajib ada untuk EXPENSE dan TRANSFER, null untuk INCOME).
- "destination_account_name": nama rekening tujuan (wajib ada untuk INCOME dan TRANSFER, null untuk EXPENSE).
- "category_name": nama kategori (wajib ada untuk INCOME dan EXPENSE, cocokkan dengan kategori sah).
- "description": catatan ringkas mutasi.
- "transaction_date": format YYYY-MM-DD. Jika pengguna menyebutkan tanggal spesifik (misal "tanggal 1 Oktober 2026", "2 Oktober", "kemarin"), sesuaikan tanggalnya ke format ISO YYYY-MM-DD. Jika tidak ada tanggal disebutkan, gunakan {today_str}.
- Abaikan kalimat judul, salam, atau pengantar tanpa nominal (misal: "recap pengeluaran...", "catatan bulan oktober..."). Hanya proses mutasi yang memiliki nominal riil.

ATURAN DETEKSI INTENT BAHASA INDONESIA:
1. PENCATATAN SALDO / SALDO AWAL / SIMPANAN (SANGAT PENTING):
   Jika pengguna menyatakan kepemilikan uang, ada saldo di rekening, atau ada duit (contoh: "di rekening bca gua ada jumlah nya 8,637,518.23", "duit gua di rekening bca ada 8.600.000", "rekening bca gua saat ini ada 8.600.000", "saldo bank ada 5 juta", "uang di kas ada 200rb"):
   - "type": "INCOME" (karena menambah saldo rekening buku besar).
   - "source_account_name": null.
   - "destination_account_name": nama rekening yang disebut (misal: "Bank" untuk BCA/Mandiri/BRI, "Kas Tunai" untuk dompet/tunai, "E-Wallet" untuk GoPay/OVO/Dana).
   - "category_name": pilih kategori "Saldo Awal" (JANGAN PERNAH gunakan "Gaji & Pendapatan" agar tidak merusak laporan gaji!).
   - JANGAN PERNAH mengategorikan pernyataan saldo/ada uang sebagai EXPENSE atau "Makanan & Minuman"!
2. BAHASA SEHARI-HARI & GAUL:
   Pahami kata gaul Indonesia: "gua", "gw", "gue", "duit", "uang", "saat ini ada", "sekarang ada", "ada jumlah", "jumlah nya", "tf", "cair", "ngopi", "beli", "jajan".

CONTOH LENGKAP:
Input: "di rekening bca gua ada jumlah nya 8,637,518.23"
Output:
[
  {{"type": "INCOME", "amount": 8637518.23, "admin_fee": 0, "source_account_name": null, "destination_account_name": "Bank", "category_name": "Saldo Awal", "description": "Saldo rekening BCA", "transaction_date": "{today_str}"}}
]

Input: "duit gua di rekening bca ada 8.600.000"
Output:
[
  {{"type": "INCOME", "amount": 8600000, "admin_fee": 0, "source_account_name": null, "destination_account_name": "Bank", "category_name": "Saldo Awal", "description": "Saldo rekening BCA", "transaction_date": "{today_str}"}}
]

Input: "Beli bensin 50rb pake bank, makan siang 30rb e-wallet, tf 100rb dari bank ke e-wallet admin 1000"
Output:
[
  {{"type": "EXPENSE", "amount": 50000, "admin_fee": 0, "source_account_name": "Bank", "destination_account_name": null, "category_name": "Transportasi", "description": "Beli bensin", "transaction_date": "{today_str}"}},
  {{"type": "EXPENSE", "amount": 30000, "admin_fee": 0, "source_account_name": "E-Wallet", "destination_account_name": null, "category_name": "Makanan & Minuman", "description": "Makan siang", "transaction_date": "{today_str}"}},
  {{"type": "TRANSFER", "amount": 100000, "admin_fee": 1000, "source_account_name": "Bank", "destination_account_name": "E-Wallet", "category_name": null, "description": "Transfer Bank ke E-Wallet", "transaction_date": "{today_str}"}}
]

KALIMAT PENGGUNA YANG HARUS DIPROSES:
<<<USER_INPUT_START>>>
{user_input}
<<<USER_INPUT_END>>>
"""
        raw_reply = ""
        client = get_genai_client()
        parsed_items = []

        if client and settings.OCI_COMPARTMENT_OCID and oci is not None:
            try:
                import concurrent.futures
                chat_models = oci.generative_ai_inference.models
                chat_req = chat_models.CohereChatRequest(
                    api_format=chat_models.BaseChatRequest.API_FORMAT_COHERE,
                    message=prompt,
                    max_tokens=2500,
                    temperature=0.1
                )
                chat_details = chat_models.ChatDetails(
                    compartment_id=settings.OCI_COMPARTMENT_OCID,
                    serving_mode=chat_models.OnDemandServingMode(model_id=settings.OCI_GENAI_MODEL_ID),
                    chat_request=chat_req
                )
                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                    future = executor.submit(client.chat, chat_details)
                    res = future.result(timeout=45.0)
                raw_reply = res.data.chat_response.text.strip()
                logger.info("Respon GenAI OCI diterima (%s karakter)", len(raw_reply))
            except concurrent.futures.TimeoutError:
                logger.warning("Panggilan OCI GenAI timeout (>45 detik). Mengalihkan ke fallback parser.")
                raw_reply = ""
            except Exception as e:
                logger.error("Panggilan OCI GenAI error: %s", e)
                raw_reply = ""

        # Ekstraksi JSON dari teks balasan
        if raw_reply:
            cleaned = raw_reply.replace("```json", "").replace("```", "").strip()
            # Ambil substring array JSON [...]
            start_idx = cleaned.find("[")
            end_idx = cleaned.rfind("]")
            if start_idx != -1 and end_idx != -1:
                json_str = cleaned[start_idx:end_idx + 1]
                try:
                    parsed_items = json.loads(json_str)
                except Exception as e:
                    logger.warning("Gagal mem-parsing JSON dari LLM: %s. Menggunakan fallback parser.", e)

        # Fallback Parser Deterministik jika LLM offline atau output non-JSON
        if not parsed_items:
            logger.info("Menjalankan regex fallback parser untuk: %s", user_input)
            parsed_items = AIService._fallback_regex_parser(user_input, accounts, categories)

        # Pre-check heuristik bahasa Indonesia untuk mendeteksi intent saldo / kepemilikan uang
        user_input_lower = user_input.lower()
        expense_verbs = (
            "beli", "bayar", "belanja", "keluar", "habis", "makan", "minum",
            "ongkir", "bensin", "parkir", "tagihan", "sewa", "pulsa", "listrik",
            "jajan", "ngopi", "pesan", "order"
        )
        has_expense_verb = any(v in user_input_lower for v in expense_verbs)
        balance_keywords = (
            "duit", "uang", "saldo", "dana", "tabungan", "rekening", "ada uang",
            "punya uang", "di rekening", "rekening bca", "rekening bank", "di bca",
            "di bank", "di dompet", "di gopay", "di ovo", "di dana", "isi saldo",
            "jumlah nya", "jumlahnya", "jumlah", "total saldo", "ada jumlah", "ada", "punya"
        )
        is_balance_statement = not has_expense_verb and any(kw in user_input_lower for kw in balance_keywords)

        bank_keywords = ("bank", "bca", "mandiri", "bri", "bni", "cimb", "jago", "rekening", "tabungan", "atm", "debit")
        ew_keywords = ("ewallet", "e-wallet", "wallet", "gopay", "ovo", "dana", "shopeepay", "shopee")
        cash_keywords = ("kas", "tunai", "cash", "dompet")

        bank_acc = next((a for a in accounts if a.get("type") == "BANK" or "bank" in a.get("name", "").lower()), None)
        ewallet_acc = next((a for a in accounts if a.get("type") == "EWALLET" or "wallet" in a.get("name", "").lower()), None)
        cash_acc = next((a for a in accounts if a.get("type") == "CASH" or "kas" in a.get("name", "").lower() or "tunai" in a.get("name", "").lower()), None)
        transfer_match = re.search(r"\b(?:dari|from)\s+(.+?)\s+(?:ke|menuju|to)\s+(.+?)(?:\s+(?:admin|biaya)\b|$)", user_input_lower)

        # Resolusi Nama ke ID Database Sah (Anti-Halusinasi & Anti-IDOR)
        validated_drafts = []
        for item in parsed_items:
            tx_type = str(item.get("type", "EXPENSE")).upper()
            if tx_type not in ("INCOME", "EXPENSE", "TRANSFER"):
                tx_type = "EXPENSE"

            # Koreksi otomatis jika LLM keliru mendeteksi kalimat saldo sebagai EXPENSE
            if is_balance_statement and tx_type == "EXPENSE":
                logger.info("Auto-correcting misclassified EXPENSE to INCOME for balance statement: %s", user_input)
                tx_type = "INCOME"

            amount = Decimal(str(item.get("amount", 0)))
            if amount <= 0:
                continue

            admin_fee = Decimal(str(item.get("admin_fee", 0))) if tx_type == "TRANSFER" else Decimal("0.00")

            src_acc_id = None
            dest_acc_id = None
            cat_id = None

            src_name = (item.get("source_account_name") or "").lower()
            dest_name = (item.get("destination_account_name") or "").lower()
            cat_name = (item.get("category_name") or "").lower()
            src_context = f"{src_name} {transfer_match.group(1) if transfer_match else ''}".strip()
            dest_context = f"{dest_name} {transfer_match.group(2) if transfer_match else ''}".strip()

            def alias_matches(keywords, side_context):
                return any(kw in side_context for kw in keywords)

            # Pencocokan nama akun langsung
            for name, aid in acc_map.items():
                if src_name and (name in src_name or src_name in name):
                    src_acc_id = aid
                if dest_name and (name in dest_name or dest_name in name):
                    dest_acc_id = aid

            # Alias hanya dipetakan ke sisi yang disebut; ini mencegah transfer
            # bank -> e-wallet berakhir dengan rekening yang sama di kedua sisi.
            if bank_acc:
                is_bank_mentioned = any(kw in user_input_lower for kw in bank_keywords)
                if tx_type == "TRANSFER":
                    if alias_matches(bank_keywords, src_context) and not src_acc_id:
                        src_acc_id = bank_acc["id"]
                    if alias_matches(bank_keywords, dest_context) and not dest_acc_id:
                        dest_acc_id = bank_acc["id"]
                elif is_bank_mentioned:
                    if tx_type == "EXPENSE" and not src_acc_id:
                        src_acc_id = bank_acc["id"]
                    if tx_type == "INCOME" and not dest_acc_id:
                        dest_acc_id = bank_acc["id"]

            # Alias E-Wallet dari nama akun LLM ATAU teks pengguna
            if ewallet_acc:
                is_ew_mentioned = any(kw in user_input_lower for kw in ew_keywords)
                if tx_type == "TRANSFER":
                    if alias_matches(ew_keywords, src_context) and not src_acc_id:
                        src_acc_id = ewallet_acc["id"]
                    if alias_matches(ew_keywords, dest_context) and not dest_acc_id:
                        dest_acc_id = ewallet_acc["id"]
                elif is_ew_mentioned:
                    if tx_type == "EXPENSE" and not src_acc_id:
                        src_acc_id = ewallet_acc["id"]
                    if tx_type == "INCOME" and not dest_acc_id:
                        dest_acc_id = ewallet_acc["id"]

            # Alias Cash / Tunai
            if cash_acc:
                is_cash_mentioned = any(kw in user_input_lower for kw in cash_keywords)
                if tx_type == "TRANSFER":
                    if alias_matches(cash_keywords, src_context) and not src_acc_id:
                        src_acc_id = cash_acc["id"]
                    if alias_matches(cash_keywords, dest_context) and not dest_acc_id:
                        dest_acc_id = cash_acc["id"]
                elif is_cash_mentioned:
                    if tx_type == "EXPENSE" and not src_acc_id:
                        src_acc_id = cash_acc["id"]
                    if tx_type == "INCOME" and not dest_acc_id:
                        dest_acc_id = cash_acc["id"]

            if tx_type == "INCOME":
                src_acc_id = None
                if not dest_acc_id and bank_acc and is_bank_mentioned:
                    dest_acc_id = bank_acc["id"]

            # Pencocokan kategori yang sesuai dengan tipe mutasi (INCOME vs EXPENSE)
            if tx_type in ("INCOME", "EXPENSE"):
                for name, (cid, ctype) in cat_map.items():
                    if cat_name and ctype == tx_type and (name in cat_name or cat_name in name):
                        cat_id = cid
                        break

            # Proteksi mutlak jika merupakan pernyataan kepemilikan uang / saldo
            if is_balance_statement:
                tx_type = "INCOME"
                src_acc_id = None
                if not dest_acc_id and bank_acc and is_bank_mentioned:
                    dest_acc_id = bank_acc["id"]
                
                # Gunakan kategori khusus 'Saldo Awal' agar tidak tercampur dengan 'Gaji & Pendapatan'
                saldo_cat = next((c for c in categories if c.get("type") == "INCOME" and "saldo" in c.get("name", "").lower()), None)
                if saldo_cat:
                    cat_id = saldo_cat["id"]
                else:
                    try:
                        from app.core.database import get_db_cursor
                        with get_db_cursor(commit=True) as cur:
                            cur.execute("SELECT id FROM categories WHERE user_id = %s AND name = 'Saldo Awal' AND type = 'INCOME' LIMIT 1", (user_id,))
                            row = cur.fetchone()
                            if row:
                                cat_id = row["id"]
                            else:
                                cur.execute("INSERT INTO categories (user_id, name, type, is_system, is_active) VALUES (%s, 'Saldo Awal', 'INCOME', FALSE, TRUE)", (user_id,))
                                cat_id = cur.lastrowid
                    except Exception as e_cat:
                        logger.warning("Gagal membuat/mengambil kategori Saldo Awal: %s", e_cat)
                        inc_cat = next((c for c in categories if c.get("type") == "INCOME" and c.get("is_active")), None)
                        if inc_cat:
                            cat_id = inc_cat["id"]

            final_desc = item.get("description")
            if not final_desc or final_desc == user_input or is_balance_statement:
                if is_balance_statement:
                    matched_acc = next((a["name"] for a in accounts if a["id"] == (dest_acc_id or src_acc_id)), "Rekening")
                    final_desc = f"Saldo {matched_acc}"
                else:
                    final_desc = user_input[:100]

            validated_drafts.append({
                "type": tx_type,
                "amount": amount,
                "admin_fee": admin_fee,
                "source_account_id": src_acc_id if tx_type in ("EXPENSE", "TRANSFER") else None,
                "destination_account_id": dest_acc_id if tx_type in ("INCOME", "TRANSFER") else None,
                "category_id": cat_id if tx_type in ("INCOME", "EXPENSE") else None,
                "description": final_desc,
                "transaction_date": item.get("transaction_date", today_str)
            })

        if not validated_drafts:
            return {"batch_id": None, "items_count": 0, "drafts": []}

        # Draft harus tersimpan di database agar ID dan batch dapat dikonfirmasi.
        try:
            batch_id = TransactionService.create_batch_drafts(user_id, validated_drafts)
            drafts = TransactionService.get_batch_drafts(user_id, batch_id)
        except Exception as e_draft:
            logger.exception("Gagal menyimpan draft transaksi ke database")
            raise RuntimeError("Draft transaksi gagal disimpan. Coba lagi.") from e_draft

        return {
            "batch_id": batch_id,
            "items_count": len(drafts),
            "drafts": drafts
        }

    @staticmethod
    def _parse_single_clause(text: str, accounts: list, categories: list, default_date_str: str) -> Optional[Dict[str, Any]]:
        """Mengekstrak satu klausa kalimat menjadi satu objek mutasi transaksi."""
        text_lower = text.lower()

        # 1. Deteksi Rekening Cerdas dari Teks
        matched_acc_name = None
        for a in accounts:
            if a.get("is_active") and a.get("name", "").lower() in text_lower:
                matched_acc_name = a["name"]
                break

        # Cek alias Bank (BCA, Mandiri, BRI, BNI, Jago, CIMB, dll)
        if not matched_acc_name:
            bank_acc = next((a for a in accounts if a.get("type") == "BANK" or "bank" in a.get("name", "").lower()), None)
            if bank_acc and any(kw in text_lower for kw in ("bca", "mandiri", "bri", "bni", "cimb", "jago", "bank", "rekening", "tabungan")):
                matched_acc_name = bank_acc["name"]

        # Cek alias E-Wallet (GoPay, OVO, DANA, ShopeePay, dll)
        if not matched_acc_name:
            ewallet_acc = next((a for a in accounts if a.get("type") == "EWALLET" or "wallet" in a.get("name", "").lower()), None)
            if ewallet_acc and any(kw in text_lower for kw in ("gopay", "ovo", "dana", "shopee", "ewallet", "e-wallet", "wallet")):
                matched_acc_name = ewallet_acc["name"]

        # Cek alias Kas/Tunai
        if not matched_acc_name:
            cash_acc = next((a for a in accounts if a.get("type") == "CASH" or "kas" in a.get("name", "").lower() or "tunai" in a.get("name", "").lower()), None)
            if cash_acc and any(kw in text_lower for kw in ("kas", "tunai", "cash", "dompet")):
                matched_acc_name = cash_acc["name"]

        # 2. Cek Nominal
        amt = parse_indonesian_amount(text)
        if amt is None or amt <= 0:
            return None

        # 3. Deteksi Tanggal Klausa
        from app.services.ai_context_service import AIContextService
        parsed_dt = AIContextService.parse_date_from_text(text)
        tx_date_str = parsed_dt.strftime("%Y-%m-%d") if parsed_dt else default_date_str

        # 4. Bersihkan Deskripsi
        desc_clean = text.strip()
        desc_clean = re.sub(r'^(?:dan|terus|lalu|kemudian|serta|juga|pada)\s+', '', desc_clean, flags=re.IGNORECASE).strip()
        final_desc = desc_clean[:100] if desc_clean else text[:100]

        # 5. Klasifikasi Intent / Tipe Mutasi
        is_transfer = any(w in text_lower for w in ["transfer", "tf ", " tf", "pindah dana", "kirim uang"])
        expense_terms = (
            "beli", "bayar", "belanja", "pengeluaran", "makan", "minum", "ongkir",
            "nasgor", "nasi goreng", "bakso", "mie ayam", "mi ayam", "bensin", "parkir",
            "tagihan", "sewa", "pulsa", "listrik", "jajan", "ngopi"
        )
        income_terms = (
            "gaji", "terima", "dapat", "bonus", "pendapatan", "setor", "simpan",
            "isi saldo", "top up", "nabung", "cair", "penjualan", "piutang", "dividen"
        )
        is_expense = any(w in text_lower for w in expense_terms)
        is_balance_stmt = not is_expense and any(phrase in text_lower for phrase in (
            "saldo", "duit", "uang", "di rekening", "rekening di", "punya uang",
            "ada uang", "saat ini ada", "sekarang ada", "jumlah", "tabungan"
        ))
        is_income = not is_expense and (is_balance_stmt or any(w in text_lower for w in income_terms))

        if is_transfer:
            mentioned_accounts = [
                a for a in accounts
                if a.get("is_active") and a.get("name", "").strip().lower() in text_lower
            ]
            source_acc = mentioned_accounts[0]["name"] if mentioned_accounts else matched_acc_name
            dest_acc = mentioned_accounts[1]["name"] if len(mentioned_accounts) > 1 else None
            return {
                "type": "TRANSFER",
                "amount": amt,
                "admin_fee": Decimal("0.00"),
                "source_account_name": source_acc,
                "destination_account_name": dest_acc,
                "category_name": None,
                "description": final_desc,
                "transaction_date": tx_date_str
            }
        elif is_income:
            if is_balance_stmt:
                cat_name = "Saldo Awal"
            else:
                cat_name = "Gaji & Pendapatan"
                inc_cats = [c["name"] for c in categories if c.get("type") == "INCOME" and c.get("is_active")]
                if inc_cats:
                    cat_name = inc_cats[0]

            desc_title = f"Saldo {matched_acc_name}" if is_balance_stmt else final_desc
            return {
                "type": "INCOME",
                "amount": amt,
                "admin_fee": Decimal("0.00"),
                "source_account_name": None,
                "destination_account_name": matched_acc_name,
                "category_name": cat_name,
                "description": desc_title,
                "transaction_date": tx_date_str
            }
        else: # EXPENSE
            cat_name = "Makanan & Minuman"
            if any(w in text_lower for w in ["bensin", "bbm", "pertamax", "pertalite", "tol", "parkir", "ojol", "grab", "gojek", "kereta"]):
                cat_name = "Transportasi"
            elif any(w in text_lower for w in ["listrik", "pln", "air", "pdam", "wifi", "internet", "pulsa", "sewa", "kontrakan"]):
                cat_name = "Tagihan & Utilitas"
            elif any(w in text_lower for w in ["obat", "dokter", "apotek", "rs", "klinik"]):
                cat_name = "Kesehatan"
            elif any(w in text_lower for w in ["nasgor", "nasi goreng", "makan", "minum", "bakso", "mie", "mi ayam", "soto", "kopi", "teh", "roti", "gorengan", "cemilan", "jajanan"]):
                cat_name = "Makanan & Minuman"
            elif any(w in text_lower for w in ["beli", "belanja", "shopee", "tokped", "baju", "sepatu", "flash card", "paylater"]):
                cat_name = "Belanja Kebutuhan"

            exp_cats = [c["name"] for c in categories if c.get("type") == "EXPENSE" and c.get("is_active")]
            if cat_name not in exp_cats and exp_cats:
                cat_name = exp_cats[0]

            return {
                "type": "EXPENSE",
                "amount": amt,
                "admin_fee": Decimal("0.00"),
                "source_account_name": matched_acc_name,
                "destination_account_name": None,
                "category_name": cat_name,
                "description": final_desc,
                "transaction_date": tx_date_str
            }

    @staticmethod
    def _fallback_regex_parser(text: str, accounts: list, categories: list) -> List[Dict[str, Any]]:
        """Parser fallback deterministik cerdas jika koneksi LLM gagal/offline."""
        results = []
        today_str = datetime.now(ZoneInfo("Asia/Jakarta")).date().isoformat()

        # Deteksi apakah teks memuat multi-transaksi (dipisah baris baru, titik koma, koma antar transaksi, atau kata sambung)
        pattern = r"\n+|;\s*|,\s*(?=(?:dan\s+|terus\s+|lalu\s+|pada\s+)?tanggal|\b(?:beli|bayar|tf|transfer)\b)|\b(?:dan|terus|lalu|kemudian)\s+(?=(?:pada\s+)?tanggal|\b(?:beli|bayar|tf|transfer)\b)"
        segments = [s.strip() for s in re.split(pattern, text, flags=re.IGNORECASE) if s.strip()]

        valid_segments = [s for s in segments if parse_indonesian_amount(s) is not None]
        if len(valid_segments) > 1:
            for s in valid_segments:
                parsed = AIService._parse_single_clause(s, accounts, categories, today_str)
                if parsed:
                    results.append(parsed)
            if results:
                return results

        # Fallback single clause
        single_res = AIService._parse_single_clause(text, accounts, categories, today_str)
        if single_res:
            results.append(single_res)
        return results
