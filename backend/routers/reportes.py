from fastapi import APIRouter, HTTPException, Depends
from utils.auth_middleware import get_current_user
from schemas.reporte_schema import CrearReporte, ReporteOut
from services.reporte_service import ReporteService
from uuid import UUID

router = APIRouter(prefix="/reportes", tags=["reportes"])

@router.post("/", response_model=ReporteOut)
async def crear_reporte(datos: CrearReporte, current_user=Depends(get_current_user)):
    service = ReporteService()
    return service.crear(
        autor_id=current_user["user_id"],
        usuario_reportado_id=datos.usuario_reportado_id,
        motivo=datos.motivo.value,
        descripcion=datos.descripcion,
        solicitud_id=datos.solicitud_id
    )

