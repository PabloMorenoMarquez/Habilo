from fastapi import APIRouter, HTTPException, Depends
from utils.auth_middleware import get_current_user
from schemas.usuario_schema import ActualizarUsuario, UsuarioOut
from services.user_service import UserService
from schemas.bloqueo_schema import BloquearUsuario, UsuarioBloqueadoOut
from services.bloqueo_service import BloqueoService
from uuid import UUID
from typing import List

router = APIRouter(prefix="/usuarios", tags=["usuarios"])


@router.get("/me", response_model=UsuarioOut)
async def obtener_perfil(current_user=Depends(get_current_user)):
    usuario_id = current_user["user_id"]
    service = UserService()
    usuario = service.obtener(usuario_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario


@router.patch("/me", response_model=UsuarioOut)
async def actualizar_perfil(datos: ActualizarUsuario, current_user=Depends(get_current_user)):
    usuario_id = current_user["user_id"]
    service = UserService()
    usuario = service.actualizar(usuario_id, **datos.model_dump(exclude_none=True))
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario

@router.post("/bloquear")
async def bloquear_usuario(datos: BloquearUsuario, current_user=Depends(get_current_user)):
    service = BloqueoService()
    service.bloquear(current_user["user_id"], datos.usuario_id)
    return {"ok": True}

@router.delete("/bloquear/{usuario_id}")
async def desbloquear_usuario(usuario_id: UUID, current_user=Depends(get_current_user)):
    service = BloqueoService()
    eliminado = service.desbloquear(current_user["user_id"], usuario_id)
    if not eliminado:
        raise HTTPException(status_code=404, detail="No tenías bloqueada a esta persona")
    return {"ok": True}

@router.get("/bloqueados", response_model=List[UsuarioBloqueadoOut])
async def listar_mis_bloqueados(current_user=Depends(get_current_user)):
    service = BloqueoService()
    return service.listar_bloqueados(current_user["user_id"])
