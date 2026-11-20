from typing import Literal

from pydantic import BaseModel, Field, field_validator


class CrearResenaAlumno(BaseModel):
    puntuacion: int = Field(ge=1, le=5)
    comentario: str = Field(min_length=20, max_length=1000)
    autor_nombre: str = Field(min_length=1, max_length=40)
    relacion: Literal["alumno", "padre_madre"]
    antiguedad: Literal["menos_3_meses", "3_12_meses", "mas_1_ano"]
    # Email o teléfono. Privado: nunca sale en una respuesta pública.
    contacto: str = Field(min_length=3, max_length=120)
    consentimiento: Literal[True]
    # Campo trampa: los bots lo rellenan, los humanos lo dejan vacío
    website: str = Field(default="", max_length=200)

    @field_validator("comentario", "autor_nombre", "contacto", "website", mode="before")
    @classmethod
    def recortar_texto(cls, valor):
        if isinstance(valor, str) and "\x00" in valor:
            # Postgres no admite U+0000 en text: el INSERT acabaría en un 500.
            raise ValueError("El texto contiene caracteres no válidos")
        # Sin esto, "   " supera min_length porque se valida antes de limpiar.
        return valor.strip() if isinstance(valor, str) else valor


class FormularioResenaOut(BaseModel):
    nombre_profesor: str
