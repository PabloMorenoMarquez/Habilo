from sqlalchemy import Column, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timezone

from database.base import base


class Referido(base):
    __tablename__ = "referidos"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    referidor_perfil_id = Column(UUID, ForeignKey("perfiles_proveedor.id"), nullable=False)
    referido_perfil_id = Column(UUID, ForeignKey("perfiles_proveedor.id"), nullable=False, unique=True)
    fecha = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))