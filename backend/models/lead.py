from sqlalchemy import Column, Text, Boolean, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timezone

from database.base import base


class Lead(base):
    __tablename__ = "leads"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    servicio_id = Column(UUID, ForeignKey("servicios.id"), nullable=True)
    perfil_id = Column(UUID, ForeignKey("perfiles_proveedor.id"), nullable=True)
    proveedor_id = Column(UUID, ForeignKey("perfiles_proveedor.id"), nullable=False)
    nombre = Column(Text, nullable=False)
    contacto = Column(Text, nullable=False)
    canal_contacto = Column(Text, nullable=False)
    mensaje = Column(Text, nullable=False)
    consentimiento = Column(Boolean, nullable=False)
    ref = Column(Text, nullable=True)
    utm_source = Column(Text, nullable=True)
    utm_medium = Column(Text, nullable=True)
    utm_campaign = Column(Text, nullable=True)
    utm_content = Column(Text, nullable=True)
    utm_term = Column(Text, nullable=True)
    pagina_origen = Column(Text, nullable=True)
    estado = Column(Text, nullable=False, default="nuevo", server_default=text("'nuevo'"))
    fecha_creacion = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
