#!/usr/bin/env python3
"""
scripts/fix_crud_grants.py
Skrip praktis untuk memberikan hak akses UPDATE dan DELETE pada user 'fin_bot_app'
agar fitur Sunting (Edit) dan Hapus Transaksi dapat dijalankan.
Dijalankan oleh Administrator menggunakan kredensial 'taskadmin' di VM app-01.
"""

import sys
import getpass
import pymysql

def main():
    print("=" * 65)
    print("🔐 PEMBARUAN HAK AKSES CRUD TRANSAKSI (fin_bot_app)")
    print("=" * 65)

    db_host = input("MySQL DB Host [10.10.2.202]: ").strip() or "10.10.2.202"
    db_port = int(input("MySQL DB Port [3306]: ").strip() or "3306")
    db_user = input("Admin DB User [taskadmin]: ").strip() or "taskadmin"
    db_pass = getpass.getpass("Admin DB Password: ")
    db_name = "personal_finance"

    print(f"\n⏳ Menghubungi MySQL DB System di {db_host}:{db_port}...")
    try:
        conn = pymysql.connect(
            host=db_host,
            port=db_port,
            user=db_user,
            password=db_pass,
            database=db_name,
            ssl={"check_hostname": False},
            autocommit=True
        )
    except Exception as e:
        print(f"❌ GAGAL terhubung ke database: {e}")
        sys.exit(1)

    queries = [
        "GRANT SELECT, INSERT, UPDATE, DELETE ON personal_finance.transactions TO 'fin_bot_app'@'10.10.2.%';",
        "GRANT SELECT, INSERT, UPDATE, DELETE ON personal_finance.transaction_drafts TO 'fin_bot_app'@'10.10.2.%';",
        "GRANT SELECT, INSERT, UPDATE, DELETE ON personal_finance.web_sessions TO 'fin_bot_app'@'10.10.2.%';",
        "GRANT SELECT, INSERT, UPDATE, DELETE ON personal_finance.transactions TO 'fin_bot_app'@'%';",
        "GRANT SELECT, INSERT, UPDATE, DELETE ON personal_finance.transaction_drafts TO 'fin_bot_app'@'%';",
        "GRANT SELECT, INSERT, UPDATE, DELETE ON personal_finance.web_sessions TO 'fin_bot_app'@'%';",
        "FLUSH PRIVILEGES;"
    ]

    try:
        with conn.cursor() as cur:
            for q in queries:
                print(f"  ▶️ Menjalankan: {q.strip()}")
                cur.execute(q)

        print("\n" + "=" * 65)
        print("✅ HAK AKSES UPDATE & DELETE BERHASIL DIBERIKAN KEPADA 'fin_bot_app'!")
        print("   Fitur Edit Transaksi dan Hapus Transaksi sekarang sudah siap digunakan.")
        print("=" * 65)
    except Exception as e:
        print(f"\n❌ Terjadi kesalahan saat memperbarui privileges: {e}")
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    main()
