#!/usr/bin/env python3
"""
scripts/inspect_db.py
Skrip ringkas untuk memeriksa isi database MySQL personal_finance secara otomatis.
Dijalankan langsung di VM: python3 scripts/inspect_db.py
"""

import os
import sys
import pymysql
from dotenv import load_dotenv

# Load konfigurasi dari .env
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
load_dotenv(env_path)

DB_HOST = os.getenv("DB_HOST", "10.10.2.202")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "fin_bot_app")
DB_PASSWORD = os.getenv("DB_PASSWORD", "FinAppSecret2026!#Oci")
DB_NAME = os.getenv("DB_NAME", "personal_finance")

def format_idr(amount):
    try:
        val = float(amount)
        return f"Rp {val:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")
    except Exception:
        return str(amount)

def main():
    print("\n" + "=" * 70)
    print(f"📊 INSPEKSI DATABASE: {DB_NAME} @ {DB_HOST}:{DB_PORT}")
    print("=" * 70)

    try:
        conn = pymysql.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            cursorclass=pymysql.cursors.DictCursor,
            ssl={"check_hostname": False}
        )
        print("✅ Berhasil terhubung ke MySQL DB System!")
    except Exception as e:
        print(f"❌ Gagal terhubung ke database: {e}")
        sys.exit(1)

    try:
        with conn.cursor() as cur:
            # 1. Ringkasan Semua Tabel & Jumlah Data
            print("\n📋 1. DAFTAR TABEL & JUMLAH DATA:")
            print("-" * 50)
            cur.execute("SHOW TABLES;")
            tables = [list(row.values())[0] for row in cur.fetchall()]
            
            for t in sorted(tables):
                cur.execute(f"SELECT COUNT(*) AS total FROM `{t}`;")
                cnt = cur.fetchone()["total"]
                print(f"  • {t:<26} : {cnt:>6} baris")

            # 2. Daftar Rekening (Accounts)
            print("\n💳 2. DAFTAR REKENING / KANTONG DANA:")
            print("-" * 70)
            cur.execute("""
                SELECT id, name, type, opening_balance, is_active 
                FROM accounts 
                ORDER BY id ASC;
            """)
            accounts = cur.fetchall()
            if accounts:
                for a in accounts:
                    status = "Aktif" if a["is_active"] else "Nonaktif"
                    print(f"  [{a['id']}] {a['name']:<18} ({a['type']:<7}) | Saldo Awal: {format_idr(a['opening_balance']):<18} | Status: {status}")
            else:
                print("  (Belum ada data rekening)")

            # 3. Transaksi Terakhir (Transactions)
            print("\n📝 3. LIMA (5) TRANSAKSI TERAKHIR:")
            print("-" * 70)
            cur.execute("""
                SELECT t.id, t.transaction_date, t.type, t.amount, t.description, 
                       a.name as account_name, c.name as category_name
                FROM transactions t
                LEFT JOIN accounts a ON t.account_id = a.id
                LEFT JOIN categories c ON t.category_id = c.id
                ORDER BY t.transaction_date DESC, t.id DESC
                LIMIT 5;
            """)
            txs = cur.fetchall()
            if txs:
                for t in txs:
                    date_str = str(t['transaction_date'])
                    desc = (t['description'] or '-')[:28]
                    acc = t['account_name'] or '-'
                    cat = t['category_name'] or '-'
                    print(f"  #{t['id']:<4} | {date_str} | {t['type']:<7} | {format_idr(t['amount']):<18} | {desc:<30} | {acc} ({cat})")
            else:
                print("  (Belum ada data transaksi)")

            # 4. Target Tabungan (Savings Goals)
            print("\n🎯 4. TARGET TABUNGAN:")
            print("-" * 70)
            cur.execute("""
                SELECT id, name, target_amount, current_amount, target_date, status 
                FROM savings_goals 
                ORDER BY id ASC;
            """)
            goals = cur.fetchall()
            if goals:
                for g in goals:
                    pct = (float(g['current_amount']) / float(g['target_amount']) * 100) if float(g['target_amount']) > 0 else 0
                    print(f"  [{g['id']}] {g['name']:<20} | Capaian: {format_idr(g['current_amount'])} / {format_idr(g['target_amount'])} ({pct:.1f}%) | Target: {g['target_date']} | Status: {g['status']}")
            else:
                print("  (Belum ada target tabungan)")

            # 5. Pengguna Aplikasi (App Users)
            print("\n👤 5. DAFTAR PENGGUNA TERDAFTAR:")
            print("-" * 70)
            cur.execute("SELECT id, username, full_name, timezone, is_active FROM app_users;")
            users = cur.fetchall()
            for u in users:
                status = "Aktif" if u['is_active'] else "Nonaktif"
                print(f"  ID: {u['id']} | Username: {u['username']} | Nama: {u['full_name']} | Timezone: {u['timezone']} | Status: {status}")

            # 6. Sesi Aktif (Web Sessions)
            print("\n🔐 6. SESI WEB AKTIF:")
            print("-" * 70)
            cur.execute("SELECT id, user_id, ip_address, expires_at, created_at FROM web_sessions ORDER BY id DESC LIMIT 5;")
            sessions = cur.fetchall()
            if sessions:
                for s in sessions:
                    print(f"  Sesi #{s['id']} | User ID: {s['user_id']} | IP: {s['ip_address']} | Dibuat: {s['created_at']} | Expired: {s['expires_at']}")
            else:
                print("  (Tidak ada sesi aktif saat ini)")

    finally:
        conn.close()

    print("\n" + "=" * 70)
    print("✅ Inspeksi database selesai.")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    main()
