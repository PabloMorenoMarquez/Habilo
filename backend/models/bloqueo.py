from sqlalchemy import Column, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timezone

from database.base import base


class Bloqueo(base):
    __tablename__ = "bloqueos"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    bloqueador_id = Column(UUID, ForeignKey("usuarios.id"), nullable=False)
    bloqueado_id = Column(UUID, ForeignKey("usuarios.id"), nullable=False)
    fecha = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))