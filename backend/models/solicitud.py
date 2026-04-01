from sqlalchemy import Column, Text, DateTime,ForeignKey
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime

from database.base import base


class Solicitud(base):
    __tablename__ = "Solicitudes"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    servicio_id = Column(UUID, ForeignKey("Servicios.id"), nullable=False)
    cliente_id = Column(UUID, ForeignKey("Usuarios.id"), nullable=False)
    estado = Column(Text, default="pendiente")
    fecha = Column(DateTime, nullable=True, default=datetime.now)