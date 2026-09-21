from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware
from fastapi.middleware.cors import CORSMiddleware
import os
import logging
from dotenv import load_dotenv
from config import Config
from contextlib import asynccontextmanager
from database.engine import engine
from sqlalchemy import text
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

from routers.auth import router as auth_router
from routers.usuarios import router as usuarios_router
from routers.proveedores import router as proveedor_router
from routers.servicios import router as servicio_router
from routers.categorias import router as categorias_router
from routers.solicitudes import router as solicitudes_router
from routers.mensajes import router as mensajes_router
from routers.valoraciones import router as valoraciones_router
from routers.reportes import router as reportes_router
from routers.admin import router as admin_router
from routers.webhooks import router as webhooks_router
from routers.ofertas import router as ofertas_router
from routers.favoritos import router as favoritos_router
from routers.suscripcion_push import router as suscripcion_push_router
from routers.config import router as config_router
from routers.feedback import router as feedback_router
from utils.google_oauth import google_configure_oauth
from utils.facebook_oauth import facebook_configure_oauth
from utils.scheduler import iniciar_jobs
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from utils.rate_limiter import limiter
from slowapi.middleware import SlowAPIMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import sentry_sdk
load_dotenv()
import logging
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = iniciar_jobs()
    
    yield
    
    scheduler.shutdown()
    
sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    environment=os.getenv("ENVIRONMENT", "production"),
    traces_sample_rate=0.2,
)

app = FastAPI(lifespan=lifespan)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Excepción no controlada en {request.url}: {exc}", exc_info=True)
    sentry_sdk.capture_exception(exc)

    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno del servidor"}
    )
app.state.limiter = limiter
app.add_middleware(GZipMiddleware, minimum_size=1000, compresslevel=6)
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

session_secret = os.getenv("SESSION_SECRET_KEY")
if not session_secret:
    raise RuntimeError("SESSION_SECRET_KEY no está definida")

app.add_middleware(
    SessionMiddleware,
    secret_key=session_secret,
    same_site="lax",
    https_only=os.getenv("ENVIRONMENT", "development").lower() == "production",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.FRONTEND_URLS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

log_level = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=log_level,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)



google_configure_oauth(app)
facebook_configure_oauth(app)
app.include_router(auth_router)
app.include_router(usuarios_router)
app.include_router(proveedor_router)
app.include_router(servicio_router)
app.include_router(categorias_router)
app.include_router(solicitudes_router)
app.include_router(mensajes_router)
app.include_router(valoraciones_router)
app.include_router(reportes_router)
app.include_router(admin_router)
app.include_router(webhooks_router)
app.include_router(ofertas_router)
app.include_router(favoritos_router)
app.include_router(suscripcion_push_router)
app.include_router(config_router)
app.include_router(feedback_router)
@app.get("/health")
async def health_check():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception:
        raise HTTPException(status_code=503, detail="unhealthy")


