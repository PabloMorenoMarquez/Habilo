from sqlalchemy import Column, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timezone

from database.base import base


class Suscripcion_Push(base):
    __tablename__ = "suscripcion_push"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    usuario_id = Column(UUID, ForeignKey("usuarios.id"), nullable=False)
    endpoint = Column(Text,nullable=False, unique=True)
    p256dh = Column(Text, nullable=False)
    auth = Column(Text, nullable=False)
    fecha_creacion = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))