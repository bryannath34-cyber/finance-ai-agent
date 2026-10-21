#!/usr/bin/env python3
"""
scripts/set_user_password.py
Utility script to directly set or reset a user's password in the database.
Usage:
    python scripts/set_user_password.py <username_or_email> <new_password>
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import get_db_cursor
from app.core.security import hash_password


def main():
    if len(sys.argv) < 3:
        print("Penggunaan: python scripts/set_user_password.py <username_atau_email> <kata_sandi_baru>")
        sys.exit(1)

    identifier = sys.argv[1].strip()
    new_password = sys.argv[2]

    if len(new_password) < 8:
        print("❌ Kata sandi minimal 8 karakter.")
        sys.exit(1)

    new_hash = hash_password(new_password)

    with get_db_cursor(commit=True) as cur:
        # Cari user berdasarkan username, email, full_name, atau prefix
        cur.execute("""
            SELECT id, username, full_name
            FROM app_users
            WHERE username = %s 
               OR email = %s 
               OR email LIKE CONCAT(%s, '@%')
               OR full_name = %s
            LIMIT 1
        """, (identifier, identifier, identifier, identifier))
        user = cur.fetchone()

        if not user:
            print(f"❌ Pengguna dengan identifier '{identifier}' tidak ditemukan di database.")
            sys.exit(1)

        cur.execute("""
            UPDATE app_users
            SET password_hash = %s, failed_login_attempts = 0, locked_until = NULL
            WHERE id = %s
        """, (new_hash, user["id"]))

        # Hapus sesi lama
        try:
            cur.execute("DELETE FROM web_sessions WHERE user_id = %s", (user["id"],))
        except Exception:
            pass

        print(f"✅ Sukses! Kata sandi untuk pengguna '{user['username']}' (ID: {user['id']}) berhasil diubah.")
        print("Sekarang Anda bisa langsung masuk ke web menggunakan kata sandi baru tersebut!")


if __name__ == "__main__":
    main()
