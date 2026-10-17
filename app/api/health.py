import logging
from fastapi import APIRouter
from app.core.config import settings
from app.core.database import get_db_cursor
from app.schemas.common import HealthResponse

router = APIRouter(tags=["Health"])
logger = logging.getLogger("personal_finance.health")

@router.get("/health", response_model=HealthResponse)
def health_check():
    """
    Endpoint health check untuk OCI Load Balancer (pf-agent-bs) dan monitoring sistem.
    Melakukan kueri ringan ke MySQL DB System untuk memverifikasi ketersediaan koneksi database.
    """
    db_status = "connected"
    try:
        with get_db_cursor(commit=False) as cur:
            cur.execute("SELECT 1 as is_alive")
            row = cur.fetchone()
            if not row or row["is_alive"] != 1:
                db_status = "unresponsive"
    except Exception as e:
        logger.error("Health check database gagal: %s", e)
        db_status = f"disconnected ({str(e)})"

    return HealthResponse(
        status="ok" if db_status == "connected" else "degraded",
        database=db_status,
        app_prefix=settings.APP_PREFIX,
        version="2.3.0"
    )
