from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from datetime import datetime
from enum import Enum

class MotivoReporte(str, Enum):
    contenido_inapropiado = "contenido_inapropiado"
    spam = "spam"
    comportamiento_sospechoso = "comportamiento_sospechoso"
    no_se_presento = "no_se_presento"
    otro = "otro"

class CrearReporte(BaseModel):
    usuario_reportado_id: UUID
    motivo: MotivoReporte
    descripcion: Optional[str] = None
    solicitud_id: Optional[UUID] = None

class ReporteOut(BaseModel):
    id: UUID
    autor_id: UUID
    usuario_reportado_id: UUID
    motivo: str
    descripcion: Optional[str] = None
    solicitud_id: Optional[UUID] = None
    estado: str
    fecha: Optional[datetime] = None

    class Config:
        from_attributes = True