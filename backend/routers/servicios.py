from fastapi import APIRouter, HTTPException, Depends, Query, Request
from uuid import UUID
from typing import List, Optional
from utils.auth_middleware import get_current_user
from schemas.servicio_schema import CrearServicio, ActualizarServicio, ServicioOut, ServicioBusquedaOut, ServicioSitemapOut, CrearImagenServicio, ReordenarImagenes
from services.servicio_service import ServicioService
from services.proveedor_service import ProveedorService
from services.imagen_servicio_service import ImagenServicioService
from utils.storage import generar_signed_upload_url
from config import Config
import uuid
from utils.rate_limiter import limiter
from schemas.paginacion_schema import PaginatedResponse
from utils.auth_middleware import get_current_user_opcional

router = APIRouter(prefix="/servicio", tags=["servicio"])


def _get_perfil_proveedor(usuario_id):
    proveedor_service = ProveedorService()
    perfil = proveedor_service.obtener_por_usuario(usuario_id)
    if not perfil:
        raise HTTPException(status_code=403, detail="El usuario no tiene perfil de proveedor activo")
    return perfil


@router.get("/", response_model=PaginatedResponse[ServicioBusquedaOut])
@limiter.limit("60/minute")
async def buscar_servicios(
    request: Request,
    lat: float = Query(..., description="Latitud del usuario"),
    lng: float = Query(..., description="Longitud del usuario"),
    radio_km: float = Query(10.0, description="Radio de búsqueda en km"),
    categoria_id: Optional[UUID] = Query(None),
    texto: Optional[str] = Query(None, description="Texto a buscar en el título"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user=Depends(get_current_user_opcional)
):
    service = ServicioService()
    usuario_id = current_user["user_id"] if current_user else None
    servicios, has_more = service.buscar(
        lat, lng, radio_km, categoria_id, texto, usuario_id,
        limit=limit, offset=offset
    )
    return PaginatedResponse(
        items=[ServicioBusquedaOut.model_validate(s) for s in servicios],
        has_more=has_more,
        limit=limit,
        offset=offset,
    )


@router.get("/sitemap", response_model=List[ServicioSitemapOut])
async def listar_servicios_para_sitemap():
    return [
        {"id": servicio_id, "fecha_creacion": fecha_creacion}
        for servicio_id, fecha_creacion in ServicioService().listar_para_sitemap()
    ]


@router.post("/", response_model=ServicioOut)
@limiter.limit("10/minute")
async def crear_servicio(request: Request, servicio: CrearServicio, current_user=Depends(get_current_user)):
    perfil = _get_perfil_proveedor(current_user["user_id"])
    service = ServicioService()
    return service.crear(
        proveedor_id=perfil.id,
        categoria_id=servicio.categoria_id,
        titulo=servicio.titulo,
        descripcion=servicio.descripcion,
        precio=servicio.precio,
        tipo_precio=servicio.tipo_precio,
        latitud=servicio.latitud,
        longitud=servicio.longitud
    )


@router.get("/mios", response_model=PaginatedResponse[ServicioOut])
async def listar_mis_servicios(limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),current_user=Depends(get_current_user)):
    perfil = _get_perfil_proveedor(current_user["user_id"])
    service = ServicioService()
    servicios, has_more = service.listar_por_proveedor(perfil.id, limit=limit, offset=offset)
    return PaginatedResponse(items=servicios, has_more=has_more, limit=limit, offset=offset)


@router.get("/{servicio_id}", response_model=ServicioBusquedaOut)
@limiter.limit("60/minute")
async def obtener_servicio(request: Request, servicio_id: UUID, current_user=Depends(get_current_user_opcional)):
    service = ServicioService()
    usuario_id = current_user["user_id"] if current_user else None
    servicio = service.obtener_detalle_publico(servicio_id, usuario_id)
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    return servicio


@router.patch("/{servicio_id}", response_model=ServicioOut)
@limiter.limit("20/minute")
async def actualizar_servicio(request: Request, servicio_id: UUID, datos: ActualizarServicio, current_user=Depends(get_current_user)):
    perfil = _get_perfil_proveedor(current_user["user_id"])
    service = ServicioService()
    servicio = service.actualizar(servicio_id, perfil.id, **datos.model_dump(exclude_none=True))
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado o no tienes permisos")
    return servicio


@router.delete("/{servicio_id}")
@limiter.limit("10/minute")
async def eliminar_servicio(request: Request, servicio_id: UUID, current_user=Depends(get_current_user)):
    perfil = _get_perfil_proveedor(current_user["user_id"])
    service = ServicioService()
    eliminado = service.eliminar(servicio_id, perfil.id)
    if not eliminado:
        raise HTTPException(status_code=404, detail="Servicio no encontrado o no tienes permisos")
    return {"message": "Servicio eliminado exitosamente"}


@router.post("/{servicio_id}/imagen/signed-url")
@limiter.limit("10/minute")
async def signed_url_imagen(request: Request, servicio_id: UUID, current_user=Depends(get_current_user)):
    perfil = _get_perfil_proveedor(current_user["user_id"])
    service = ServicioService()
    servicio = service.obtener(servicio_id)
    if not servicio or str(servicio.proveedor_id) != str(perfil.id):
        raise HTTPException(status_code=404, detail="Servicio no encontrado o sin permisos")
    path = f"{perfil.id}/{servicio_id}/imagen"
    return await generar_signed_upload_url(Config.STORAGE_BUCKET_SERVICIOS, path)

@router.post("/{servicio_id}/imagenes/signed-url")
@limiter.limit("10/minute")
async def signed_url_imagenes(request: Request, servicio_id: UUID, current_user=Depends(get_current_user)):
    perfil = _get_perfil_proveedor(current_user["user_id"])
    service = ServicioService()
    servicio = service.obtener(servicio_id)
    if not servicio or str(servicio.proveedor_id) != str(perfil.id):
        raise HTTPException(status_code=404, detail="Servicio no encontrado o sin permisos")
    path = f"{perfil.id}/{servicio_id}/{uuid.uuid4()}"
    return await generar_signed_upload_url(Config.STORAGE_BUCKET_SERVICIOS, path)

@router.post("/{servicio_id}/imagenes")
@limiter.limit("10/minute")
async def confirmar_subida_imagenes(request: Request, servicio_id: UUID, imagen: CrearImagenServicio, current_user=Depends(get_current_user)):
    perfil = _get_perfil_proveedor(current_user["user_id"])
    service = ImagenServicioService()
    return await service.añadir_imagen(servicio_id, perfil.id, imagen.url)

@router.get("/{servicio_id}/imagenes")
async def listar_imagenes(servicio_id:UUID):
    service = ImagenServicioService()
    return service.listar_imagenes(servicio_id)

@router.delete("/{servicio_id}/imagenes/{imagen_id}")
@limiter.limit("10/minute")
async def eliminar_imagen(request: Request, servicio_id:UUID, imagen_id:UUID,current_user=Depends(get_current_user)):
    perfil = _get_perfil_proveedor(current_user["user_id"])
    service = ImagenServicioService()
    return service.eliminar_imagen(imagen_id, perfil.id)

@router.patch("/{servicio_id}/imagenes/orden")
@limiter.limit("20/minute")
async def reordenar(request: Request, servicio_id:UUID, datos: ReordenarImagenes, current_user=Depends(get_current_user)):
    perfil = _get_perfil_proveedor(current_user["user_id"])
    service = ImagenServicioService()
    return service.reordenar_imagenes(servicio_id, perfil.id, datos.orden)