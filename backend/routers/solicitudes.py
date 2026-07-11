from fastapi import APIRouter, HTTPException, Depends
from uuid import UUID
from typing import List
from utils.auth_middleware import get_current_user
from schemas.solicitud_schema import CrearSolicitud, CambiarEstadoSolicitud, SolicitudOut, ConversacionOut
from services.solicitud_service import SolicitudService
from services.proveedor_service import ProveedorService

router = APIRouter(prefix="/solicitudes", tags=["solicitudes"])


@router.post("/", response_model=SolicitudOut)
async def crear_solicitud(datos: CrearSolicitud, current_user=Depends(get_current_user)):
    service = SolicitudService()
    return service.crear(datos.servicio_id, current_user["user_id"])


@router.get("/", response_model=List[SolicitudOut])
async def listar_solicitudes(current_user=Depends(get_current_user)):
    usuario_id = current_user["user_id"]
    proveedor_service = ProveedorService()
    perfil = proveedor_service.obtener_por_usuario(usuario_id)
    service = SolicitudService()
    return service.listar_mias(usuario_id, perfil.id if perfil else None)

@router.get("/conversaciones", response_model=List[ConversacionOut])
async def listar_conversaciones(current_user=Depends(get_current_user)):
    service = SolicitudService()
    return service.listar_conversaciones(current_user["user_id"])


@router.get("/{solicitud_id}", response_model=SolicitudOut)
async def obtener_solicitud(solicitud_id: UUID, current_user=Depends(get_current_user)):
    usuario_id = current_user["user_id"]
    proveedor_service = ProveedorService()
    perfil = proveedor_service.obtener_por_usuario(usuario_id)
    service = SolicitudService()
    return service.obtener(solicitud_id, usuario_id, perfil.id if perfil else None)


@router.patch("/{solicitud_id}/estado", response_model=SolicitudOut)
async def cambiar_estado(solicitud_id: UUID, datos: CambiarEstadoSolicitud, current_user=Depends(get_current_user)):
    usuario_id = current_user["user_id"]
    proveedor_service = ProveedorService()
    perfil = proveedor_service.obtener_por_usuario(usuario_id)
    if not perfil:
        raise HTTPException(status_code=403, detail="Solo proveedores pueden cambiar el estado")
    service = SolicitudService()
    return service.cambiar_estado(solicitud_id, datos.estado.value, perfil.id)
