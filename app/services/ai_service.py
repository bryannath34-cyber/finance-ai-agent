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

        prompt = f"""Kamu adalah asisten pencatatan keuangan pribadi berbahasa Indonesia yang sangat teliti.
Tugasmu adalah menganalisis kalimat mutasi keuangan dari pengguna dan mengubahnya menjadi format JSON murni.

INFORMASI PENTING PENGGUNA:
- Tanggal hari ini: {today_str} (Zona Waktu: Asia/Jakarta).
- Daftar Rekening sah: [{acc_names_str}]
- Kategori Pemasukan sah: [{inc_cats_str}]
- Kategori Pengeluaran sah: [{exp_cats_str}]

ATURAN STRUKTUR JSON:
Kembalikan HANYA array JSON [] tanpa teks pengantar, tanpa markdown ```json.
Setiap elemen objek dalam array wajib memiliki properti:
- "type": "INCOME" (pemasukan), "EXPENSE" (pengeluaran), atau "TRANSFER" (pindah dana antar-rekening).
- "amount": angka nominal positif (misal 50000 untuk 50rb/50k, 1500000 untuk 1,5jt).
- "admin_fee": angka biaya admin (default 0, hanya relevan jika transfer berbiaya admin).
- "source_account_name": nama rekening sumber (wajib ada untuk EXPENSE dan TRANSFER, gunakan yang paling cocok dari daftar rekening sah).
- "destination_account_name": nama rekening tujuan (wajib ada untuk INCOME dan TRANSFER, gunakan yang paling cocok dari daftar rekening sah).
- "category_name": nama kategori (wajib ada untuk INCOME dan EXPENSE, cocokkan dengan kategori sah).
- "description": catatan ringkas mutasi.
- "transaction_date": format YYYY-MM-DD (jika ada kata "kemarin", "tadi pagi", sesuaikan dari tanggal hari ini).

CONTOH KALIMAT:
"Beli bensin 50rb pake bca, makan siang 30rb e-wallet, tf 100rb dari bca ke e-wallet admin 1000"

CONTOH OUTPUT JSON:
[
  {{"type": "EXPENSE", "amount": 50000, "admin_fee": 0, "source_account_name": "BCA", "destination_account_name": null, "category_name": "Transportasi", "description": "Beli bensin", "transaction_date": "{today_str}"}},
  {{"type": "EXPENSE", "amount": 30000, "admin_fee": 0, "source_account_name": "E-Wallet", "destination_account_name": null, "category_name": "Makanan & Minuman", "description": "Makan siang", "transaction_date": "{today_str}"}},
  {{"type": "TRANSFER", "amount": 100000, "admin_fee": 1000, "source_account_name": "BCA", "destination_account_name": "E-Wallet", "category_name": null, "description": "Transfer BCA ke E-Wallet", "transaction_date": "{today_str}"}}
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

        # Resolusi Nama ke ID Database Sah (Anti-Halusinasi & Anti-IDOR)
        validated_drafts = []
        for item in parsed_items:
            tx_type = str(item.get("type", "EXPENSE")).upper()
            if tx_type not in ("INCOME", "EXPENSE", "TRANSFER"):
                tx_type = "EXPENSE"

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

            # Pencocokan nama akun
            for name, aid in acc_map.items():
                if name in src_name or src_name in name:
                    src_acc_id = aid
                if name in dest_name or dest_name in name:
                    dest_acc_id = aid

            # Alias / Sinonim e-wallet (jika user menyebut e-wallet, ewallet, gopay, ovo, dana)
            ewallet_acc = next((a for a in accounts if a.get("type") == "EWALLET" or "wallet" in a.get("name", "").lower()), None)
            if ewallet_acc:
                ew_keywords = ("ewallet", "e-wallet", "wallet", "gopay", "ovo", "dana", "shopeepay")
                if not src_acc_id and any(kw in src_name for kw in ew_keywords):
                    src_acc_id = ewallet_acc["id"]
                if not dest_acc_id and any(kw in dest_name for kw in ew_keywords):
                    dest_acc_id = ewallet_acc["id"]

            # Default fallback akun jika tidak terdeteksi
            default_acc_id = accounts[0]["id"] if accounts else None
            if tx_type in ("EXPENSE", "TRANSFER") and not src_acc_id:
                src_acc_id = default_acc_id
            if tx_type == "INCOME" and not dest_acc_id:
                dest_acc_id = default_acc_id

            # Pencocokan kategori
            if tx_type in ("INCOME", "EXPENSE"):
                for name, (cid, ctype) in cat_map.items():
                    if ctype == tx_type and (name in cat_name or cat_name in name):
                        cat_id = cid
                        break
                if not cat_id:
                    # Ambil kategori pertama sesuai tipe
                    for cid, ctype in cat_map.values():
                        if ctype == tx_type:
                            cat_id = cid
                            break

            validated_drafts.append({
                "type": tx_type,
                "amount": amount,
                "admin_fee": admin_fee,
                "source_account_id": src_acc_id if tx_type in ("EXPENSE", "TRANSFER") else None,
                "destination_account_id": dest_acc_id if tx_type in ("INCOME", "TRANSFER") else None,
                "category_id": cat_id if tx_type in ("INCOME", "EXPENSE") else None,
                "description": item.get("description", user_input[:100]),
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
        """Parser fallback jika koneksi LLM gagal."""
        results = []
        today_str = date.today().strftime("%Y-%m-%d")
        default_acc = accounts[0]["name"] if accounts else "Kas Tunai"
        default_cat = "Makanan & Minuman"

        # Cek nominal
        amt = parse_indonesian_amount(text) or Decimal("10000")
        is_transfer = "transfer" in text.lower() or "tf" in text.lower()
        is_income = any(w in text.lower() for w in ["gaji", "terima", "dapat", "masuk", "bonus"])

        if is_transfer:
            results.append({
                "type": "TRANSFER",
                "amount": amt,
                "admin_fee": Decimal("0.00"),
                "source_account_name": default_acc,
                "destination_account_name": accounts[1]["name"] if len(accounts) > 1 else default_acc,
                "category_name": None,
                "description": text[:80],
                "transaction_date": today_str
            })
        elif is_income:
            results.append({
                "type": "INCOME",
                "amount": amt,
                "admin_fee": Decimal("0.00"),
                "source_account_name": None,
                "destination_account_name": default_acc,
                "category_name": "Gaji & Pendapatan",
                "description": text[:80],
                "transaction_date": today_str
            })
        else:
            results.append({
                "type": "EXPENSE",
                "amount": amt,
                "admin_fee": Decimal("0.00"),
                "source_account_name": default_acc,
                "destination_account_name": None,
                "category_name": default_cat,
                "description": text[:80],
                "transaction_date": today_str
            })
        return results
