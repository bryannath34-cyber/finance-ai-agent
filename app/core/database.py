import logging
from contextlib import contextmanager
from typing import Generator
import pymysql
from pymysql.cursors import DictCursor
from dbutils.pooled_db import PooledDB
from app.core.config import settings

logger = logging.getLogger("personal_finance.database")

_pool: PooledDB = None

def init_db_pool() -> PooledDB:
    global _pool
    if _pool is None:
        logger.info(
            "Menginisialisasi Database Connection Pool: %s:%s (DB: %s, User: %s)",
            settings.DB_HOST,
            settings.DB_PORT,
            settings.DB_NAME,
            settings.DB_USER,
        )
        _pool = PooledDB(
            creator=pymysql,
            mincached=settings.DB_POOL_MIN,
            maxcached=settings.DB_POOL_MAX,
            maxconnections=settings.DB_POOL_MAX + 15,
            blocking=True,
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            database=settings.DB_NAME,
            charset="utf8mb4",
            cursorclass=DictCursor,
            ssl={"check_hostname": False},
            autocommit=False,
            connect_timeout=10,
            read_timeout=30,
            write_timeout=30,
            # Wajib sinkronisasi zona waktu UTC pada setiap sesi baru
            setsession=["SET time_zone = '+00:00'"]
        )
    return _pool

def get_db_pool() -> PooledDB:
    global _pool
    if _pool is None:
        return init_db_pool()
    return _pool

@contextmanager
def get_db_connection() -> Generator[pymysql.Connection, None, None]:
    """Context manager untuk mendapatkan koneksi database dari pool dengan jaminan commit/rollback."""
    pool = get_db_pool()
    conn = pool.connection()
    try:
        yield conn
    except Exception:
        try:
            conn.rollback()
        except Exception:
            pass
        raise
    finally:
        try:
            conn.rollback()
        except Exception:
            pass
        conn.close()

@contextmanager
def get_db_cursor(commit: bool = True) -> Generator[DictCursor, None, None]:
    """Context manager praktis untuk eksekusi kueri langsung via DictCursor."""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            try:
                yield cur
                if commit:
                    conn.commit()
                else:
                    conn.rollback()
            except Exception:
                try:
                    conn.rollback()
                except Exception:
                    pass
                raise
