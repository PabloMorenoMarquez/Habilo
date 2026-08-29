from fastapi import APIRouter, Depends, Query
from typing import Optional, List
from uuid import UUID

from utils.auth_middleware import get_current_admin
from schemas.reporte_schema import ReporteAdminOut, CambiarEstadoReporte
from services.reporte_service import ReporteService
from schemas.proveedor_schema import PerfilProveedorAdminOut, RechazarDocumento, PerfilProveedorOut
from services.proveedor_service import ProveedorService
from schemas.usuario_schema import BanearUsuario, UsuarioAdminOut
from services.user_service import UserService
from schemas.paginacion_schema import PaginatedResponse

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/reportes", response_model=PaginatedResponse[ReporteAdminOut])
async def listar_reportes(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    estado: Optional[str] = Query(default=None),
    current_admin=Depends(get_current_admin),
):
    service = ReporteService()
    reportes, has_more = service.listar(estado, limit=limit, offset=offset)
    return PaginatedResponse(items=reportes, has_more=has_more, limit=limit, offset=offset)


@router.get("/reportes/{reporte_id}", response_model=ReporteAdminOut)
async def obtener_reporte(reporte_id: UUID, current_admin=Depends(get_current_admin)):
    service = ReporteService()
    return service.obtener(reporte_id)


@router.patch("/reportes/{reporte_id}/estado", response_model=ReporteAdminOut)
async def cambiar_estado_reporte(
    reporte_id: UUID,
    datos: CambiarEstadoReporte,
    current_admin=Depends(get_current_admin),
):
    service = ReporteService()
    service.cambiar_estado(reporte_id, datos.estado.value)
    return service.obtener(reporte_id)

@router.get("/proveedores/pendientes", response_model=PaginatedResponse[PerfilProveedorAdminOut])
async def listar_pendientes(limit: int = Query(20, ge=1, le=100),offset: int = Query(0, ge=0),current_admin=Depends(get_current_admin)):
    service = ProveedorService()
    pendientes, has_more = service.listar_pendientes(limit=limit, offset=offset)
    return PaginatedResponse(items=pendientes, has_more=has_more, limit=limit, offset=offset)

@router.patch("/proveedores/{perfil_id}/verificar", response_model=PerfilProveedorOut)
async def verificar(perfil_id:UUID, current_admin=Depends(get_current_admin)):
    service = ProveedorService()
    return service.verificar(perfil_id)

@router.patch("/proveedores/{perfil_id}/rechazar", response_model=PerfilProveedorOut)
async def rechazar(perfil_id:UUID, datos: RechazarDocumento, current_admin=Depends(get_current_admin)):
    service = ProveedorService()
    return service.rechazar(perfil_id, datos.motivo)

@router.get("/proveedores/{perfil_id}/documento")
async def ver_documento_proveedor(perfil_id: UUID, current_admin=Depends(get_current_admin)):
    service = ProveedorService()
    url = await service.obtener_url_documento(perfil_id)
    return {
        "url": url
    }

@router.get("/usuarios/buscar", response_model=PaginatedResponse[UsuarioAdminOut])
async def buscar_usuarios(email:str = Query(...),limit: int = Query(20, ge=1, le=100),offset: int = Query(0, ge=0), current_admin=Depends(get_current_admin)):
    service = UserService()
    usuarios, has_more = service.buscar_por_email(email, limit=limit, offset=offset)
    return PaginatedResponse(items=usuarios, has_more=has_more, limit=limit, offset=offset)

@router.get("/usuarios/baneados", response_model=List[UsuarioAdminOut])
async def listar_baneados(current_admin=Depends(get_current_admin)):
    service = UserService()
    return service.listar_baneados()

@router.patch("/usuarios/{usuario_id}/banear", response_model=UsuarioAdminOut)
async def banear(usuario_id:UUID, datos:BanearUsuario, current_admin=Depends(get_current_admin)):
    service = UserService()
    return service.banear(usuario_id, datos.motivo, current_admin["user_id"])

@router.patch("/usuarios/{usuario_id}/desbanear", response_model=UsuarioAdminOut)
async def desbanear(usuario_id:UUID, current_admin=Depends(get_current_admin)):
    service = UserService()
    return service.desbanear(usuario_id)

@router.patch("/usuarios/{usuario_id}/eliminar", response_model=UsuarioAdminOut)
async def eliminar(usuario_id:UUID, current_admin=Depends(get_current_admin)):
    service = UserService()
    return await service.eliminar_cuenta(usuario_id, current_admin["user_id"])
    