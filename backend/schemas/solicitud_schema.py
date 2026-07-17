from pydantic import BaseModel, model_validator
from uuid import UUID
from typing import Optional
from datetime import datetime
from enum import Enum
from typing_extensions import Self


class EstadoSolicitud(str, Enum):
    pendiente = "pendiente"
    aceptada = "aceptada"
    rechazada = "rechazada"
    completada = "completada"
    cancelada = "cancelada"

class MotivoCancelacion(str, Enum):
    cliente_desistio = "cliente_desistio"
    proveedor_no_disponible = "proveedor_no_disponible"
    no_show_proveedor = "no_show_proveedor"
    no_show_cliente = "no_show_cliente"
    bloqueo = "bloqueo"
    otro = "otro"

class CrearSolicitud(BaseModel):
    servicio_id: UUID


class CambiarEstadoSolicitud(BaseModel):
    estado: EstadoSolicitud
    motivo: Optional[MotivoCancelacion] = None
    
    @model_validator(mode='after')
    def check_motivo(self) -> Self:
        if self.estado == EstadoSolicitud.cancelada and self.motivo is None:
            raise ValueError('No ha especificado un motivo de cancelación')
        return self


class SolicitudOut(BaseModel):
    id: UUID
    servicio_id: UUID
    cliente_id: UUID
    estado: str
    fecha: Optional[datetime] = None
    motivo_cancelacion: Optional[str] = None

    class Config:
        from_attributes = True

class ConversacionOut(BaseModel):
    id: UUID
    servicio_id: UUID
    servicio_titulo: str
    estado: str
    fecha: Optional[datetime] = None
    cliente_id: UUID
    otro_usuario_id: UUID
    otro_usuario_nombre: str
    otro_usuario_avatar: Optional[str] = None
    ultimo_mensaje: Optional[str] = None
    ultimo_mensaje_fecha: Optional[datetime] = None
    no_leidos: int = 0
    ya_valorada: bool = False
    motivo_cancelacion: Optional[str] = None
