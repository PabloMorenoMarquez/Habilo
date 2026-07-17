from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from datetime import datetime

class BloquearUsuario(BaseModel):
    usuario_id: UUID

class UsuarioBloqueadoOut(BaseModel):
    id: UUID
    usuario_id: UUID
    nombre: str
    avatar: Optional[str] = None
    fecha: Optional[datetime] = None