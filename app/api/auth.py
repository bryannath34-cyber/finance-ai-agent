import logging
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, status, Request, Response, Depends
from app.core.config import settings
from app.core.database import get_db_cursor
from app.core.security import (
    verify_password,
    create_user_session,
    invalidate_user_session,
    generate_secure_token,
    get_current_user,
)
from app.schemas.auth import LoginRequest, LoginResponse, UserProfile
from app.schemas.common import BaseResponse, DataResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger("personal_finance.auth")

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15

@router.post("/login", response_model=LoginResponse)
def login(login_data: LoginRequest, request: Request, response: Response):
    """
    Otentikasi pengguna web:
    - Memverifikasi username dan hash password Argon2id
    - Memeriksa batasan percobaan login gagal (lockout 15 menit jika 5x gagal)
    - Menerbitkan token sesi web server-side di tabel web_sessions
    - Mengatur HttpOnly Session Cookie dan Anti-CSRF Cookie
    """
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    now_utc_str = now_utc.strftime("%Y-%m-%d %H:%M:%S")

    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            SELECT id, username, password_hash, full_name, timezone,
                   failed_login_attempts, locked_until, is_active
            FROM app_users
            WHERE username = %s
        """, (login_data.username,))
        user = cur.fetchone()

        if not user:
            logger.warning("Upaya login gagal: username '%s' tidak ditemukan", login_data.username)
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

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Username atau password salah."
            )

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

    is_https = (
        request.url.scheme == "https" or 
        request.headers.get("X-Forwarded-Proto") == "https"
    )

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
        csrf_token=csrf_token
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

    # 2. Hapus sesi server-side dari database secara aman
    session_token = request.cookies.get(settings.SESSION_COOKIE_NAME)
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
