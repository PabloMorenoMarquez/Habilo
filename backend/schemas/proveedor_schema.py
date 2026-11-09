from pydantic import BaseModel, Field, field_validator
from uuid import UUID
from typing import Optional
from decimal import Decimal
from datetime import datetime


class CrearPerfilProveedor(BaseModel):
    descripcion: str = Field(max_length=1000)
    radio_km_disponible: int = Field(gt=0) 
    experiencia_años: Optional[int] = Field(default=None, ge=0) 
    dias_disponibles: Optional[str] = Field(None, max_length=20)
    hora_inicio: Optional[str] = Field(None, max_length=5)
    hora_fin: Optional[str] = Field(None, max_length=5)
    codigo_referido: Optional[str] = Field(None, max_length=20)
    ciudad: Optional[str] = None
    zona: Optional[str] = None
    materias: list[str] = Field(default_factory=list)
    niveles: list[str] = Field(default_factory=list)
    perfil_publico: bool = False
    consentimiento_marketing: bool = False


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
    destacado_hasta: Optional[datetime] = None

    class Config:
        from_attributes = True


class PerfilProveedorOut(PerfilProveedorPublico):
    url_documento: Optional[str] = None
    motivo_rechazo: Optional[str] = None
    codigo_referido: Optional[str] = None
    ciudad: Optional[str] = None
    zona: Optional[str] = None
    materias: list[str] = Field(default_factory=list)
    niveles: list[str] = Field(default_factory=list)
    perfil_publico: bool = False
    consentimiento_marketing: bool = False

    @field_validator("materias", "niveles", mode="before")
    @classmethod
    def normalizar_listas(cls, valor):
        return valor or []


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
    descripcion: Optional[str] = Field(None, max_length=1000)
    experiencia_años: Optional[int] = None
    radio_km_disponible: Optional[int] = Field(default=None, gt=0) 
    dias_disponibles: Optional[str] = Field(None, max_length=100)
    hora_inicio: Optional[str] = Field(None, max_length=5)
    hora_fin: Optional[str] = Field(None, max_length=5)
    ciudad: Optional[str] = None
    zona: Optional[str] = None
    materias: Optional[list[str]] = None
    niveles: Optional[list[str]] = None
    perfil_publico: Optional[bool] = None
    consentimiento_marketing: Optional[bool] = None
    
class ConfirmarDocumento(BaseModel):
    path: str