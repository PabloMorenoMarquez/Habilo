from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware
import os
from dotenv import load_dotenv

from routers.auth import router as auth_router
from routers.usuarios import router as usuarios_router
from routers.proveedores import router as proveedor_router
from routers.servicios import router as servicio_router
from routers.categorias import router as categorias_router
from routers.solicitudes import router as solicitudes_router
from routers.mensajes import router as mensajes_router
from routers.valoraciones import router as valoraciones_router
from utils.google_oauth import google_configure_oauth
from utils.facebook_oauth import facebook_configure_oauth

load_dotenv()

app = FastAPI()

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET_KEY", "dev-secret-change-me"),
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


