from sqlalchemy import Column, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timezone

from database.base import base


class Reporte(base):
    __tablename__ = "reportes"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    autor_id = Column(UUID, ForeignKey("usuarios.id"), nullable=False)
    usuario_reportado_id = Column(UUID, ForeignKey("usuarios.id"), nullable=False)
    motivo = Column(Text)
    descripcion = Column(Text, nullable=True)
    solicitud_id = Column(UUID, ForeignKey("solicitudes.id"), nullable=True)
    estado = Column(Text, default="pendiente")
    fecha = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))
    