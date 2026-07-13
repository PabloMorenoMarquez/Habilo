from pydantic import BaseModel, field_validator
from uuid import UUID
from typing import Optional
from datetime import datetime


class CrearValoracion(BaseModel):
    solicitud_id: UUID
    puntuacion: int
    comentario: Optional[str] = None

    @field_validator("puntuacion")
    @classmethod
    def puntuacion_valida(cls, v):
        if v < 1 or v > 5:
            raise ValueError("La puntuación debe estar entre 1 y 5")
        return v


class ValoracionOut(BaseModel):
    id: UUID
    solicitud_id: UUID
    autor_id: UUID
    destinatario_id: UUID
    puntuacion: Optional[int] = None
    comentario: Optional[str] = None
    fecha: Optional[datetime] = None

    class Config:
        from_attributes = True
