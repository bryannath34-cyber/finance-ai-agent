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

    try:
        with conn.cursor() as cur:
            # 1. Cek & Tambah Kolom Email pada app_users jika belum ada
            cur.execute("SHOW COLUMNS FROM app_users LIKE 'email'")
            if cur.fetchone():
                print("  ℹ️ Kolom 'email' sudah ada di tabel app_users.")
            else:
                print("  ▶️ Menambahkan kolom 'email' ke tabel app_users...")
                cur.execute("ALTER TABLE app_users ADD COLUMN email VARCHAR(100) NULL UNIQUE AFTER full_name")
                print("  ✅ Kolom 'email' berhasil ditambahkan.")

            # 2. Cek & Buat Tabel user_preferences jika belum ada
            print("  ▶️ Memastikan tabel 'user_preferences' tersedia...")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS user_preferences (
                    user_id BIGINT UNSIGNED PRIMARY KEY,
                    preferences_json JSON NOT NULL,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    CONSTRAINT fk_preferences_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
                ) ENGINE=InnoDB
            """)
            print("  ✅ Tabel 'user_preferences' siap.")

            # 3. Berikan Hak Akses Pendaftaran ke 'fin_bot_app'@'10.10.2.%'
            grants = [
                "GRANT SELECT, INSERT, UPDATE ON personal_finance.app_users TO 'fin_bot_app'@'10.10.2.%';",
                "GRANT SELECT, INSERT, UPDATE ON personal_finance.accounts TO 'fin_bot_app'@'10.10.2.%';",
                "GRANT SELECT, INSERT, UPDATE ON personal_finance.categories TO 'fin_bot_app'@'10.10.2.%';",
                "GRANT SELECT, INSERT, UPDATE ON personal_finance.user_preferences TO 'fin_bot_app'@'10.10.2.%';",
                "FLUSH PRIVILEGES;"
            ]
            for g in grants:
                print(f"  ▶️ Menjalankan: {g.strip()}")
                cur.execute(g)

        print("\n" + "=" * 65)
        print("🎉 SEMPURNA! HAK AKSES PENDAFTARAN AKUN BERHASIL DIKONFIGURASI!")
        print("   Pengguna sekarang dapat membuat akun baru langsung dari halaman web.")
        print("=" * 65)
    except Exception as e:
        print(f"\n❌ Terjadi kesalahan: {e}")
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    main()
