from pydantic import BaseModel
from uuid import UUID
from typing import Optional


class CrearCategoria(BaseModel):
    nombre: str
    icono: Optional[str] = None
    descripcion: Optional[str] = None


class CategoriaOut(BaseModel):
    id: UUID
    nombre: str
    icono: Optional[str] = None
    descripcion: Optional[str] = None

    class Config:
        from_attributes = True
