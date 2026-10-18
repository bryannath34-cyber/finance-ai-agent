import re
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import date, datetime
from decimal import Decimal
import oci
from app.core.config import settings
from app.services.finance_service import FinanceService
from app.services.transaction_service import TransactionService

logger = logging.getLogger("personal_finance.ai_service")

# Singleton OCI GenAI Client
_genai_client = None
_signer = None

def get_genai_client():
    global _genai_client, _signer
    if _genai_client is None:
        try:
            _signer = oci.auth.signers.InstancePrincipalsSecurityTokenSigner()
            _genai_client = oci.generative_ai_inference.GenerativeAiInferenceClient(
                config={"region": settings.OCI_REGION_GENAI},
                signer=_signer,
                service_endpoint=settings.OCI_GENAI_ENDPOINT
            )
            logger.info("OCI GenAI Client terhubung ke %s", settings.OCI_GENAI_ENDPOINT)
        except Exception as e:
            logger.error("Gagal inisialisasi OCI GenAI Client: %s", e)
            _genai_client = None
    return _genai_client

def parse_indonesian_amount(text: str) -> Optional[Decimal]:
    """Helper regex konversi nominal khas Indonesia (misal: '50rb' -> 50000, '1,5jt' -> 1500000, '250k' -> 250000)."""
    text = text.lower().replace("rp", "").replace(".", "").strip()
    match = re.search(r"(\d+(?:[.,]\d+)?)\s*(rb|ribu|k|jt|juta)?", text)
    if not match:
        return None
    val_str = match.group(1).replace(",", ".")
    unit = match.group(2)
    try:
        val = Decimal(val_str)
        if unit in ("rb", "ribu", "k"):
            val *= Decimal(1000)
        elif unit in ("jt", "juta"):
            val *= Decimal(1000000)
        return val
    except Exception:
        return None

class AIService:
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

        today_str = date.today().strftime("%Y-%m-%d")

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
- "amount": angka nominal positif (misal 50000 untuk 50rb/50k, 1500000 untuk 1,5jt, 8600000 untuk 8.600.000).
- "admin_fee": angka biaya admin (default 0, hanya relevan jika transfer berbiaya admin).
- "source_account_name": nama rekening sumber (wajib ada untuk EXPENSE dan TRANSFER, null untuk INCOME).
- "destination_account_name": nama rekening tujuan (wajib ada untuk INCOME dan TRANSFER, null untuk EXPENSE).
- "category_name": nama kategori (wajib ada untuk INCOME dan EXPENSE, cocokkan dengan kategori sah).
- "description": catatan ringkas mutasi.
- "transaction_date": format YYYY-MM-DD (jika ada kata "kemarin", "tadi pagi", sesuaikan dari tanggal hari ini).

ATURAN DETEKSI INTENT BAHASA INDONESIA:
1. PENCATATAN SALDO / SALDO AWAL / SIMPANAN (SANGAT PENTING):
   Jika pengguna menyatakan kepemilikan uang, ada saldo di rekening, atau ada duit (contoh: "duit gua di rekening bca ada 8.600.000", "rekening bca gua saat ini ada 8.600.000", "saldo bank ada 5 juta", "uang di kas ada 200rb"):
   - "type": "INCOME" (karena menambah saldo rekening buku besar).
   - "source_account_name": null.
   - "destination_account_name": nama rekening yang disebut (misal: "Bank" untuk BCA/Mandiri/BRI, "Kas Tunai" untuk dompet/tunai, "E-Wallet" untuk GoPay/OVO/Dana).
   - "category_name": pilih kategori pemasukan sah (misal "Gaji & Pendapatan").
   - JANGAN PERNAH mengategorikan pernyataan saldo/ada uang sebagai EXPENSE atau "Makanan & Minuman"!
2. BAHASA SEHARI-HARI & GAUL:
   Pahami kata gaul Indonesia: "gua", "gw", "gue", "duit", "uang", "saat ini ada", "sekarang ada", "tf", "cair", "ngopi", "beli", "jajan".

CONTOH LENGKAP:
Input: "duit gua di rekening bca ada 8.600.000"
Output:
[
  {{"type": "INCOME", "amount": 8600000, "admin_fee": 0, "source_account_name": null, "destination_account_name": "Bank", "category_name": "Gaji & Pendapatan", "description": "Saldo rekening BCA", "transaction_date": "{today_str}"}}
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

        if client and settings.OCI_COMPARTMENT_OCID:
            try:
                chat_models = oci.generative_ai_inference.models
                chat_req = chat_models.CohereChatRequest(
                    api_format=chat_models.BaseChatRequest.API_FORMAT_COHERE,
                    message=prompt,
                    max_tokens=1500,
                    temperature=0.1
                )
                chat_details = chat_models.ChatDetails(
                    compartment_id=settings.OCI_COMPARTMENT_OCID,
                    serving_mode=chat_models.OnDemandServingMode(model_id=settings.OCI_GENAI_MODEL_ID),
                    chat_request=chat_req
                )
                res = client.chat(chat_details)
                raw_reply = res.data.chat_response.text.strip()
                logger.info("Respon GenAI OCI diterima (%s karakter)", len(raw_reply))
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
            "di bank", "di dompet", "di gopay", "di ovo", "di dana", "isi saldo"
        )
        is_balance_statement = not has_expense_verb and any(kw in user_input_lower for kw in balance_keywords)

        bank_keywords = ("bank", "bca", "mandiri", "bri", "bni", "cimb", "jago")
        ew_keywords = ("ewallet", "e-wallet", "wallet", "gopay", "ovo", "dana", "shopeepay", "shopee")
        cash_keywords = ("kas", "tunai", "cash", "dompet")

        bank_acc = next((a for a in accounts if a.get("type") == "BANK" or "bank" in a.get("name", "").lower()), None)
        ewallet_acc = next((a for a in accounts if a.get("type") == "EWALLET" or "wallet" in a.get("name", "").lower()), None)
        cash_acc = next((a for a in accounts if a.get("type") == "CASH" or "kas" in a.get("name", "").lower() or "tunai" in a.get("name", "").lower()), None)

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

            # Pencocokan nama akun langsung
            for name, aid in acc_map.items():
                if name in src_name or src_name in name:
                    src_acc_id = aid
                if name in dest_name or dest_name in name:
                    dest_acc_id = aid

            # Alias Bank dari nama akun LLM ATAU teks pengguna
            if bank_acc:
                is_bank_mentioned = any(kw in src_name for kw in bank_keywords) or any(kw in dest_name for kw in bank_keywords) or any(kw in user_input_lower for kw in bank_keywords)
                if is_bank_mentioned:
                    if tx_type in ("EXPENSE", "TRANSFER") and not src_acc_id:
                        src_acc_id = bank_acc["id"]
                    if tx_type in ("INCOME", "TRANSFER") and not dest_acc_id:
                        dest_acc_id = bank_acc["id"]

            # Alias E-Wallet dari nama akun LLM ATAU teks pengguna
            if ewallet_acc:
                is_ew_mentioned = any(kw in src_name for kw in ew_keywords) or any(kw in dest_name for kw in ew_keywords) or any(kw in user_input_lower for kw in ew_keywords)
                if is_ew_mentioned:
                    if tx_type in ("EXPENSE", "TRANSFER") and not src_acc_id:
                        src_acc_id = ewallet_acc["id"]
                    if tx_type in ("INCOME", "TRANSFER") and not dest_acc_id:
                        dest_acc_id = ewallet_acc["id"]

            # Alias Cash / Tunai
            if cash_acc:
                is_cash_mentioned = any(kw in src_name for kw in cash_keywords) or any(kw in dest_name for kw in cash_keywords) or any(kw in user_input_lower for kw in cash_keywords)
                if is_cash_mentioned:
                    if tx_type in ("EXPENSE", "TRANSFER") and not src_acc_id:
                        src_acc_id = cash_acc["id"]
                    if tx_type in ("INCOME", "TRANSFER") and not dest_acc_id:
                        dest_acc_id = cash_acc["id"]

            # Default fallback akun jika tidak terdeteksi sama sekali
            default_acc_id = accounts[0]["id"] if accounts else None
            if tx_type in ("EXPENSE", "TRANSFER") and not src_acc_id:
                src_acc_id = default_acc_id
            if tx_type == "INCOME" and not dest_acc_id:
                dest_acc_id = default_acc_id

            # Pencocokan kategori yang sesuai dengan tipe mutasi (INCOME vs EXPENSE)
            if tx_type in ("INCOME", "EXPENSE"):
                for name, (cid, ctype) in cat_map.items():
                    if ctype == tx_type and (name in cat_name or cat_name in name):
                        cat_id = cid
                        break
                if not cat_id:
                    # Ambil kategori pertama yang sesuai tipe
                    for cid, ctype in cat_map.values():
                        if ctype == tx_type:
                            cat_id = cid
                            break

            final_desc = item.get("description")
            if not final_desc or final_desc == user_input:
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

        # Simpan ke tabel transaction_drafts
        batch_id = TransactionService.create_batch_drafts(user_id, validated_drafts)
        drafts = TransactionService.get_batch_drafts(user_id, batch_id)

        return {
            "batch_id": batch_id,
            "items_count": len(drafts),
            "drafts": drafts
        }

    @staticmethod
    def _fallback_regex_parser(text: str, accounts: list, categories: list) -> List[Dict[str, Any]]:
        """Parser fallback deterministik cerdas jika koneksi LLM gagal/offline."""
        results = []
        today_str = date.today().strftime("%Y-%m-%d")
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
            if bank_acc and any(kw in text_lower for kw in ("bca", "mandiri", "bri", "bni", "cimb", "jago", "bank")):
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

        if not matched_acc_name:
            matched_acc_name = accounts[0]["name"] if accounts else "Kas Tunai"

        # 2. Cek Nominal
        amt = parse_indonesian_amount(text) or Decimal("10000")

        # 3. Klasifikasi Intent / Tipe Mutasi
        is_transfer = any(w in text_lower for w in ["transfer", "tf ", " tf", "pindah dana", "kirim uang"])
        is_income = any(w in text_lower for w in [
            "gaji", "terima", "dapat", "masuk", "bonus", "saldo", "saat ini ada",
            "sekarang ada", "ada uang", "punya uang", "rekening di", "di rekening", "uang di",
            "duit", "uang", "dana", "ada", "punya", "simpan", "setor", "isi saldo",
            "top up", "nabung", "cair", "pendapatan", "piutang", "penjualan", "dividen"
        ])
        is_expense = any(w in text_lower for w in [
            "beli", "bayar", "keluar", "habis", "belanja", "makan", "minum",
            "ongkir", "bensin", "parkir", "tagihan", "sewa", "pulsa", "listrik",
            "jajan", "ngopi"
        ])

        if is_transfer:
            dest_acc = accounts[1]["name"] if len(accounts) > 1 and accounts[1]["name"] != matched_acc_name else (accounts[0]["name"] if accounts[0]["name"] != matched_acc_name else "E-Wallet")
            results.append({
                "type": "TRANSFER",
                "amount": amt,
                "admin_fee": Decimal("0.00"),
                "source_account_name": matched_acc_name,
                "destination_account_name": dest_acc,
                "category_name": None,
                "description": text[:100],
                "transaction_date": today_str
            })
        elif is_income or not is_expense:
            cat_name = "Gaji & Pendapatan"
            inc_cats = [c["name"] for c in categories if c.get("type") == "INCOME" and c.get("is_active")]
            if inc_cats:
                cat_name = inc_cats[0]

            desc = f"Saldo {matched_acc_name}" if any(kw in text_lower for kw in ("duit", "uang", "saldo", "dana", "rekening", "ada", "punya")) and not is_expense else text[:100]

            results.append({
                "type": "INCOME",
                "amount": amt,
                "admin_fee": Decimal("0.00"),
                "source_account_name": None,
                "destination_account_name": matched_acc_name,
                "category_name": cat_name,
                "description": desc,
                "transaction_date": today_str
            })
        else:
            cat_name = "Makanan & Minuman"
            if any(w in text_lower for w in ["bensin", "bbm", "pertamax", "pertalite", "tol", "parkir", "ojol", "grab", "gojek", "kereta"]):
                cat_name = "Transportasi"
            elif any(w in text_lower for w in ["listrik", "pln", "air", "pdam", "wifi", "internet", "pulsa", "sewa", "kontrakan"]):
                cat_name = "Tagihan & Utilitas"
            elif any(w in text_lower for w in ["beli", "belanja", "shopee", "tokped", "baju", "sepatu"]):
                cat_name = "Belanja Kebutuhan"
            elif any(w in text_lower for w in ["obat", "dokter", "apotek", "rs", "klinik"]):
                cat_name = "Kesehatan"

            exp_cats = [c["name"] for c in categories if c.get("type") == "EXPENSE" and c.get("is_active")]
            if cat_name not in exp_cats and exp_cats:
                cat_name = exp_cats[0]

            results.append({
                "type": "EXPENSE",
                "amount": amt,
                "admin_fee": Decimal("0.00"),
                "source_account_name": matched_acc_name,
                "destination_account_name": None,
                "category_name": cat_name,
                "description": text[:100],
                "transaction_date": today_str
            })
        return results
