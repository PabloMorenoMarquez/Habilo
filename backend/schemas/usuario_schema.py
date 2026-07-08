from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from datetime import datetime


class ActualizarUsuario(BaseModel):
    nombre: Optional[str] = None
    telefono: Optional[str] = None
    ciudad: Optional[str] = None
    foto_url: Optional[str] = None


class UsuarioOut(BaseModel):
    id: UUID
    email: str
    nombre: str
    foto_url: Optional[str] = None
    telefono: Optional[str] = None
    telefono_verificado: Optional[bool] = None
    fecha_registro: Optional[datetime] = None
    ciudad: Optional[str] = None

    class Config:
        from_attributes = True
