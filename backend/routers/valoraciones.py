from fastapi import APIRouter, Depends, Request, Query
from uuid import UUID
from typing import List
from utils.auth_middleware import get_current_user
from schemas.valoracion_schema import CrearValoracion, ValoracionOut
from services.valoracion_service import ValoracionService
from utils.rate_limiter import limiter
from schemas.paginacion_schema import PaginatedResponse
router = APIRouter(prefix="/valoraciones", tags=["valoraciones"])


@router.post("/", response_model=ValoracionOut)
@limiter.limit("10/minute")
async def crear_valoracion(request: Request, datos: CrearValoracion, current_user=Depends(get_current_user)):
    service = ValoracionService()
    return service.crear(
        solicitud_id=datos.solicitud_id,
        autor_id=current_user["user_id"],
        puntuacion=datos.puntuacion,
        comentario=datos.comentario
    )


@router.get("/usuario/{usuario_id}", response_model=PaginatedResponse[ValoracionOut])
async def listar_valoraciones_usuario(usuario_id: UUID, limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0)):
    service = ValoracionService()
    valoraciones, has_more = service.listar_por_destinatario(usuario_id, limit=limit, offset=offset)
    return PaginatedResponse(items=valoraciones, has_more=has_more, limit=limit, offset=offset)
