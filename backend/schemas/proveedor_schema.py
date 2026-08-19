from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from decimal import Decimal
from datetime import datetime


class CrearPerfilProveedor(BaseModel):
    descripcion: str
    radio_km_disponible: int
    experiencia_años: Optional[int] = None
    dias_disponibles: Optional[str] = None
    hora_inicio: Optional[str] = None
    hora_fin: Optional[str] = None


class PerfilProveedorPublico(BaseModel):
    id: UUID
    usuario_id: UUID
    descripcion: Optional[str] = None
    experiencia_años: Optional[int] = None
    radio_km_disponible: int
    valoracion_media: Optional[Decimal] = None
    num_valoraciones: int
    verificado: Optional[bool] = None
    fecha_creacion: Optional[datetime] = None
    dias_disponibles: Optional[str] = None
    hora_inicio: Optional[str] = None
    hora_fin: Optional[str] = None

    class Config:
        from_attributes = True


class PerfilProveedorOut(PerfilProveedorPublico):
    url_documento: Optional[str] = None
    motivo_rechazo: Optional[str] = None
        
class RechazarDocumento(BaseModel):
    motivo: str

class PerfilProveedorAdminOut(BaseModel):
    id: UUID
    usuario_id: UUID
    descripcion: Optional[str] = None
    experiencia_años: Optional[int] = None
    radio_km_disponible: int
    valoracion_media: Optional[Decimal] = None
    num_valoraciones: int
    verificado: Optional[bool] = None
    url_documento: Optional[str] = None
    fecha_creacion: Optional[datetime] = None
    motivo_rechazo: Optional[str] = None
    usuario_nombre: str
    usuario_email: str
    
class ActualizarPerfilProveedor(BaseModel):
    descripcion: Optional[str] = None
    experiencia_años: Optional[int] = None
    radio_km_disponible: Optional[int] = None
    dias_disponibles: Optional[str] = None
    hora_inicio: Optional[str] = None
    hora_fin: Optional[str] = None
    
class ConfirmarDocumento(BaseModel):
    path: str