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

class ConversacionOut(BaseModel):
    id: UUID
    servicio_id: UUID
    servicio_titulo: str
    estado: str
    fecha: Optional[datetime] = None
    otro_usuario_id: UUID
    otro_usuario_nombre: str
    otro_usuario_avatar: Optional[str] = None
    ultimo_mensaje: Optional[str] = None
    ultimo_mensaje_fecha: Optional[datetime] = None
    no_leidos: int = 0
