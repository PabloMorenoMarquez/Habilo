from sqlalchemy import Column, Text, DateTime,ForeignKey
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timezone

from database.base import base


class Solicitud(base):
    __tablename__ = "solicitudes"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    servicio_id = Column(UUID, ForeignKey("servicios.id"), nullable=False)
    cliente_id = Column(UUID, ForeignKey("usuarios.id"), nullable=False)
    estado = Column(Text, default="negociando")
    fecha = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))
    motivo_cancelacion = Column(Text, nullable=True)
    ultima_actividad = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    fecha_completada = Column(DateTime, nullable=True)