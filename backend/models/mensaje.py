from sqlalchemy import Column, Text, DateTime,ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime

from database.base import base


class Mensaje(base):
    __tablename__ = "mensajes"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    solicitud_id = Column(UUID, ForeignKey("solicitudes.id"), nullable=False)
    remitente_id = Column(UUID, ForeignKey("usuarios.id"), nullable=False)
    contenido = Column(Text, nullable=False)
    fecha = Column(DateTime, nullable=True, default=datetime.now)
    leido = Column(Boolean, default=False)