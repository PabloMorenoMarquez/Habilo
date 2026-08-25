from pydantic import BaseModel, Field
from uuid import UUID
from typing import Optional


class CrearCategoria(BaseModel):
    nombre: str = Field(max_length=50)
    icono: Optional[str] = Field(None, max_length=10)
    descripcion: Optional[str] = Field(None, max_length=300)


class CategoriaOut(BaseModel):
    id: UUID
    nombre: str
    icono: Optional[str] = None
    descripcion: Optional[str] = None

    class Config:
        from_attributes = True
