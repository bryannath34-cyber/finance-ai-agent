#!/usr/bin/env python3
"""
scripts/test_all_features.py
Automated End-to-End Test Suite for Personal Finance AI Agent v2.3.
Tests all 10 critical operational flows directly against local FastAPI instance.
"""

import sys
import json
import httpx

BASE_URL = "http://127.0.0.1:8000/finance/api"

def print_test(name, passed, detail=""):
    badge = "✅ PASS" if passed else "❌ FAIL"
    print(f"[{badge}] {name}")
    if detail:
        print(f"       -> {detail}")

def run_tests():
    print("=" * 65)
    print("🧪 AUTOMATED E2E TEST SUITE (Personal Finance AI Agent v2.3)")
    print("=" * 65)

    client = httpx.Client(base_url=BASE_URL, timeout=30.0)

    # 1. Test Health Probes
    try:
        r1 = client.get("/health")
        r2 = httpx.get("http://127.0.0.1:8000/health", timeout=5.0)
        passed = (r1.status_code == 200 and r2.status_code == 200)
        print_test("1. Health Check Probes (Internal & LB Default)", passed, f"Status: {r1.status_code}, {r2.status_code}")
    except Exception as e:
        print_test("1. Health Check Probes", False, str(e))
        return

    # 2. Test Login
    username = "bryan"
    password = input("Masukkan password user 'bryan' untuk test suite: ").strip()

    try:
        login_res = client.post("/auth/login", json={"username": username, "password": password})
        if login_res.status_code != 200:
            print_test("2. User Authentication (Login)", False, f"HTTP {login_res.status_code}: {login_res.text}")
            return
        
        login_data = login_res.json()
        csrf_token = login_data.get("csrf_token")
        client.headers["X-CSRF-Token"] = csrf_token
        print_test("2. User Authentication (Argon2id + Session Cookie + CSRF)", True, f"User ID: {login_data['user']['id']}")
    except Exception as e:
        print_test("2. User Authentication", False, str(e))
        return

    # 3. Test Get Current User Profile
    try:
        me_res = client.get("/auth/me")
        passed = (me_res.status_code == 200 and me_res.json()["data"]["username"] == username)
        print_test("3. Session Verification (/auth/me)", passed, f"Username: {me_res.json().get('data', {}).get('username')}")
    except Exception as e:
        print_test("3. Session Verification", False, str(e))

    # 4. Test Accounts & Balances
    accounts = []
    try:
        acc_res = client.get("/accounts")
        accounts = acc_res.json().get("data", [])
        passed = (acc_res.status_code == 200 and len(accounts) >= 3)
        acc_summary = ", ".join([f"{a['name']} (Rp {a['current_balance']:,.0f})" for a in accounts])
        print_test("4. Accounts & Netting Balances (/accounts)", passed, acc_summary)
    except Exception as e:
        print_test("4. Accounts & Netting Balances", False, str(e))

    # 5. Test Categories
    categories = []
    try:
        cat_res = client.get("/categories")
        categories = cat_res.json().get("data", [])
        passed = (cat_res.status_code == 200 and len(categories) >= 9)
        print_test("5. Categories Retrieval (/categories)", passed, f"Total Kategori: {len(categories)}")
    except Exception as e:
        print_test("5. Categories Retrieval", False, str(e))

    # 6. Test AI Extraction (OCI GenAI Cohere Command A)
    batch_id = None
    try:
        ai_prompt = "Makan siang di kantin 25rb pake gopay, tf 50rb dari bca ke gopay admin 1000"
        ai_res = client.post("/ai/parse", json={"text": ai_prompt})
        if ai_res.status_code == 200:
            ai_data = ai_res.json()["data"]
            batch_id = ai_data["batch_id"]
            items_count = ai_data["items_count"]
            print_test("6. OCI GenAI Parsing (/ai/parse)", True, f"Batch ID: {batch_id[:8]}... (Extracted: {items_count} draft)")
        else:
            print_test("6. OCI GenAI Parsing", False, f"HTTP {ai_res.status_code}: {ai_res.text}")
            return
    except Exception as e:
        print_test("6. OCI GenAI Parsing", False, str(e))
        return

    # 7. Test Get Batch Drafts
    try:
        drafts_res = client.get(f"/transactions/drafts/{batch_id}")
        drafts = drafts_res.json().get("data", [])
        passed = (drafts_res.status_code == 200 and len(drafts) > 0)
        print_test("7. Get Batch Drafts (/transactions/drafts)", passed, f"Items: {len(drafts)}")
    except Exception as e:
        print_test("7. Get Batch Drafts", False, str(e))

    # 8. Test Confirm Batch (The critical flow!)
    confirm_data = None
    try:
        conf_res = client.post("/transactions/confirm-batch", json={"batch_id": batch_id})
        if conf_res.status_code == 200:
            confirm_data = conf_res.json()
            print_test(
                "8. Atomic Batch Confirmation (/transactions/confirm-batch)", 
                True, 
                f"Confirmed: {confirm_data['confirmed_count']}, Primary: {confirm_data['primary_transactions_count']}, Admin: {confirm_data['admin_fee_transactions_count']}"
            )
        else:
            print_test("8. Atomic Batch Confirmation", False, f"HTTP {conf_res.status_code}: {conf_res.text}")
    except Exception as e:
        print_test("8. Atomic Batch Confirmation", False, str(e))

    # 9. Test Immutable Ledger History
    latest_tx_id = None
    try:
        tx_res = client.get("/transactions?limit=10")
        txs = tx_res.json().get("data", [])
        passed = (tx_res.status_code == 200 and len(txs) > 0)
        if txs:
            latest_tx_id = txs[0]["id"]
        print_test("9. Immutable Ledger List (/transactions)", passed, f"Total Riwayat: {len(txs)} tx. Terakhir ID: {latest_tx_id}")
    except Exception as e:
        print_test("9. Immutable Ledger List", False, str(e))

    # 10. Test Reversal Transaction (Jurnal Pembalik)
    if latest_tx_id:
        try:
            rev_res = client.post(f"/transactions/{latest_tx_id}/reverse", json={"transaction_id": latest_tx_id, "reason": "Uji coba reversal otomatis"})
            passed = (rev_res.status_code == 200)
            print_test("10. Reversal Transaction (/transactions/{id}/reverse)", passed, rev_res.text)
        except Exception as e:
            print_test("10. Reversal Transaction", False, str(e))

    print("=" * 65)
    print("🏁 E2E TEST RUN COMPLETED!")
    print("=" * 65)

if __name__ == "__main__":
    run_tests()
