from sqlalchemy import Column, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timezone

from database.base import base


class Favorito_Proveedor(base):
    __tablename__ = "favoritos_proveedor"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    usuario_id = Column(UUID, ForeignKey("usuarios.id"), nullable=False)
    perfil_proveedor_id = Column(UUID, ForeignKey("perfiles_proveedor.id"), nullable=False)
    fecha = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))