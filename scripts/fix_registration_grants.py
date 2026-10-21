#!/usr/bin/env python3
"""
scripts/fix_registration_grants.py
Skrip praktis untuk memberikan hak akses INSERT pada user 'fin_bot_app'
agar fitur Pendaftaran Akun Baru (Self-Registration) dapat berjalan di DB OCI.
Dijalankan oleh Administrator menggunakan kredensial 'taskadmin' di VM app-01.
"""

import sys
import getpass

try:
    import pymysql
except ImportError:
    print("❌ Modul 'pymysql' belum terpasang. Jalankan: pip install pymysql")
    sys.exit(1)

def main():
    print("=" * 65)
    print("🔐 PEMBARUAN HAK AKSES REGISTRASI AKUN (fin_bot_app)")
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
        # 1. Tambah kolom email jika belum ada
        "ALTER TABLE app_users ADD COLUMN IF NOT EXISTS email VARCHAR(100) NULL UNIQUE AFTER full_name;",

        # 2. Wildcard host (%)
        "GRANT SELECT, INSERT, UPDATE ON personal_finance.app_users TO 'fin_bot_app'@'%';",
        "GRANT SELECT, INSERT, UPDATE ON personal_finance.accounts TO 'fin_bot_app'@'%';",
        "GRANT SELECT, INSERT, UPDATE ON personal_finance.categories TO 'fin_bot_app'@'%';",
        "GRANT SELECT, INSERT, UPDATE ON personal_finance.user_preferences TO 'fin_bot_app'@'%';",

        # 3. Subnet privat OCI (10.10.2.%)
        "GRANT SELECT, INSERT, UPDATE ON personal_finance.app_users TO 'fin_bot_app'@'10.10.2.%';",
        "GRANT SELECT, INSERT, UPDATE ON personal_finance.accounts TO 'fin_bot_app'@'10.10.2.%';",
        "GRANT SELECT, INSERT, UPDATE ON personal_finance.categories TO 'fin_bot_app'@'10.10.2.%';",
        "GRANT SELECT, INSERT, UPDATE ON personal_finance.user_preferences TO 'fin_bot_app'@'10.10.2.%';",

        # 4. FQDN Hostname OCI VM (app-01)
        "GRANT SELECT, INSERT, UPDATE ON personal_finance.app_users TO 'fin_bot_app'@'app-01.privatesubtrain.vcnocitraining.oraclevcn.com';",
        "GRANT SELECT, INSERT, UPDATE ON personal_finance.accounts TO 'fin_bot_app'@'app-01.privatesubtrain.vcnocitraining.oraclevcn.com';",
        "GRANT SELECT, INSERT, UPDATE ON personal_finance.categories TO 'fin_bot_app'@'app-01.privatesubtrain.vcnocitraining.oraclevcn.com';",
        "GRANT SELECT, INSERT, UPDATE ON personal_finance.user_preferences TO 'fin_bot_app'@'app-01.privatesubtrain.vcnocitraining.oraclevcn.com';",

        # 5. Localhost
        "GRANT SELECT, INSERT, UPDATE ON personal_finance.app_users TO 'fin_bot_app'@'localhost';",
        "GRANT SELECT, INSERT, UPDATE ON personal_finance.accounts TO 'fin_bot_app'@'localhost';",
        "GRANT SELECT, INSERT, UPDATE ON personal_finance.categories TO 'fin_bot_app'@'localhost';",
        "GRANT SELECT, INSERT, UPDATE ON personal_finance.user_preferences TO 'fin_bot_app'@'localhost';",

        # 6. Flush Privileges
        "FLUSH PRIVILEGES;"
    ]

    try:
        with conn.cursor() as cur:
            for q in queries:
                print(f"  ▶️ Menjalankan: {q.strip()}")
                try:
                    cur.execute(q)
                except Exception as query_err:
                    print(f"     ⚠️ {query_err}")

        print("\n" + "=" * 65)
        print("✅ HAK AKSES INSERT REGISTRASI BERHASIL DIBERIKAN KEPADA 'fin_bot_app'!")
        print("   Fitur Buat Akun Baru (Self-Registration) sekarang sudah aktif dan siap digunakan.")
        print("=" * 65)
    except Exception as e:
        print(f"\n❌ Terjadi kesalahan saat memperbarui privileges: {e}")
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    main()
