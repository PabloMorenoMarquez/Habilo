from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from config import Config
from contextlib import asynccontextmanager

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
from utils.google_oauth import google_configure_oauth
from utils.facebook_oauth import facebook_configure_oauth
from utils.scheduler import iniciar_jobs

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = iniciar_jobs()
    
    yield
    
    scheduler.shutdown()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET_KEY", "dev-secret-change-me"),
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.FRONTEND_URL,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
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


