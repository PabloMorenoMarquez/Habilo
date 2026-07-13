from fastapi import APIRouter, Depends
from uuid import UUID
from typing import List
from utils.auth_middleware import get_current_user
from schemas.valoracion_schema import CrearValoracion, ValoracionOut
from services.valoracion_service import ValoracionService

router = APIRouter(prefix="/valoraciones", tags=["valoraciones"])


@router.post("/", response_model=ValoracionOut)
async def crear_valoracion(datos: CrearValoracion, current_user=Depends(get_current_user)):
    service = ValoracionService()
    return service.crear(
        solicitud_id=datos.solicitud_id,
        autor_id=current_user["user_id"],
        puntuacion=datos.puntuacion,
        comentario=datos.comentario
    )


@router.get("/usuario/{usuario_id}", response_model=List[ValoracionOut])
async def listar_valoraciones_usuario(usuario_id: UUID):
    service = ValoracionService()
    return service.listar_por_destinatario(usuario_id)
