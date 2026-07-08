from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from datetime import datetime
from enum import Enum


class EstadoSolicitud(str, Enum):
    pendiente = "pendiente"
    aceptada = "aceptada"
    rechazada = "rechazada"
    completada = "completada"


class CrearSolicitud(BaseModel):
    servicio_id: UUID


class CambiarEstadoSolicitud(BaseModel):
    estado: EstadoSolicitud


class SolicitudOut(BaseModel):
    id: UUID
    servicio_id: UUID
    cliente_id: UUID
    estado: str
    fecha: Optional[datetime] = None

    class Config:
        from_attributes = True
