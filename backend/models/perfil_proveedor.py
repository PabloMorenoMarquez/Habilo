from sqlalchemy import Column, Text, Boolean, DateTime, ForeignKey, Integer, Numeric
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timezone

from database.base import base


class Perfil_Proveedor(base):
    __tablename__ = "perfiles_proveedor"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    usuario_id = Column(UUID, ForeignKey("usuarios.id"), nullable=False)
    descripcion = Column(Text, nullable=True)
    experiencia_años = Column(Integer, nullable=True)
    radio_km_disponible = Column(Integer, nullable=False)
    valoracion_media = Column(Numeric(3,2), default=0)
    num_valoraciones = Column(Integer, default=0)
    verificado = Column(Boolean, nullable=True, default=False)
    url_documento = Column(Text, nullable=True)
    fecha_creacion = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))
    motivo_rechazo = Column(Text, nullable=True)
    stripe_account_id = Column(Text, nullable=True)
    stripe_onboarding_completado = Column(Boolean, nullable=False, default=False)
    stripe_identity_session_id = Column(Text, nullable=True)
    dias_disponibles = Column(Text, nullable=True)
    hora_inicio = Column(Text, nullable=True)
    hora_fin = Column(Text, nullable=True)
