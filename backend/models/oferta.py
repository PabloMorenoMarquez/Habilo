from sqlalchemy import Column, Text, Boolean, DateTime, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timezone

from database.base import base


class Oferta(base):
    __tablename__ = "ofertas"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    solicitud_id = Column(UUID, ForeignKey("solicitudes.id"), nullable=False)
    autor_id = Column(UUID, ForeignKey("usuarios.id"), nullable=False)
    precio = Column(Numeric(10,2), nullable=False)
    descripcion = Column(Text, nullable=True)
    estado = Column(Text, default="pendiente")
    fecha_creacion = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))
    horas = Column(Numeric(6, 2), nullable=True)