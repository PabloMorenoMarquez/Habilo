from sqlalchemy import Column, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timezone

from database.base import base


class Feedback(base):
    __tablename__ = "feedback"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    usuario_id = Column(UUID, ForeignKey("usuarios.id"), nullable=True)
    tipo = Column(Text, nullable=False)
    mensaje = Column(Text, nullable=False)
    pagina = Column(Text, nullable=True)
    fecha = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))