#!/usr/bin/env python3
"""
scripts/create_user.py
Skrip inisialisasi akun pengguna pertama Personal Finance AI Agent.
Dijalankan oleh Administrator menggunakan kredensial 'taskadmin' di VM app-01.
"""

import sys
import getpass
import datetime

try:
    import pymysql
except ImportError:
    print("❌ Modul 'pymysql' belum terpasang. Jalankan: pip install pymysql")
    sys.exit(1)

try:
    from passlib.hash import argon2
except ImportError:
    print("⚠️ Modul 'passlib[argon2]' belum terpasang. Jalankan: pip install 'passlib[argon2]'")
    # Fallback jika hanya passlib biasa
    try:
        from passlib.hash import pbkdf2_sha256 as argon2
        print("⚠️ Menggunakan fallback hash pbkdf2_sha256 sementara.")
    except ImportError:
        print("❌ Tidak dapat menginisialisasi password hasher.")
        sys.exit(1)

def main():
    print("=" * 65)
    print("👤 INISIALISASI PENGGUNA PERTAMA (Personal Finance AI Agent)")
    print("=" * 65)
    
    # 1. Konfigurasi Koneksi DB Admin
    db_host = input("MySQL DB Host [10.10.2.202]: ").strip() or "10.10.2.202"
    db_port = int(input("MySQL DB Port [3306]: ").strip() or "3306")
    db_user = input("Admin DB User [taskadmin]: ").strip() or "taskadmin"
    db_pass = getpass.getpass("Admin DB Password: ")
    db_name = "personal_finance"

    # 2. Data Pengguna Baru
    print("\n--- Data Pengguna Baru ---")
    username = input("Username: ").strip()
    if not username:
        print("❌ Username tidak boleh kosong.")
        sys.exit(1)

    full_name = input("Nama Lengkap: ").strip()
    if not full_name:
        print("❌ Nama lengkap tidak boleh kosong.")
        sys.exit(1)

    password = getpass.getpass("Password Pengguna Baru: ")
    password_confirm = getpass.getpass("Konfirmasi Password: ")

    if password != password_confirm:
        print("❌ Password dan Konfirmasi Password tidak cocok!")
        sys.exit(1)

    if len(password) < 8:
        print("❌ Password minimal 8 karakter.")
        sys.exit(1)

    print("\n⏳ Mengenkripsi password dengan Argon2id...")
    password_hash = argon2.hash(password)

    # 3. Eksekusi Database Atomik
    print(f"⏳ Menghubungi MySQL DB System di {db_host}:{db_port}...")
    try:
        conn = pymysql.connect(
            host=db_host,
            port=db_port,
            user=db_user,
            password=db_pass,
            database=db_name,
            ssl={"check_hostname": False},
            autocommit=False
        )
    except Exception as e:
        print(f"❌ GAGAL terhubung ke database: {e}")
        sys.exit(1)

    try:
        with conn.cursor() as cur:
            # A. Insert User
            cur.execute("""
                INSERT INTO app_users (username, password_hash, full_name, timezone)
                VALUES (%s, %s, %s, 'Asia/Jakarta')
            """, (username, password_hash, full_name))
            user_id = cur.lastrowid
            print(f"  ✅ User '{username}' berhasil dibuat (ID: {user_id}).")

            # B. Insert 3 Rekening Awal
            accounts_data = [
                (user_id, 'Kas Tunai', 'CASH', 0.00, datetime.date.today()),
                (user_id, 'BCA', 'BANK', 0.00, datetime.date.today()),
                (user_id, 'GoPay', 'EWALLET', 0.00, datetime.date.today()),
            ]
            cur.executemany("""
                INSERT INTO accounts (user_id, name, type, opening_balance, opening_balance_date, is_active)
                VALUES (%s, %s, %s, %s, %s, TRUE)
            """, accounts_data)
            print("  ✅ 3 Rekening awal ('Kas Tunai', 'BCA', 'GoPay') diinisialisasi.")

            # C. Insert 8 Kategori Umum + 1 Kategori Sistem "Biaya Admin"
            categories_data = [
                (user_id, 'Gaji & Pendapatan', 'INCOME', False),
                (user_id, 'Bonus & Freelance', 'INCOME', False),
                (user_id, 'Investasi & Bunga', 'INCOME', False),
                (user_id, 'Makanan & Minuman', 'EXPENSE', False),
                (user_id, 'Transportasi', 'EXPENSE', False),
                (user_id, 'Tagihan & Utilitas', 'EXPENSE', False),
                (user_id, 'Belanja Kebutuhan', 'EXPENSE', False),
                (user_id, 'Hiburan & Liburan', 'EXPENSE', False),
                (user_id, 'Biaya Admin', 'EXPENSE', True),  # Sistem wajib
            ]
            cur.executemany("""
                INSERT INTO categories (user_id, name, type, is_system, is_active)
                VALUES (%s, %s, %s, %s, TRUE)
            """, categories_data)
            print("  ✅ 8 Kategori umum & 1 Kategori sistem ('Biaya Admin') diinisialisasi.")

            # Commit transaksi
            conn.commit()
            print("\n🎉 INSIALISASI SUKSES! Seluruh data awal tersimpan permanen.")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Transaksi DB GAGAL dan di-ROLLBACK: {e}")
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    main()
