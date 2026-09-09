from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum

class TipoFeedback(str, Enum):
    sugerencia = "sugerencia"
    bug = "bug"
    otro = "otro"

class CrearFeedback(BaseModel):
    tipo: TipoFeedback
    mensaje: str = Field(min_length=3, max_length=2000)
    pagina: Optional[str] = Field(None, max_length=300)