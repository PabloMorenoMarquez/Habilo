from sqlalchemy import Column, Text, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timezone

from database.base import base


class Usuario(base):
    __tablename__ = "usuarios"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    email = Column(Text, unique=True, nullable=False)
    nombre = Column(Text, nullable=False)
    foto_url = Column(Text, nullable=True)
    telefono = Column(Text, nullable=True)
    telefono_verificado = Column(Boolean, nullable=True, default=False)
    fecha_registro = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))
    ciudad = Column(Text, nullable=True)
    es_admin = Column(Boolean, default=False)
    baneado = Column(Boolean, default=False)
    motivo_baneo = Column(Text, nullable=True)
