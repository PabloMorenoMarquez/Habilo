from sqlalchemy import Column, Text, Boolean, DateTime, ForeignKey, Integer, text
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timezone

from database.base import base


class ResenaAlumno(base):
    """Opinión de un alumno (o su madre/padre) enviada con el enlace del profesor.

    Separada de `valoraciones`: no exige solicitud ni cuenta. Solo se publica
    con `estado = 'aprobada'`. `contacto` es privado y se borra 90 días
    después de moderar.
    """
    __tablename__ = "resenas_alumnos"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    perfil_id = Column(UUID, ForeignKey("perfiles_proveedor.id"), nullable=False)
    puntuacion = Column(Integer, nullable=False)
    comentario = Column(Text, nullable=False)
    autor_nombre = Column(Text, nullable=False)
    relacion = Column(Text, nullable=False)
    antiguedad = Column(Text, nullable=False)
    contacto = Column(Text, nullable=True)
    consentimiento = Column(Boolean, nullable=False)
    estado = Column(Text, nullable=False, default="pendiente", server_default=text("'pendiente'"))
    fecha = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc),
                   server_default=text("now()"))
    fecha_moderacion = Column(DateTime(timezone=True), nullable=True)
