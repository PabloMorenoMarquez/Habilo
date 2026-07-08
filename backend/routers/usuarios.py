from fastapi import APIRouter, HTTPException, Depends
from utils.auth_middleware import get_current_user
from schemas.usuario_schema import ActualizarUsuario, UsuarioOut
from services.user_service import UserService

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
