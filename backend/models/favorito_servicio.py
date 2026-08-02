from sqlalchemy import Column, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timezone

from database.base import base


class Favorito_Servicio(base):
    __tablename__ = "favoritos_servicio"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    usuario_id = Column(UUID, ForeignKey("usuarios.id"), nullable=False)
    servicio_id = Column(UUID, ForeignKey("servicios.id"), nullable=False)
    fecha = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))