from sqlalchemy import Column, Text, Boolean, DateTime, ForeignKey, Integer, Numeric
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timezone

from database.base import base


class Imagen_Servicio(base):
    __tablename__ = "imagenes_servicio"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    servicio_id = Column(UUID, ForeignKey("servicios.id"), nullable=False)
    url = Column(Text, nullable=False)
    orden = Column(Integer, nullable=False)
    fecha_creacion = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))