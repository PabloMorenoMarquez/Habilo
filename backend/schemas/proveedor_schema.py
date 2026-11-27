from pydantic import BaseModel, Field, TypeAdapter, ValidationError, field_validator
from schemas.horario_schema import HorarioEntrada, normalizar_horario

_HORARIO = TypeAdapter(HorarioEntrada)

# Los mensajes internos de Pydantic llegan en inglés: se traducen por tipo de error.
_MENSAJES_HORARIO = {
    "string_pattern_mismatch": "formato de hora no válido (HH:MM)",
    "literal_error": "día de la semana no válido",
}
from uuid import UUID
from typing import Literal, Optional
from decimal import Decimal
from datetime import datetime


class CrearPerfilProveedor(BaseModel):
    descripcion: str = Field(max_length=1000)
    radio_km_disponible: int = Field(gt=0) 
    experiencia_años: Optional[int] = Field(default=None, ge=0) 
    codigo_referido: Optional[str] = Field(None, max_length=20)
    ciudad: Optional[str] = None
    zona: Optional[str] = None
    materias: list[str] = Field(default_factory=list)
    niveles: list[str] = Field(default_factory=list)
    perfil_publico: bool = False
    consentimiento_marketing: bool = False


class PerfilProveedorPublico(BaseModel):
    id: UUID
    usuario_id: UUID
    descripcion: Optional[str] = None
    experiencia_años: Optional[int] = None
    radio_km_disponible: int
    valoracion_media: Optional[Decimal] = None
    num_valoraciones: int
    verificado: Optional[bool] = None
    fecha_creacion: Optional[datetime] = None
    horario: Optional[dict] = None
    destacado_hasta: Optional[datetime] = None

    class Config:
        from_attributes = True


class PerfilProveedorOut(PerfilProveedorPublico):
    url_documento: Optional[str] = None
    motivo_rechazo: Optional[str] = None
    codigo_referido: Optional[str] = None
    ciudad: Optional[str] = None
    zona: Optional[str] = None
    materias: list[str] = Field(default_factory=list)
    niveles: list[str] = Field(default_factory=list)
    perfil_publico: bool = False
    consentimiento_marketing: bool = False

    @field_validator("materias", "niveles", mode="before")
    @classmethod
    def normalizar_listas(cls, valor):
        return valor or []


class ServicioResumenOut(BaseModel):
    id: UUID
    titulo: str
    descripcion: Optional[str] = None
    precio: Decimal
    tipo_precio: str
    imagen_url: Optional[str] = None
    categoria_nombre: Optional[str] = None


class ResenaPublicaOut(BaseModel):
    # Sin `contacto`: el email o teléfono de quien reseña nunca sale en la ficha.
    puntuacion: int
    comentario: Optional[str] = None
    fecha: Optional[datetime] = None
    autor_nombre: str
    # "habilo": valoración de una clase reservada; "alumno": reseña por enlace.
    origen: Literal["habilo", "alumno"] = "habilo"
    relacion: Optional[str] = None
    antiguedad: Optional[str] = None


class PerfilProveedorPublicoOut(BaseModel):
    id: UUID
    nombre_publico: str
    avatar_publico: Optional[str] = None
    descripcion: Optional[str] = None
    experiencia_años: Optional[int] = None
    radio_km_disponible: int
    ciudad: Optional[str] = None
    zona: Optional[str] = None
    materias: list[str] = Field(default_factory=list)
    niveles: list[str] = Field(default_factory=list)
    valoracion_media: Optional[Decimal] = None
    num_valoraciones: int
    verificado: Optional[bool] = None
    horario: Optional[dict] = None
    perfil_publico: bool
    servicios: list[ServicioResumenOut] = Field(default_factory=list)
    resenas: list[ResenaPublicaOut] = Field(default_factory=list)


class RechazarDocumento(BaseModel):
    motivo: str

class PerfilProveedorAdminOut(BaseModel):
    id: UUID
    usuario_id: UUID
    descripcion: Optional[str] = None
    experiencia_años: Optional[int] = None
    radio_km_disponible: int
    valoracion_media: Optional[Decimal] = None
    num_valoraciones: int
    verificado: Optional[bool] = None
    url_documento: Optional[str] = None
    fecha_creacion: Optional[datetime] = None
    motivo_rechazo: Optional[str] = None
    usuario_nombre: str
    usuario_email: str
    
class ActualizarPerfilProveedor(BaseModel):
    descripcion: Optional[str] = Field(None, max_length=1000)
    experiencia_años: Optional[int] = None
    radio_km_disponible: Optional[int] = Field(default=None, gt=0) 
    # Se guarda tal cual en JSONB; la forma y las reglas las comprueba el validador.
    horario: Optional[dict] = None

    @field_validator("horario", mode="before")
    @classmethod
    def _normalizar_horario(cls, v):
        if v is None:
            return None
        try:
            entrada = _HORARIO.validate_python(v)
        except ValidationError as e:
            primero = e.errors()[0]
            if primero["type"] == "value_error":
                # Nuestros validadores ya escriben el texto en español.
                motivo = primero["msg"].removeprefix("Value error, ")
                raise ValueError(f"Horario no válido: {motivo}") from None
            motivo = _MENSAJES_HORARIO.get(primero["type"])
            raise ValueError(f"Horario no válido: {motivo}" if motivo else "Horario no válido") from None
        return normalizar_horario(entrada)
    ciudad: Optional[str] = None
    zona: Optional[str] = None
    materias: Optional[list[str]] = None
    niveles: Optional[list[str]] = None
    perfil_publico: Optional[bool] = None
    consentimiento_marketing: Optional[bool] = None
    
class ConfirmarDocumento(BaseModel):
    path: str