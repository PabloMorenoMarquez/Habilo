from pydantic import BaseModel
from uuid import UUID
from decimal import Decimal
from typing import Optional
from datetime import datetime


class CrearServicio(BaseModel):
    categoria_id: UUID
    titulo: str
    descripcion: Optional[str] = None
    precio: Decimal
    tipo_precio: str
    latitud: Optional[float] = None
    longitud: Optional[float] = None


class ActualizarServicio(BaseModel):
    categoria_id: Optional[UUID] = None
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    precio: Optional[Decimal] = None
    tipo_precio: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    activo: Optional[bool] = None
    imagen_url: Optional[str] = None


class ServicioOut(BaseModel):
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
    latitud: Optional[float] = None
    longitud: Optional[float] = None

    class Config:
        from_attributes = True


class ServicioBusquedaOut(ServicioOut):
    distancia_km: Optional[float] = None
    proveedor_nombre: Optional[str] = None
    proveedor_avatar: Optional[str] = None
    proveedor_valoracion_media: Optional[float] = None
    proveedor_num_valoraciones: Optional[int] = None
    categoria_nombre: Optional[str] = None
    
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