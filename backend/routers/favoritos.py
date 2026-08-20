from fastapi import APIRouter, HTTPException, Depends, Query, Request
from uuid import UUID
from typing import List, Optional
from utils.auth_middleware import get_current_user
from services.favorito_service import FavoritoService
from config import Config
import uuid
from utils.rate_limiter import limiter

router = APIRouter(prefix="/favoritos", tags=["favoritos"])

@router.post("/servicios/{servicio_id}")
@limiter.limit("30/minute")
async def marcar_servicio(request: Request, servicio_id:UUID, current_user=Depends(get_current_user)):
    service = FavoritoService()
    service.marcar_servicio(current_user["user_id"], servicio_id)
    return {"ok": True}

@router.delete("/servicios/{servicio_id}")
@limiter.limit("30/minute")
async def desmarcar_servicio(request: Request, servicio_id:UUID, current_user=Depends(get_current_user)):
    service = FavoritoService()
    return service.desmarcar_servicio(current_user["user_id"], servicio_id)

@router.get("/servicios")
async def listar_servicios(current_user=Depends(get_current_user)):
    service = FavoritoService()
    return service.listar_servicios_favoritos(current_user["user_id"])

@router.post("/proveedores/{perfil_id}")
@limiter.limit("30/minute")
async def marcar_proveedor(request: Request, perfil_id:UUID, current_user=Depends(get_current_user)):
    service = FavoritoService()
    service.marcar_proveedor(current_user["user_id"], perfil_id)
    return {"ok": True}

@router.delete("/proveedores/{perfil_id}")
@limiter.limit("30/minute")
async def desmarcar_proveedor(request: Request, perfil_id:UUID, current_user=Depends(get_current_user)):
    service = FavoritoService()
    return service.desmarcar_proveedor(current_user["user_id"], perfil_id)

@router.get("/proveedores")
async def listar_proveedores(current_user=Depends(get_current_user)):
    service = FavoritoService()
    return service.listar_proveedores_favoritos(current_user["user_id"])