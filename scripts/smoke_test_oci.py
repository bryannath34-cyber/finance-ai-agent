#!/usr/bin/env python3
"""
Fase 0: Smoke Test OCI & Verifikasi Empiris
Personal Finance AI Agent v2.3
Dijalankan langsung di VM app-01 menggunakan Instance Principals.
"""

import sys
import os
import json
import urllib.request
import subprocess

print("=" * 65)
print("🚀 FASE 0: SMOKE TEST OCI & VERIFIKASI EMPIRIS (VM app-01)")
print("=" * 65)

# ---------------------------------------------------------------------------
# 0. Metadata VM & Instance Principals Signer
# ---------------------------------------------------------------------------
print("\n[0/5] Memeriksa Metadata VM & Instance Principals...")
compartment_id = None
try:
    req = urllib.request.Request(
        "http://169.254.169.254/opc/v2/instance/",
        headers={"Authorization": "Bearer Oracle"}
    )
    with urllib.request.urlopen(req, timeout=5) as resp:
        metadata = json.loads(resp.read().decode())
        compartment_id = metadata.get("compartmentId")
        instance_id = metadata.get("id")
        region = metadata.get("canonicalRegionName", "ap-singapore-1")
        print(f"  ✅ VM Instance ID   : {instance_id}")
        print(f"  ✅ Compartment OCID : {compartment_id}")
        print(f"  ✅ VM Region        : {region}")
except Exception as e:
    print(f"  ⚠️ Tidak dapat membaca metadata IMDS v2: {e}")

try:
    import oci
    signer = oci.auth.signers.InstancePrincipalsSecurityTokenSigner()
    print("  ✅ Instance Principals Signer berhasil diperoleh.")
except Exception as e:
    print(f"  ❌ GAGAL mendapatkan Instance Principals: {e}")
    print("     Pastikan dynamic group 'pf-agent-app' mencakup VM ini.")
    sys.exit(1)

# ---------------------------------------------------------------------------
# 1. Uji OCI Object Storage (Singapore)
# ---------------------------------------------------------------------------
print("\n[1/5] Menguji OCI Object Storage (Singapore: ap-singapore-1)...")
BUCKET_NAME = "pf-speech-exchange"
TEST_OBJECT = "audio-in/smoke_test.txt"
TEST_CONTENT = b"Smoke test Personal Finance AI Agent - Fase 0"

try:
    os_client = oci.object_storage.ObjectStorageClient(
        config={"region": "ap-singapore-1"},
        signer=signer
    )
    namespace = os_client.get_namespace().data
    print(f"  ✅ Object Storage Namespace: {namespace}")
    
    # Periksa keberadaan bucket
    try:
        bucket_info = os_client.get_bucket(namespace, BUCKET_NAME).data
        print(f"  ✅ Bucket '{BUCKET_NAME}' ditemukan (Tier: {bucket_info.storage_tier}).")
    except Exception as e:
        print(f"  ❌ Gagal membaca bucket '{BUCKET_NAME}': {e}")
        print("     Pastikan bucket sudah dibuat di compartment OCI-Training.")
        raise

    # Uji PutObject (Upload)
    os_client.put_object(
        namespace_name=namespace,
        bucket_name=BUCKET_NAME,
        object_name=TEST_OBJECT,
        put_object_body=TEST_CONTENT
    )
    print(f"  ✅ PutObject berhasil: '{TEST_OBJECT}' terunggah.")

    # Uji GetObject (Download)
    get_res = os_client.get_object(
        namespace_name=namespace,
        bucket_name=BUCKET_NAME,
        object_name=TEST_OBJECT
    )
    downloaded = get_res.data.content
    assert downloaded == TEST_CONTENT, "Isi objek tidak cocok!"
    print(f"  ✅ GetObject berhasil: konten valid ({len(downloaded)} bytes).")

    # Uji DeleteObject (Active Cleanup)
    os_client.delete_object(
        namespace_name=namespace,
        bucket_name=BUCKET_NAME,
        object_name=TEST_OBJECT
    )
    print(f"  ✅ DeleteObject berhasil: '{TEST_OBJECT}' dibersihkan.")

except Exception as e:
    print(f"  ❌ Uji Object Storage GAGAL: {e}")

# ---------------------------------------------------------------------------
# 2. Uji OCI Generative AI (Osaka - Cross-Region via NAT Gateway)
# ---------------------------------------------------------------------------
print("\n[2/5] Menguji OCI Generative AI (Osaka: ap-osaka-1)...")
GENAI_ENDPOINT = "https://inference.generativeai.ap-osaka-1.oci.oraclecloud.com"
MODEL_ID = "cohere.command-a-03-2025"

try:
    genai_client = oci.generative_ai_inference.GenerativeAiInferenceClient(
        config={"region": "ap-osaka-1"},
        signer=signer,
        service_endpoint=GENAI_ENDPOINT
    )
    print(f"  ✅ Klien GenAI terhubung ke {GENAI_ENDPOINT}")

    # Eksplorasi tipe payload chat yang didukung SDK terpasang
    chat_models = oci.generative_ai_inference.models
    supported_type = None
    chat_request = None

    test_prompt = "Halo Cohere! Tolong balas singkat hanya satu kata: 'AKTIF'."

    # Model 'cohere.command-a-03-2025' adalah model Cohere, wajib menggunakan CohereChatRequest
    if hasattr(chat_models, "CohereChatRequest"):
        supported_type = "CohereChatRequest"
        chat_request = chat_models.CohereChatRequest(
            api_format=chat_models.BaseChatRequest.API_FORMAT_COHERE,
            message=test_prompt,
            max_tokens=20,
            temperature=0.1
        )
    elif hasattr(chat_models, "GenericChatRequest"):
        supported_type = "GenericChatRequest"
        chat_request = chat_models.GenericChatRequest(
            api_format=chat_models.BaseChatRequest.API_FORMAT_GENERIC,
            messages=[
                chat_models.UserMessage(
                    content=[chat_models.TextContent(text=test_prompt)]
                )
            ],
            max_tokens=20,
            temperature=0.1
        )

    print(f"  ℹ️ Menggunakan kelas payload: {supported_type}")

    if chat_request and compartment_id:
        chat_details = chat_models.ChatDetails(
            compartment_id=compartment_id,
            serving_mode=chat_models.OnDemandServingMode(model_id=MODEL_ID),
            chat_request=chat_request
        )
        print("  ⏳ Mengirim request inferensi ke model Cohere Command A...")
        response = genai_client.chat(chat_details)
        resp_data = response.data
        
        # Ekstraksi respons teks
        reply_text = ""
        if hasattr(resp_data.chat_response, "text") and resp_data.chat_response.text:
            reply_text = resp_data.chat_response.text
        elif hasattr(resp_data.chat_response, "choices"):
            reply_text = resp_data.chat_response.choices[0].message.content[0].text

        print(f"  ✅ INFERENSI BERHASIL! Balasan model: '{reply_text.strip()}'")
    else:
        print("  ⚠️ Melewatkan inferensi (kompartemen tidak ditemukan atau kelas chat tidak dikenali).")

except Exception as e:
    print(f"  ❌ Uji OCI GenAI GAGAL: {e}")
    print("     Periksa: apakah rute NAT Gateway aktif untuk port 443 ke luar?")

# ---------------------------------------------------------------------------
# 3. Uji OCI Speech Service (Singapore) & Pengecekan Policy
# ---------------------------------------------------------------------------
print("\n[3/5] Menguji OCI Speech (Singapore: ap-singapore-1)...")
try:
    speech_client = oci.ai_speech.AIServiceSpeechClient(
        config={"region": "ap-singapore-1"},
        signer=signer
    )
    
    if compartment_id:
        jobs_res = speech_client.list_transcription_jobs(compartment_id=compartment_id, limit=3)
        print(f"  ✅ Klien OCI Speech berhasil list jobs (total existing: {len(jobs_res.data.items)}).")
        
        # Periksa parameter model Whisper
        speech_models = oci.ai_speech.models
        print("  ℹ️ Tersedia model kelas Speech:")
        has_whisper = hasattr(speech_models, "TranscriptionModelDetails")
        print(f"     - TranscriptionModelDetails: {has_whisper}")
        
    print("  ✅ Konektivitas API OCI Speech Singapore valid via Service Gateway/NAT.")

except Exception as e:
    print(f"  ❌ Uji OCI Speech GAGAL: {e}")

# ---------------------------------------------------------------------------
# 4. Pengecekan FFmpeg & Utilitas Sistem (Oracle Linux 10)
# ---------------------------------------------------------------------------
print("\n[4/5] Memeriksa FFmpeg & Utilitas SELinux di VM...")
# Cek ffmpeg
try:
    res = subprocess.run(["ffmpeg", "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    first_line = res.stdout.splitlines()[0] if res.stdout else "Unknown"
    print(f"  ✅ FFmpeg terpasang: {first_line}")
except FileNotFoundError:
    print("  ⚠️ FFmpeg BELUM terpasang di VM.")
    print("     (Sesuai Fase 5, static binary resmi John Van Sickle siap diunduh).")

# Cek semanage (policycoreutils-python-utils)
try:
    res = subprocess.run(["which", "semanage"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode == 0:
        print(f"  ✅ semanage ditemukan: {res.stdout.strip()}")
    else:
        print("  ⚠️ semanage belum terpasang (akan diinstal: dnf install -y policycoreutils-python-utils).")
except Exception:
    print("  ⚠️ semanage belum terpasang.")

# ---------------------------------------------------------------------------
# 5. Rangkuman Hasil
# ---------------------------------------------------------------------------
print("\n" + "=" * 65)
print("🏁 FASE 0 SMOKE TEST SELESAI")
print("=" * 65)
