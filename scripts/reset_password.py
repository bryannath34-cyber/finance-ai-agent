#!/usr/bin/env python3
"""
scripts/reset_password.py
Skrip praktis untuk mengatur ulang password dan membuka kunci akun pengguna di database.
"""

import sys
import getpass
from app.core.database import get_db_cursor
from app.core.security import hash_password

def main():
    print("=" * 50)
    print("🔑 RESET PASSWORD PENGGUNA (Personal Finance Agent)")
    print("=" * 50)

    username = input("Username pengguna yang ingin di-reset [bryan]: ").strip() or "bryan"
    new_pass = getpass.getpass("Password Baru: ")
    confirm_pass = getpass.getpass("Konfirmasi Password Baru: ")

    if new_pass != confirm_pass:
        print("❌ Konfirmasi password tidak cocok!")
        sys.exit(1)

    if len(new_pass) < 6:
        print("❌ Password minimal 6 karakter.")
        sys.exit(1)

    print("⏳ Menghasilkan hash keamanan...")
    new_hash = hash_password(new_pass)

    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            UPDATE app_users 
            SET password_hash = %s, 
                failed_login_attempts = 0, 
                locked_until = NULL 
            WHERE username = %s
        """, (new_hash, username))

        if cur.rowcount > 0:
            print(f"✅ Password untuk user '{username}' BERHASIL DIPERBARUI dan akun dibuka!")
        else:
            print(f"❌ User '{username}' tidak ditemukan di tabel app_users.")

if __name__ == "__main__":
    main()
