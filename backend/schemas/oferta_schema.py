from pydantic import BaseModel, model_validator
from uuid import UUID
from typing import Optional
from datetime import datetime
from enum import Enum
from decimal import Decimal
from typing_extensions import Self

class EstadoOferta(str, Enum):
    pendiente = "pendiente"
    aceptada = "aceptada"
    rechazada = "rechazada"
    reemplazada = "reemplazada"
    
class CrearOferta(BaseModel):
    precio: Decimal
    descripcion: Optional[str] = None
    fecha_hora_propuesta: Optional[datetime] = None
    
class OfertaOut(BaseModel):
    id: UUID
    solicitud_id: UUID
    autor_id: UUID
    precio: Decimal
    descripcion: Optional[str] = None
    estado: str
    fecha_creacion: Optional[datetime] = None
    horas: Optional[Decimal] = None
    fecha_hora_propuesta: Optional[datetime] = None
    
    class Config:
        from_attributes = True
        
class CrearOfertaPorHoras(BaseModel):
    horas: Decimal
    descripcion: Optional[str] = None
    fecha_hora_propuesta: Optional[datetime] = None