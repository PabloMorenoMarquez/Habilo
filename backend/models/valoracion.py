from sqlalchemy import Column, Text, DateTime,ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timezone

from database.base import base


class Valoracion(base):
    __tablename__ = "valoraciones"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    solicitud_id = Column(UUID, ForeignKey("solicitudes.id"), nullable=False)
    autor_id = Column(UUID, ForeignKey("usuarios.id"), nullable=False)
    destinatario_id = Column(UUID, ForeignKey("usuarios.id"), nullable=False)
    puntuacion = Column(Integer, nullable=False)
    comentario = Column(Text, nullable=True)
    fecha = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))