from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from datetime import datetime


class MensajeOut(BaseModel):
    id: UUID
    solicitud_id: UUID
    remitente_id: UUID
    contenido: str
    fecha: Optional[datetime] = None

    class Config:
        from_attributes = True
