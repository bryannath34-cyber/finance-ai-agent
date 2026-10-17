import os
import logging
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db_pool
from app.core.security import verify_csrf
from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.accounts import router as accounts_router
from app.api.categories import router as categories_router
from app.api.transactions import router as transactions_router
from app.api.ai import router as ai_router
from app.api.speech import router as speech_router

logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("personal_finance.main")

app = FastAPI(
    title="Personal Finance AI Agent",
    description="Sistem Keuangan Pribadi Mandiri Berbasis OCI Native AI & HeatWave DB System",
    version="2.3.0",
    docs_url=f"{settings.APP_PREFIX}/api/docs",
    redoc_url=f"{settings.APP_PREFIX}/api/redoc",
    openapi_url=f"{settings.APP_PREFIX}/api/openapi.json"
)

# 1. Middleware Anti-CSRF
@app.middleware("http")
async def csrf_middleware(request: Request, call_next):
    try:
        verify_csrf(request)
    except HTTPException as exc:
        return JSONResponse(
            status_code=exc.status_code,
            content={"success": False, "message": exc.detail, "detail": exc.detail}
        )
    response = await call_next(request)
    return response

# 2. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_hosts_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Startup & Shutdown Events
@app.on_event("startup")
def startup_event():
    logger.info("Memulai aplikasi Personal Finance AI Agent (Prefix: %s)...", settings.APP_PREFIX)
    try:
        init_db_pool()
        logger.info("✅ Database pool berhasil diinisialisasi.")
    except Exception as e:
        logger.error("❌ Gagal menginisialisasi database pool pada startup: %s", e)

# 4. Registrasi Router API
app.include_router(health_router, prefix=f"{settings.APP_PREFIX}/api")
app.include_router(auth_router, prefix=f"{settings.APP_PREFIX}/api")
app.include_router(accounts_router, prefix=f"{settings.APP_PREFIX}/api")
app.include_router(categories_router, prefix=f"{settings.APP_PREFIX}/api")
app.include_router(transactions_router, prefix=f"{settings.APP_PREFIX}/api")
app.include_router(ai_router, prefix=f"{settings.APP_PREFIX}/api")
app.include_router(speech_router, prefix=f"{settings.APP_PREFIX}/api")

# Probe fallback untuk OCI Load Balancer probe default (/health)
@app.api_route("/health", methods=["GET", "HEAD"], include_in_schema=False)
def root_health():
    """Probe endpoint untuk OCI Load Balancer backend set default."""
    return {"status": "ok"}

# 5. Static Files & Single Page Application (SPA) Serving
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(STATIC_DIR, exist_ok=True)

app.mount(f"{settings.APP_PREFIX}/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.api_route(f"{settings.APP_PREFIX}", methods=["GET", "HEAD"], response_class=HTMLResponse)
@app.api_route(f"{settings.APP_PREFIX}/", methods=["GET", "HEAD"], response_class=HTMLResponse)
def serve_index():
    """Menyajikan halaman antarmuka web SPA tunggal."""
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return HTMLResponse(
        content="<h2>Personal Finance AI Agent</h2><p>Antarmuka web sedang disiapkan...</p>",
        status_code=200
    )

@app.get("/", include_in_schema=False)
def root_redirect():
    """Mengarahkan traffic root langsung ke prefix aplikasi /finance."""
    return RedirectResponse(url=f"{settings.APP_PREFIX}/")

