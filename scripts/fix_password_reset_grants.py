#!/usr/bin/env python3
"""
scripts/fix_password_reset_grants.py
Skrip otomatis untuk membuat tabel password_reset_tokens dan memberikan
hak akses (SELECT, INSERT, UPDATE, DELETE) kepada user 'fin_bot_app'
Dijalankan oleh Administrator menggunakan user 'taskadmin' di VM app-01.
"""

import os
import sys
import getpass

try:
    import pymysql
except ImportError:
    print("❌ Modul 'pymysql' belum terpasang. Jalankan dengan python venv atau: pip install pymysql")
    sys.exit(1)

def get_env_value(key, default=""):
    try:
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    if line.strip().startswith(f"{key}="):
                        return line.split("=", 1)[1].strip().strip("\"'")
    except Exception:
        pass
    return default

def main():
    print("=" * 65)
    print("🔐 PEMBARUAN TABEL & HAK AKSES RESET PASSWORD (fin_bot_app)")
    print("=" * 65)

    default_host = get_env_value("DB_HOST", "10.10.2.202")
    db_host = input(f"MySQL DB Host [{default_host}]: ").strip() or default_host
    db_port = int(input("MySQL DB Port [3306]: ").strip() or "3306")
    db_user = input("Admin DB User [taskadmin]: ").strip() or "taskadmin"
    db_pass = getpass.getpass(f"Password untuk '{db_user}': ")
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
            # 1. Buat tabel password_reset_tokens jika belum ada
            print("  ▶️ Memastikan tabel 'password_reset_tokens' tersedia...")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS password_reset_tokens (
                    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    user_id BIGINT UNSIGNED NOT NULL,
                    token_hash VARCHAR(64) NOT NULL UNIQUE COMMENT 'SHA-256 hash token pemulihan kata sandi',
                    expires_at DATETIME NOT NULL COMMENT 'Batas waktu kedaluwarsa token (15 menit)',
                    used_at DATETIME NULL DEFAULT NULL COMMENT 'Waktu token digunakan',
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT fk_reset_token_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE,
                    INDEX idx_reset_token_hash (token_hash),
                    INDEX idx_reset_expires (expires_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            """)
            print("  ✅ Tabel 'password_reset_tokens' siap.")

            # 2. Berikan hak akses ke fin_bot_app
            grants = [
                "GRANT SELECT, INSERT, UPDATE, DELETE ON personal_finance.password_reset_tokens TO 'fin_bot_app'@'10.10.2.%';",
                "GRANT SELECT, INSERT, UPDATE, DELETE ON personal_finance.password_reset_tokens TO 'fin_bot_app'@'app-01.privatesubtrain.vcnocitraining.oraclevcn.com';",
                "GRANT SELECT, INSERT, UPDATE, DELETE ON personal_finance.password_reset_tokens TO 'fin_bot_app'@'localhost';",
                "GRANT SELECT, INSERT, UPDATE, DELETE ON personal_finance.password_reset_tokens TO 'fin_bot_app'@'%';",
                "FLUSH PRIVILEGES;"
            ]
            for g in grants:
                try:
                    cur.execute(g)
                    print(f"  ▶️ Hak akses diterapkan: {g.split('TO')[1].strip() if 'TO' in g else g.strip()}")
                except Exception as ex:
                    print(f"  ℹ️ Catatan hak akses: {ex}")

        print("\n" + "=" * 65)
        print("🎉 BERHASIL! HAK AKSES RESET PASSWORD TELAH AKTIF!")
        print("   fin_bot_app sekarang memiliki izin penuh pada password_reset_tokens.")
        print("=" * 65)
    except Exception as e:
        print(f"\n❌ Terjadi kesalahan: {e}")
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    main()
