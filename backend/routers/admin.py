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

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/reportes", response_model=List[ReporteAdminOut])
async def listar_reportes(
    estado: Optional[str] = Query(default=None),
    current_admin=Depends(get_current_admin),
):
    service = ReporteService()
    return service.listar(estado)


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

@router.get("/proveedores/pendientes", response_model=List[PerfilProveedorAdminOut])
async def listar_pendientes(current_admin=Depends(get_current_admin)):
    service = ProveedorService()
    return service.listar_pendientes()

@router.patch("/proveedores/{perfil_id}/verificar", response_model=PerfilProveedorOut)
async def verificar(perfil_id:UUID, current_admin=Depends(get_current_admin)):
    service = ProveedorService()
    return service.verificar(perfil_id)

@router.patch("/proveedores/{perfil_id}/rechazar", response_model=PerfilProveedorOut)
async def rechazar(perfil_id:UUID, datos: RechazarDocumento, current_admin=Depends(get_current_admin)):
    service = ProveedorService()
    return service.rechazar(perfil_id, datos.motivo)

@router.get("/usuarios/buscar", response_model=List[UsuarioAdminOut])
async def buscar_usuarios(email:str = Query(...), current_admin=Depends(get_current_admin)):
    service = UserService()
    return service.buscar_por_email(email)

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
    