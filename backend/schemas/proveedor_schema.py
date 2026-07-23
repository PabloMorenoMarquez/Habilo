from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from decimal import Decimal
from datetime import datetime


class CrearPerfilProveedor(BaseModel):
    descripcion: str
    radio_km_disponible: int
    experiencia_años: Optional[int] = None


class PerfilProveedorOut(BaseModel):
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

    class Config:
        from_attributes = True
        
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