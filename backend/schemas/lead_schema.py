from typing import Literal, Optional
from uuid import UUID

import re

from pydantic import BaseModel, Field, field_validator, model_validator


class CrearLead(BaseModel):
    servicio_id: Optional[UUID] = None
    perfil_id: Optional[UUID] = None
    nombre: str = Field(min_length=2, max_length=80)
    contacto: str = Field(min_length=5, max_length=120)
    canal_contacto: Literal["whatsapp", "email"]
    mensaje: str = Field(min_length=10, max_length=1000)
    consentimiento: bool
    # Campo trampa: los bots lo rellenan, los humanos lo dejan vacío
    website: str = Field(default="", max_length=200)
    ref: Optional[str] = Field(default=None, max_length=20)
    utm_source: Optional[str] = Field(default=None, max_length=100)
    utm_medium: Optional[str] = Field(default=None, max_length=100)
    utm_campaign: Optional[str] = Field(default=None, max_length=100)
    utm_content: Optional[str] = Field(default=None, max_length=100)
    utm_term: Optional[str] = Field(default=None, max_length=100)
    pagina_origen: Optional[str] = Field(default=None, max_length=500)

    @field_validator("nombre", "contacto", "mensaje", mode="before")
    @classmethod
    def recortar_texto(cls, valor):
        # Sin esto, "   " supera min_length porque se valida antes de limpiar.
        return valor.strip() if isinstance(valor, str) else valor

    @field_validator("consentimiento")
    @classmethod
    def validar_consentimiento(cls, valor: bool) -> bool:
        if not valor:
            raise ValueError("El consentimiento es obligatorio")
        return valor

    @model_validator(mode="after")
    def validar_destino(self):
        if (self.servicio_id is None) == (self.perfil_id is None):
            raise ValueError("Debe indicarse exactamente uno de servicio_id o perfil_id")

        if self.canal_contacto == "email":
            if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", self.contacto):
                raise ValueError("El email no es válido")
        else:
            digitos = "".join(caracter for caracter in self.contacto if caracter.isdigit())
            if not 9 <= len(digitos) <= 15:
                raise ValueError("El WhatsApp no es válido")

        return self
