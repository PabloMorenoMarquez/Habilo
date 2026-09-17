from pydantic import BaseModel, Field
from uuid import UUID
from decimal import Decimal
from typing import Optional, Literal
from datetime import datetime


class CrearServicio(BaseModel):
    categoria_id: UUID
    titulo: str = Field(min_length=3, max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=2000)
    precio: Decimal = Field(gt=0)
    tipo_precio: Literal["fijo", "hora"]
    latitud: Optional[float] = Field(default=None, ge=-90, le=90)
    longitud: Optional[float] = Field(default=None, ge=-180, le=180) 


class ActualizarServicio(BaseModel):
    categoria_id: Optional[UUID] = None
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    precio: Optional[Decimal] = Field(default=None, gt=0)
    tipo_precio: Optional[Literal["fijo", "hora"]] = None
    latitud: Optional[float] = Field(default=None, ge=-90, le=90)
    longitud: Optional[float] = Field(default=None, ge=-180, le=180) 
    activo: Optional[bool] = None
    imagen_url: Optional[str] = None


class ServicioBase(BaseModel):
    id: UUID
    proveedor_id: UUID
    categoria_id: Optional[UUID] = None
    titulo: str
    descripcion: Optional[str] = None
    precio: Optional[Decimal] = None
    tipo_precio: Optional[str] = None
    activo: bool
    fecha_creacion: Optional[datetime] = None
    imagen_url: Optional[str] = None

    class Config:
        from_attributes = True


class ServicioOut(ServicioBase):
    latitud: Optional[float] = None
    longitud: Optional[float] = None


class ServicioBusquedaOut(ServicioBase): 
    distancia_km: Optional[float] = None
    proveedor_nombre: Optional[str] = None
    proveedor_avatar: Optional[str] = None
    proveedor_valoracion_media: Optional[float] = None
    proveedor_num_valoraciones: Optional[int] = None
    categoria_nombre: Optional[str] = None
    es_favorito: bool = False


class ServicioSitemapOut(BaseModel):
    id: UUID
    fecha_creacion: Optional[datetime] = None

    class Config:
        from_attributes = True
    
class ImagenServicioOut(BaseModel):
    id: UUID
    url: str
    orden: int
    class Config:
        from_attributes = True

class ReordenarImagenes(BaseModel):
    orden: list[UUID]
    
class CrearImagenServicio(BaseModel):
    url: str