import hashlib
import hmac
import secrets
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from fastapi import Request, HTTPException, status, Depends
from passlib.context import CryptContext
from app.core.config import settings
from app.core.database import get_db_cursor

logger = logging.getLogger("personal_finance.security")

pwd_context = CryptContext(
    schemes=["argon2", "pbkdf2_sha256", "bcrypt"],
    deprecated="auto"
)

def hash_password(password: str) -> str:
    """Mengenkripsi password menggunakan algoritma hashing standar (Argon2id default)."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Memverifikasi kecocokan password secara fleksibel terhadap hash yang tersimpan."""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.warning("Verifikasi password gagal memicu exception: %s", e)
        return False


def generate_secure_token(nbytes: int = 32) -> str:
    """Menghasilkan random cryptographic token URL-safe."""
    return secrets.token_urlsafe(nbytes)

def hash_token(token: str) -> str:
    """Mengubah token plain menjadi hash SHA-256 (64 hex karakter)."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

def create_user_session(user_id: int, ip_address: str, user_agent: Optional[str] = None) -> tuple[str, datetime]:
    """
    Membuat sesi baru di tabel web_sessions.
    Mengembalikan tuple (plain_token, expires_at_utc).
    """
    plain_token = generate_secure_token(32)
    token_hash = hash_token(plain_token)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.SESSION_EXPIRE_HOURS)
    
    # Format DATETIME untuk MySQL: 'YYYY-MM-DD HH:MM:SS'
    expires_at_str = expires_at.strftime("%Y-%m-%d %H:%M:%S")

    ua = (user_agent or "")[:255]
    ip = (ip_address or "127.0.0.1")[:45]

    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            INSERT INTO web_sessions (user_id, session_token_hash, ip_address, user_agent, expires_at)
            VALUES (%s, %s, %s, %s, %s)
        """, (user_id, token_hash, ip, ua, expires_at_str))

    return plain_token, expires_at

def invalidate_user_session(plain_token: str) -> bool:
    """Mencabut (logout) sesi dari server-side database."""
    token_hash = hash_token(plain_token)
    with get_db_cursor(commit=True) as cur:
        cur.execute("DELETE FROM web_sessions WHERE session_token_hash = %s", (token_hash,))
        return cur.rowcount > 0

def get_current_user_from_token(plain_token: str) -> Optional[Dict[str, Any]]:
    """
    Validasi token sesi:
    1. Cek kecocokan hash token di tabel web_sessions.
    2. Cek apakah sesi belum kedaluwarsa (expires_at > UTC).
    3. Ambil data profil app_users (id, username, full_name, timezone, is_active).
    """
    if not plain_token:
        return None

    token_hash = hash_token(plain_token)
    now_utc_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    with get_db_cursor(commit=False) as cur:
        cur.execute("""
            SELECT s.id as session_id, s.user_id, s.expires_at,
                   u.username, u.full_name, u.timezone, u.is_active, u.locked_until
            FROM web_sessions s
            JOIN app_users u ON s.user_id = u.id
            WHERE s.session_token_hash = %s
              AND s.expires_at > %s
              AND u.is_active = TRUE
        """, (token_hash, now_utc_str))
        row = cur.fetchone()

        if not row:
            return None

        # Cek status lockout user
        if row["locked_until"] and row["locked_until"] > datetime.now(timezone.utc).replace(tzinfo=None):
            logger.warning("Akses ditolak: user ID %s terkunci hingga %s", row["user_id"], row["locked_until"])
            return None

        return {
            "id": row["user_id"],
            "session_id": row["session_id"],
            "username": row["username"],
            "full_name": row["full_name"],
            "timezone": row["timezone"],
        }

async def get_current_user(request: Request) -> Dict[str, Any]:
    """FastAPI Dependency: Memeriksa cookie sesi dan memverifikasi pengguna aktif."""
    token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesi tidak ditemukan atau telah kedaluwarsa. Silakan login kembali."
        )

    user = get_current_user_from_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesi login tidak sah atau telah dibatalkan."
        )
    return user

def verify_csrf(request: Request):
    """
    Validasi Double-Submit CSRF Token:
    Hanya memeriksa request mutasi data (POST, PUT, PATCH, DELETE).
    """
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return

    # Sesi login dan logout dikecualikan dari header CSRF (karena pembentukan sesi baru)
    if request.url.path in (
        f"{settings.APP_PREFIX}/api/auth/login",
        f"{settings.APP_PREFIX}/api/auth/logout"
    ):
        return

    cookie_csrf = (
        request.cookies.get(settings.CSRF_COOKIE_NAME) or 
        request.cookies.get("pf_csrf") or 
        request.cookies.get("csrf_token")
    )
    header_csrf = request.headers.get("X-CSRF-Token")

    if not cookie_csrf or not header_csrf:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Proteksi CSRF: Token CSRF tidak ditemukan."
        )

    if not hmac.compare_digest(cookie_csrf, header_csrf):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Proteksi CSRF: Token CSRF tidak cocok."
        )
