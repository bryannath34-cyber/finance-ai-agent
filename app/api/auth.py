import logging
import json
import re
from datetime import datetime, date, timedelta, timezone
from fastapi import APIRouter, HTTPException, status, Request, Response, Depends
from urllib.parse import quote
from app.core.config import settings
from app.core.database import get_db_cursor
from app.core.security import (
    verify_password,
    hash_password,
    create_user_session,
    invalidate_user_session,
    generate_secure_token,
    get_current_user,
    encrypt_totp_secret,
    decrypt_totp_secret,
    generate_totp_secret,
    verify_totp,
)
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    LoginResponse,
    UserProfile,
    TwoFactorEnableRequest,
    TwoFactorDisableRequest,
    ChangePasswordRequest,
    UpdateProfileRequest,
)
from app.schemas.common import BaseResponse, DataResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger("personal_finance.auth")

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15

def _has_email_column(cur) -> bool:
    try:
        cur.execute("SHOW COLUMNS FROM app_users LIKE 'email'")
        return cur.fetchone() is not None
    except Exception:
        return False

@router.post("/login", response_model=LoginResponse)
def login(login_data: LoginRequest, request: Request, response: Response):
    """
    Otentikasi pengguna web:
    - Memverifikasi username/email dan hash password Argon2id
    - Memeriksa batasan percobaan login gagal (lockout 15 menit jika 5x gagal)
    - Menerbitkan token sesi web server-side di tabel web_sessions
    - Mengatur HttpOnly Session Cookie dan Anti-CSRF Cookie
    """
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    now_utc_str = now_utc.strftime("%Y-%m-%d %H:%M:%S")

    login_val = login_data.username.strip()
    user_prefix = login_val.split("@")[0] if "@" in login_val else login_val

    with get_db_cursor(commit=True) as cur:
        has_email = _has_email_column(cur)
        if has_email:
            cur.execute("""
                SELECT *
                FROM app_users
                WHERE username = %s OR email = %s OR username = %s OR full_name = %s
                ORDER BY (email = %s) DESC, (username = %s) DESC, (full_name = %s) DESC
                LIMIT 1
            """, (login_val, login_val, user_prefix, login_val, login_val, login_val, login_val))
        else:
            cur.execute("""
                SELECT *
                FROM app_users
                WHERE username = %s OR username = %s OR full_name = %s
                ORDER BY (username = %s) DESC, (full_name = %s) DESC
                LIMIT 1
            """, (login_val, user_prefix, login_val, login_val, login_val))
        user = cur.fetchone()

        if not user:
            logger.warning("Upaya login gagal: username '%s' tidak ditemukan", login_val)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Username atau password salah."
            )

        if not user["is_active"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Akun pengguna dinonaktifkan. Hubungi administrator."
            )

        # Cek Lockout
        if user["locked_until"] and user["locked_until"] > now_utc:
            sisa_menit = int((user["locked_until"] - now_utc).total_seconds() / 60) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Akun terkunci sementara karena terlalu banyak percobaan gagal. Silakan tunggu {sisa_menit} menit."
            )

        # Verifikasi Password
        is_valid = verify_password(login_data.password, user["password_hash"])
        if not is_valid:
            new_attempts = user["failed_login_attempts"] + 1
            locked_until_val = None
            if new_attempts >= MAX_FAILED_ATTEMPTS:
                locked_until_val = (now_utc + timedelta(minutes=LOCKOUT_MINUTES)).strftime("%Y-%m-%d %H:%M:%S")
                logger.warning("User '%s' terkunci hingga %s setelah %s percobaan gagal", user["username"], locked_until_val, new_attempts)

            cur.execute("""
                UPDATE app_users
                SET failed_login_attempts = %s, locked_until = %s
                WHERE id = %s
            """, (new_attempts, locked_until_val, user["id"]))
            # Persist the lockout counter before the HTTP error triggers rollback.
            cur.connection.commit()

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Username atau password salah."
            )

        if user.get("totp_enabled"):
            if not login_data.totp_code:
                raise HTTPException(status_code=401, detail={"code": "TOTP_REQUIRED", "message": "Masukkan kode autentikasi 6 digit."})
            try:
                totp_secret = decrypt_totp_secret(user["totp_secret_ciphertext"])
                accepted_counter = verify_totp(totp_secret, login_data.totp_code, user.get("totp_last_counter"))
            except Exception:
                logger.exception("Gagal memvalidasi TOTP pengguna %s", user["id"])
                accepted_counter = None
            if accepted_counter is None:
                failed_attempts = int(user["failed_login_attempts"] or 0) + 1
                locked_until_val = (now_utc + timedelta(minutes=LOCKOUT_MINUTES)).strftime("%Y-%m-%d %H:%M:%S") if failed_attempts >= MAX_FAILED_ATTEMPTS else None
                cur.execute("UPDATE app_users SET failed_login_attempts = %s, locked_until = %s WHERE id = %s", (failed_attempts, locked_until_val, user["id"]))
                cur.connection.commit()
                raise HTTPException(status_code=401, detail={"code": "TOTP_INVALID", "message": "Kode autentikasi salah atau sudah digunakan. Coba kode terbaru."})
            if "totp_last_counter" in user:
                cur.execute("UPDATE app_users SET totp_last_counter = %s WHERE id = %s", (accepted_counter, user["id"]))

        # Reset failed attempts jika sukses
        if user["failed_login_attempts"] > 0 or user["locked_until"] is not None:
            cur.execute("""
                UPDATE app_users
                SET failed_login_attempts = 0, locked_until = NULL
                WHERE id = %s
            """, (user["id"],))

    # Dapatkan IP Address dan User Agent
    client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "127.0.0.1")
    if "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()
    user_agent = request.headers.get("User-Agent", "")

    # Terbitkan sesi di DB
    session_token, expires_at = create_user_session(user["id"], client_ip, user_agent)
    csrf_token = generate_secure_token(24)

    forwarded_proto = request.headers.get("X-Forwarded-Proto", "").split(",", 1)[0].strip().lower()
    is_https = request.url.scheme.lower() == "https" or forwarded_proto == "https"

    # Set Cookie Sesi (HttpOnly agar tidak bisa dicuri XSS)
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=session_token,
        max_age=settings.SESSION_EXPIRE_HOURS * 3600,
        httponly=True,
        samesite="lax",
        secure=is_https,
        path="/"
    )

    # Set Cookie CSRF (Dapat dibaca JS frontend untuk dikirim via header X-CSRF-Token)
    response.set_cookie(
        key=settings.CSRF_COOKIE_NAME,
        value=csrf_token,
        max_age=settings.SESSION_EXPIRE_HOURS * 3600,
        httponly=False,
        samesite="lax",
        secure=is_https,
        path="/"
    )

    logger.info("Pengguna '%s' berhasil login (Session ID diterbitkan)", user["username"])

    user_profile = UserProfile(
        id=user["id"],
        username=user["username"],
        full_name=user["full_name"],
        timezone=user["timezone"]
    )
    return LoginResponse(
        success=True,
        message="Login berhasil.",
        user=user_profile,
        data=user_profile,
        csrf_token=csrf_token,
        token=session_token
    )

@router.post("/register", response_model=LoginResponse)
def register(reg_data: RegisterRequest, request: Request, response: Response):
    """
    Pendaftaran akun pengguna baru mandiri:
    - Validasi nama, email, dan kata sandi (minimal 8 karakter)
    - Enkripsi password menggunakan Argon2id
    - Buat akun di app_users
    - Inisialisasi 3 rekening bawaan ('Kas Tunai', 'Bank', 'E-Wallet')
    - Inisialisasi 10 kategori standar (termasuk kategori sistem Biaya Admin)
    - Inisialisasi preferensi pengguna bawaan
    - Menerbitkan token sesi web dan login otomatis
    """
    full_name = reg_data.full_name.strip()
    email = reg_data.email.strip().lower()
    password = reg_data.password

    if not full_name:
        raise HTTPException(status_code=400, detail="Nama lengkap tidak boleh kosong.")
    if "@" not in email or "." not in email:
        raise HTTPException(status_code=400, detail="Format email tidak valid.")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Kata sandi minimal 8 karakter.")

    hashed_pw = hash_password(password)

    try:
        with get_db_cursor(commit=True) as cur:
            # Cek kolom email pada tabel app_users, jika belum ada coba tambahkan
            has_email = _has_email_column(cur)
            if not has_email:
                try:
                    cur.execute("ALTER TABLE app_users ADD COLUMN email VARCHAR(100) NULL UNIQUE AFTER full_name")
                    has_email = True
                except Exception as e:
                    logger.warning("Gagal menambahkan kolom email secara otomatis (abaikan jika keterbatasan hak akses): %s", e)

            # Cek duplikasi akun
            if has_email:
                cur.execute("SELECT id FROM app_users WHERE email = %s OR username = %s LIMIT 1", (email, email))
                if cur.fetchone():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Email atau username sudah terdaftar. Silakan login atau gunakan email lain."
                    )
            else:
                cur.execute("SELECT id FROM app_users WHERE username = %s LIMIT 1", (email,))
                if cur.fetchone():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Email atau username sudah terdaftar. Silakan login atau gunakan email lain."
                    )

            # Tentukan username unik
            email_prefix = re.sub(r'[^a-zA-Z0-9_]', '', email.split("@")[0])[:30]
            if not email_prefix:
                email_prefix = re.sub(r'[^a-zA-Z0-9_]', '', full_name.lower().replace(' ', '_'))[:30]
            if not email_prefix:
                email_prefix = "user"

            candidate_username = email_prefix
            counter = 1
            while True:
                cur.execute("SELECT id FROM app_users WHERE username = %s LIMIT 1", (candidate_username,))
                if not cur.fetchone():
                    break
                candidate_username = f"{email_prefix[:25]}_{counter}"
                counter += 1

            # Simpan pengguna baru ke app_users
            if has_email:
                cur.execute("""
                    INSERT INTO app_users (username, email, password_hash, full_name, timezone)
                    VALUES (%s, %s, %s, %s, 'Asia/Jakarta')
                """, (candidate_username, email, hashed_pw, full_name))
            else:
                chosen_username = email if len(email) <= 50 else candidate_username
                cur.execute("""
                    INSERT INTO app_users (username, password_hash, full_name, timezone)
                    VALUES (%s, %s, %s, 'Asia/Jakarta')
                """, (chosen_username, hashed_pw, full_name))

            new_user_id = cur.lastrowid

            # Inisialisasi 3 rekening bawaan
            today = date.today()
            accounts_data = [
                (new_user_id, 'Kas Tunai', 'CASH', 0.00, today),
                (new_user_id, 'Bank', 'BANK', 0.00, today),
                (new_user_id, 'E-Wallet', 'EWALLET', 0.00, today),
            ]
            cur.executemany("""
                INSERT INTO accounts (user_id, name, type, opening_balance, opening_balance_date, is_active)
                VALUES (%s, %s, %s, %s, %s, TRUE)
            """, accounts_data)

            # Inisialisasi 9 kategori standar + 1 kategori sistem Biaya Admin
            categories_data = [
                (new_user_id, 'Gaji & Pendapatan', 'INCOME', False),
                (new_user_id, 'Bonus & Freelance', 'INCOME', False),
                (new_user_id, 'Investasi & Bunga', 'INCOME', False),
                (new_user_id, 'Saldo Awal', 'INCOME', False),
                (new_user_id, 'Makanan & Minuman', 'EXPENSE', False),
                (new_user_id, 'Transportasi', 'EXPENSE', False),
                (new_user_id, 'Tagihan & Utilitas', 'EXPENSE', False),
                (new_user_id, 'Belanja Kebutuhan', 'EXPENSE', False),
                (new_user_id, 'Hiburan & Liburan', 'EXPENSE', False),
                (new_user_id, 'Biaya Admin', 'EXPENSE', True),
            ]
            cur.executemany("""
                INSERT INTO categories (user_id, name, type, is_system, is_active)
                VALUES (%s, %s, %s, %s, TRUE)
            """, categories_data)

            # Inisialisasi preferensi pengguna
            try:
                cur.execute("""
                    INSERT INTO user_preferences (user_id, preferences_json)
                    VALUES (%s, %s)
                    ON DUPLICATE KEY UPDATE preferences_json = VALUES(preferences_json)
                """, (new_user_id, json.dumps(DEFAULT_PREFERENCES)))
            except Exception as pref_err:
                logger.warning("Gagal inisialisasi user_preferences untuk user %s: %s", new_user_id, pref_err)
    except HTTPException:
        raise
    except Exception as db_err:
        err_msg = str(db_err)
        if "1142" in err_msg or "command denied" in err_msg.lower():
            logger.error("Database user 'fin_bot_app' kekurangan izin INSERT: %s", db_err)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Pendaftaran akun mandiri memerlukan izin INSERT database. Jalankan skrip 'python scripts/fix_registration_grants.py' di server untuk mengaktifkannya."
            )
        raise

    logger.info("Pengguna baru '%s' (ID: %s) berhasil mendaftar", candidate_username, new_user_id)

    user_profile = UserProfile(
        id=new_user_id,
        username=candidate_username,
        full_name=full_name,
        timezone="Asia/Jakarta"
    )
    return LoginResponse(
        success=True,
        message="Akun berhasil dibuat! Silakan masuk menggunakan email atau nama dan kata sandi Anda.",
        user=user_profile,
        data=user_profile,
        csrf_token="",
        token=None
    )

@router.post("/logout", response_model=BaseResponse)
def logout(request: Request, response: Response):
    """Mencabut sesi server-side dan membersihkan cookie browser."""
    # 1. Hapus cookie browser dengan konfigurasi lengkap (semua path dan flag secure)
    cookie_paths = ["/", settings.APP_PREFIX, f"{settings.APP_PREFIX}/", "/api", f"{settings.APP_PREFIX}/api"]
    for path in set(filter(None, cookie_paths)):
        for sec in [True, False]:
            response.delete_cookie(
                key=settings.SESSION_COOKIE_NAME,
                path=path,
                httponly=True,
                samesite="lax",
                secure=sec
            )
            response.delete_cookie(
                key=settings.CSRF_COOKIE_NAME,
                path=path,
                httponly=False,
                samesite="lax",
                secure=sec
            )

    # 2. Hapus sesi server-side dari database secara aman (dukung cookie dan header Bearer)
    session_token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ", 1)[1].strip()

    if session_token:
        try:
            invalidate_user_session(session_token)
        except Exception as e:
            logger.warning("Gagal menghapus web_sessions dari database saat logout: %s", e)

    return BaseResponse(success=True, message="Logout berhasil. Sesi telah dicabut.")



@router.get("/me", response_model=DataResponse[UserProfile])
def get_current_user_profile(user: dict = Depends(get_current_user)):
    """Mengembalikan data profil pengguna yang sedang login aktif."""
    return DataResponse(
        success=True,
        message="Profil pengguna aktif diperoleh.",
        data=UserProfile(
            id=user["id"],
            username=user["username"],
            full_name=user["full_name"],
            timezone=user["timezone"]
        )
    )


@router.get("/sessions", response_model=DataResponse[list])
def list_user_sessions(user: dict = Depends(get_current_user)):
    """Menampilkan sesi milik pengguna saat ini tanpa membocorkan token sesi."""
    with get_db_cursor(commit=False) as cur:
        cur.execute("""
            SELECT id, ip_address, user_agent, created_at, last_accessed_at, expires_at
            FROM web_sessions
            WHERE user_id = %s AND expires_at > UTC_TIMESTAMP()
            ORDER BY last_accessed_at DESC
        """, (user["id"],))
        sessions = cur.fetchall()
    for session in sessions:
        session["is_current"] = session["id"] == user.get("session_id")
        # Return only a masked address in the UI; never return the session token/hash.
        ip = session.get("ip_address") or ""
        if "." in ip:
            parts = ip.split(".")
            session["ip_address"] = ".".join(parts[:2] + ["•", "•"]) if len(parts) == 4 else ip
        elif ":" in ip:
            session["ip_address"] = "IPv6"
    return DataResponse(success=True, message="Daftar sesi aktif.", data=sessions)


@router.delete("/sessions/{session_id}", response_model=BaseResponse)
def revoke_user_session(session_id: int, user: dict = Depends(get_current_user)):
    """Mencabut sesi lain milik pengguna. Sesi yang sedang dipakai tidak dapat dicabut di sini."""
    if session_id == user.get("session_id"):
        raise HTTPException(status_code=400, detail="Gunakan tombol Keluar untuk mengakhiri sesi saat ini.")
    with get_db_cursor(commit=True) as cur:
        cur.execute("DELETE FROM web_sessions WHERE id = %s AND user_id = %s", (session_id, user["id"]))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Sesi tidak ditemukan atau sudah dicabut.")
    return BaseResponse(success=True, message="Sesi perangkat berhasil dicabut.")


DEFAULT_PREFERENCES = {
    "budget-alert": True,
    "monthly-summary": True,
    "savings-reminder": False,
    "currency-format": True,
}


@router.get("/preferences", response_model=DataResponse[dict])
def get_user_preferences(user: dict = Depends(get_current_user)):
    """Memuat preferensi tersimpan; fallback default untuk pengguna lama."""
    preferences = dict(DEFAULT_PREFERENCES)
    try:
        with get_db_cursor(commit=False) as cur:
            cur.execute("SELECT preferences_json FROM user_preferences WHERE user_id = %s", (user["id"],))
            row = cur.fetchone()
        if row and row.get("preferences_json"):
            stored = row["preferences_json"]
            if isinstance(stored, str):
                stored = json.loads(stored)
            preferences.update({k: bool(v) for k, v in stored.items() if k in DEFAULT_PREFERENCES})
    except Exception as e:
        logger.warning("user_preferences table query failed: %s", e)
    return DataResponse(success=True, message="Preferensi pengguna.", data=preferences)


@router.put("/preferences", response_model=DataResponse[dict])
def update_user_preferences(payload: dict, user: dict = Depends(get_current_user)):
    """Menyimpan preferensi yang didukung tanpa menerima key arbitrer."""
    if not isinstance(payload, dict) or not payload or any(k not in DEFAULT_PREFERENCES or not isinstance(v, bool) for k, v in payload.items()):
        raise HTTPException(status_code=422, detail="Preferensi tidak valid.")
    preferences = dict(DEFAULT_PREFERENCES)
    try:
        with get_db_cursor(commit=True) as cur:
            cur.execute("SELECT preferences_json FROM user_preferences WHERE user_id = %s", (user["id"],))
            row = cur.fetchone()
            if row and row.get("preferences_json"):
                stored = row["preferences_json"]
                if isinstance(stored, str):
                    stored = json.loads(stored)
                preferences.update({k: bool(v) for k, v in stored.items() if k in DEFAULT_PREFERENCES})
            preferences.update(payload)
            cur.execute("""
                INSERT INTO user_preferences (user_id, preferences_json)
                VALUES (%s, %s)
                ON DUPLICATE KEY UPDATE preferences_json = VALUES(preferences_json), updated_at = CURRENT_TIMESTAMP
            """, (user["id"], json.dumps(preferences)))
    except Exception as e:
        logger.warning("user_preferences table save failed: %s", e)
        preferences.update(payload)
    return DataResponse(success=True, message="Preferensi disimpan.", data=preferences)


@router.get("/2fa", response_model=DataResponse[dict])
def get_two_factor_status(user: dict = Depends(get_current_user)):
    enabled = False
    try:
        with get_db_cursor(commit=False) as cur:
            cur.execute("SELECT * FROM app_users WHERE id = %s", (user["id"],))
            row = cur.fetchone()
            if row and row.get("totp_enabled"):
                enabled = bool(row["totp_enabled"])
    except Exception as e:
        logger.warning("Query totp_enabled failed: %s", e)
    return DataResponse(success=True, message="Status autentikasi dua faktor.", data={"enabled": enabled})


@router.post("/2fa/setup", response_model=DataResponse[dict])
def begin_two_factor_setup(user: dict = Depends(get_current_user)):
    try:
        with get_db_cursor(commit=False) as cur:
            cur.execute("SELECT * FROM app_users WHERE id = %s", (user["id"],))
            row = cur.fetchone()
        if row and row.get("totp_enabled"):
            raise HTTPException(status_code=409, detail="Autentikasi dua faktor sudah aktif.")
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("Query totp_enabled failed: %s", e)
    secret = generate_totp_secret()
    label = quote(f"Finance AI Agent:{user['username']}")
    uri = f"otpauth://totp/{label}?secret={secret}&issuer=Finance%20AI%20Agent&algorithm=SHA1&digits=6&period=30"
    return DataResponse(success=True, message="Pindai atau masukkan secret ke aplikasi authenticator, lalu verifikasi kodenya.", data={"secret": secret, "otpauth_uri": uri})


@router.post("/2fa/enable", response_model=BaseResponse)
def enable_two_factor(payload: TwoFactorEnableRequest, user: dict = Depends(get_current_user)):
    counter = verify_totp(payload.secret, payload.code)
    if counter is None:
        raise HTTPException(status_code=400, detail="Kode TOTP belum valid. Periksa waktu perangkat dan coba kode terbaru.")
    encrypted_secret = encrypt_totp_secret(payload.secret)
    try:
        with get_db_cursor(commit=True) as cur:
            cur.execute("""
                UPDATE app_users
                SET totp_secret_ciphertext = %s, totp_enabled = TRUE, totp_last_counter = %s
                WHERE id = %s
            """, (encrypted_secret, counter, user["id"]))
            if cur.rowcount == 0:
                raise HTTPException(status_code=409, detail="Gagal mengaktifkan 2FA.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Database update 2FA failed: %s", e)
        raise HTTPException(status_code=500, detail="Database belum mendukung 2FA (memerlukan migrasi).")
    return BaseResponse(success=True, message="Autentikasi dua faktor aktif.")


@router.post("/2fa/disable", response_model=BaseResponse)
def disable_two_factor(payload: TwoFactorDisableRequest, user: dict = Depends(get_current_user)):
    try:
        with get_db_cursor(commit=True) as cur:
            cur.execute("SELECT * FROM app_users WHERE id = %s", (user["id"],))
            row = cur.fetchone()
            if not row or not row.get("totp_enabled"):
                raise HTTPException(status_code=409, detail="Autentikasi dua faktor belum aktif.")
            if not verify_password(payload.password, row["password_hash"]):
                raise HTTPException(status_code=401, detail="Kata sandi salah.")
            secret = decrypt_totp_secret(row["totp_secret_ciphertext"])
            counter = verify_totp(secret, payload.code, row.get("totp_last_counter"))
            if counter is None:
                raise HTTPException(status_code=401, detail="Kode autentikasi salah atau sudah digunakan.")
            cur.execute("UPDATE app_users SET totp_secret_ciphertext = NULL, totp_enabled = FALSE, totp_last_counter = NULL WHERE id = %s", (user["id"],))
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Database disable 2FA failed: %s", e)
        raise HTTPException(status_code=500, detail="Gagal menonaktifkan 2FA.")
    return BaseResponse(success=True, message="Autentikasi dua faktor dinonaktifkan.")


@router.post("/change-password", response_model=BaseResponse)
def change_password(payload: ChangePasswordRequest, user: dict = Depends(get_current_user)):
    with get_db_cursor(commit=True) as cur:
        cur.execute("SELECT password_hash FROM app_users WHERE id = %s", (user["id"],))
        row = cur.fetchone()
        if not row or not verify_password(payload.current_password, row["password_hash"]):
            raise HTTPException(status_code=401, detail="Kata sandi saat ini salah.")
        if verify_password(payload.new_password, row["password_hash"]):
            raise HTTPException(status_code=400, detail="Gunakan kata sandi baru yang berbeda.")
        cur.execute("UPDATE app_users SET password_hash = %s WHERE id = %s", (hash_password(payload.new_password), user["id"]))
        cur.execute("DELETE FROM web_sessions WHERE user_id = %s AND id <> %s", (user["id"], user.get("session_id")))
    return BaseResponse(success=True, message="Kata sandi berubah. Sesi pada perangkat lain telah dicabut.")


@router.patch("/profile", response_model=DataResponse[UserProfile])
def update_profile(payload: UpdateProfileRequest, user: dict = Depends(get_current_user)):
    full_name = payload.full_name.strip()
    if not full_name:
        raise HTTPException(status_code=422, detail="Nama tidak boleh kosong.")
    with get_db_cursor(commit=True) as cur:
        cur.execute("UPDATE app_users SET full_name = %s WHERE id = %s", (full_name, user["id"]))
        cur.execute("SELECT id, username, full_name, timezone FROM app_users WHERE id = %s", (user["id"],))
        row = cur.fetchone()
    profile = UserProfile(**row)
    return DataResponse(success=True, message="Nama profil disimpan.", data=profile)
