from fastapi import APIRouter, HTTPException, Depends
from uuid import UUID
from utils.auth_middleware import get_current_user
from schemas.proveedor_schema import CrearPerfilProveedor, ConfirmarDocumento, PerfilProveedorOut, ActualizarPerfilProveedor, PerfilProveedorPublico
from services.proveedor_service import ProveedorService
from utils.storage import generar_signed_upload_url
from config import Config

router = APIRouter(prefix="/proveedor", tags=["proveedor"])


@router.post("/", response_model=PerfilProveedorOut)
async def crear_proveedor(perfil: CrearPerfilProveedor, current_user=Depends(get_current_user)):
    user_id = current_user["user_id"]
    service = ProveedorService()
    resultado = service.create_or_update(user_id, perfil.descripcion, perfil.radio_km_disponible, perfil.experiencia_años)
    return resultado

@router.patch("/", response_model=PerfilProveedorOut)
async def actualizar_perfil(datos: ActualizarPerfilProveedor, current_user=Depends(get_current_user)):
    usuario_id = current_user["user_id"]
    service = ProveedorService()
    perfil = service.obtener_por_usuario(usuario_id)
    if not perfil:
        raise HTTPException(status_code=404, detail="No tienes perfil de proveedor")
    return service.actualizar_perfil(perfil.id, **datos.model_dump(exclude_none=True))


@router.get("/me", response_model=PerfilProveedorOut)
async def obtener_mi_perfil_proveedor(current_user=Depends(get_current_user)):
    user_id = current_user["user_id"]
    service = ProveedorService()
    perfil = service.obtener_por_usuario(user_id)
    if not perfil:
        raise HTTPException(status_code=404, detail="No tienes perfil de proveedor activo")
    return perfil


@router.get("/documento")
async def ver_mi_documento(current_user=Depends(get_current_user)):
    usuario_id = current_user["user_id"]
    service = ProveedorService()
    url = service.obtener_url_documento_por_usuario(usuario_id)
    return {
        "url": url
    }

@router.get("/{perfil_id}", response_model=PerfilProveedorPublico)
async def obtener_perfil_proveedor(perfil_id: UUID):
    service = ProveedorService()
    perfil = service.obtener_por_id(perfil_id)
    if not perfil:
        raise HTTPException(status_code=404, detail="Perfil de proveedor no encontrado")
    return perfil


@router.post("/documento/signed-url")
async def signed_url_documento(current_user=Depends(get_current_user)):
    usuario_id = current_user["user_id"]
    service = ProveedorService()
    perfil = service.obtener_por_usuario(usuario_id)
    if not perfil:
        raise HTTPException(status_code=404, detail="No tienes perfil de proveedor")
    path = f"{usuario_id}/documento"
    return generar_signed_upload_url(Config.STORAGE_BUCKET_DOCUMENTOS, path)


@router.patch("/documento/confirmar")
async def confirmar_documento(datos: ConfirmarDocumento, current_user=Depends(get_current_user)):
    usuario_id = current_user["user_id"]

    path_esperado = f"{usuario_id}/documento"
    if datos.path != path_esperado:
        raise HTTPException(status_code=400, detail="Path de documento no válido")

    service = ProveedorService()
    perfil = service.obtener_por_usuario(usuario_id)
    if not perfil:
        raise HTTPException(status_code=404, detail="No tienes perfil de proveedor")
    actualizado = service.actualizar_documento(perfil.id, datos.path)
    return {"path": actualizado.url_documento}

@router.post("/stripe/onboarding-link")
async def crear_link_onboarding(current_user=Depends(get_current_user)):
    from repositories.user_repository import UserRepository

    usuario_id = current_user["user_id"]
    usuario = UserRepository().get_by_id(usuario_id)

    service = ProveedorService()
    url = service.iniciar_onboarding_stripe(
        usuario_id,
        usuario.email,
        frontend_return_url=f"{Config.FRONTEND_URL}/dashboard?onboarding=completado",
        frontend_refresh_url=f"{Config.FRONTEND_URL}/dashboard?onboarding=refrescar",
    )
    return {"url": url}

@router.post("/verificacion-identidad")
async def iniciar_verificacion_identidad(current_user=Depends(get_current_user)):
    service = ProveedorService()
    client_secret = service.iniciar_verificacion_identidad(current_user["user_id"])
    return {"client_secret": client_secret}

