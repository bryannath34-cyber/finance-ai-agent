#!/usr/bin/env python3
"""
scripts/test_all_features.py
Automated End-to-End Test Suite for Personal Finance AI Agent v2.3.
Uses standard library (urllib) - zero external dependencies required!
"""

import sys
import json
import urllib.request
import urllib.parse
import urllib.error
import http.cookiejar

BASE_URL = "http://127.0.0.1:8000/finance/api"

def print_test(name, passed, detail=""):
    badge = "✅ PASS" if passed else "❌ FAIL"
    print(f"[{badge}] {name}")
    if detail:
        print(f"       -> {detail}")

class TestClient:
    def __init__(self, base_url):
        self.base_url = base_url
        self.cookie_jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self.cookie_jar)
        )
        self.headers = {
            "Content-Type": "application/json",
            "User-Agent": "E2E-Tester/2.3"
        }

    def request(self, method, path, data=None):
        url = f"{self.base_url}{path}" if not path.startswith("http") else path
        body = json.dumps(data).encode("utf-8") if data is not None else None
        req = urllib.request.Request(url, data=body, headers=self.headers, method=method)
        try:
            with self.opener.open(req) as resp:
                status = resp.status
                raw = resp.read().decode("utf-8")
                try:
                    payload = json.loads(raw)
                except Exception:
                    payload = raw
                return status, payload
        except urllib.error.HTTPError as e:
            raw = e.read().decode("utf-8")
            try:
                payload = json.loads(raw)
            except Exception:
                payload = raw
            return e.code, payload
        except Exception as e:
            return 500, str(e)

def run_tests():
    print("=" * 65)
    print("🧪 AUTOMATED E2E TEST SUITE (Personal Finance AI Agent v2.3)")
    print("=" * 65)

    client = TestClient(BASE_URL)

    # 1. Test Health Probes
    s1, r1 = client.request("GET", "/health")
    s2, r2 = client.request("GET", "http://127.0.0.1:8000/health")
    passed = (s1 == 200 and s2 == 200)
    print_test("1. Health Check Probes (Internal & LB Default)", passed, f"Status: {s1}, {s2}")

    # 2. Test Login
    username = "bryan"
    password = input("Masukkan password user 'bryan' untuk test suite: ").strip()

    s_log, r_log = client.request("POST", "/auth/login", {"username": username, "password": password})
    if s_log != 200:
        print_test("2. User Authentication (Login)", False, f"HTTP {s_log}: {r_log}")
        return

    csrf_token = r_log.get("csrf_token")
    if csrf_token:
        client.headers["X-CSRF-Token"] = csrf_token
    user_id = r_log.get("user", {}).get("id")
    print_test("2. User Authentication (Argon2id + Session Cookie + CSRF)", True, f"User ID: {user_id}")

    # 3. Test Profile
    s_me, r_me = client.request("GET", "/auth/me")
    passed = (s_me == 200 and r_me.get("data", {}).get("username") == username)
    print_test("3. Session Verification (/auth/me)", passed, f"Username: {r_me.get('data', {}).get('username')}")

    # 4. Test Accounts & Balances
    s_acc, r_acc = client.request("GET", "/accounts")
    accounts = r_acc.get("data", []) if isinstance(r_acc, dict) else []
    passed = (s_acc == 200 and len(accounts) >= 3)
    acc_summary = ", ".join([f"{a['name']} (Rp {float(a['current_balance']):,.0f})" for a in accounts])
    print_test("4. Accounts & Netting Balances (/accounts)", passed, acc_summary)

    # 5. Test Categories
    s_cat, r_cat = client.request("GET", "/categories")
    categories = r_cat.get("data", []) if isinstance(r_cat, dict) else []
    passed = (s_cat == 200 and len(categories) >= 9)
    print_test("5. Categories Retrieval (/categories)", passed, f"Total Kategori: {len(categories)}")

    # 6. Test AI Extraction (Cohere Command A)
    ai_prompt = "Makan siang di kantin 25rb pake gopay, tf 50rb dari bca ke gopay admin 1000"
    s_ai, r_ai = client.request("POST", "/ai/parse", {"text": ai_prompt})
    if s_ai != 200:
        print_test("6. OCI GenAI Parsing (/ai/parse)", False, f"HTTP {s_ai}: {r_ai}")
        return

    ai_data = r_ai.get("data", {})
    batch_id = ai_data.get("batch_id")
    items_count = ai_data.get("items_count")
    print_test("6. OCI GenAI Parsing (/ai/parse)", True, f"Batch ID: {batch_id[:8]}... (Extracted: {items_count} draft)")

    # 7. Test Get Batch Drafts
    s_drf, r_drf = client.request("GET", f"/transactions/drafts/{batch_id}")
    drafts = r_drf.get("data", []) if isinstance(r_drf, dict) else []
    passed = (s_drf == 200 and len(drafts) > 0)
    print_test("7. Get Batch Drafts (/transactions/drafts)", passed, f"Items: {len(drafts)}")

    # 8. Test Confirm Batch (The critical flow!)
    s_conf, r_conf = client.request("POST", "/transactions/confirm-batch", {"batch_id": batch_id})
    if s_conf == 200:
        conf_data = r_conf
        print_test(
            "8. Atomic Batch Confirmation (/transactions/confirm-batch)",
            True,
            f"Confirmed: {conf_data.get('confirmed_count')}, Primary: {conf_data.get('primary_transactions_count')}, Admin: {conf_data.get('admin_fee_transactions_count')}"
        )
    else:
        print_test("8. Atomic Batch Confirmation (/transactions/confirm-batch)", False, f"HTTP {s_conf}: {r_conf}")

    # 9. Test Immutable Ledger History
    s_tx, r_tx = client.request("GET", "/transactions?limit=10")
    txs = r_tx.get("data", []) if isinstance(r_tx, dict) else []
    passed = (s_tx == 200 and len(txs) > 0)
    latest_tx_id = txs[0]["id"] if txs else None
    print_test("9. Immutable Ledger List (/transactions)", passed, f"Total Riwayat: {len(txs)} tx. Terakhir ID: {latest_tx_id}")

    # 10. Test Reversal Transaction
    if latest_tx_id:
        s_rev, r_rev = client.request("POST", f"/transactions/{latest_tx_id}/reverse", {"transaction_id": latest_tx_id, "reason": "Uji coba reversal otomatis"})
        passed = (s_rev == 200)
        print_test("10. Reversal Transaction (/transactions/{id}/reverse)", passed, str(r_rev))

    print("=" * 65)
    print("🏁 E2E TEST RUN COMPLETED!")
    print("=" * 65)

if __name__ == "__main__":
    run_tests()
