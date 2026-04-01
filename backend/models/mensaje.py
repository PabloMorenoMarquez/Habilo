from sqlalchemy import Column, Text, DateTime,ForeignKey
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime

from database.base import base


class Mensaje(base):
    __tablename__ = "Mensajes"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    solicitud_id = Column(UUID, ForeignKey("Solicitudes.id"), nullable=False)
    remitente_id = Column(UUID, ForeignKey("Usuarios.id"), nullable=False)
    contenido = Column(Text, nullable=False)
    fecha = Column(DateTime, nullable=True, default=datetime.now)