from sqlalchemy import Column, Text, DateTime, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timezone

from database.base import base


class Pago(base):
    __tablename__ = "pagos"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    solicitud_id = Column(UUID, ForeignKey("solicitudes.id"), nullable=False, unique=True)
    cliente_id = Column(UUID, ForeignKey("usuarios.id"), nullable=False)
    proveedor_id = Column(UUID, ForeignKey("usuarios.id"), nullable=False)
    monto_total = Column(Numeric, nullable=False)
    comision_plataforma = Column(Numeric, nullable=False)
    monto_proveedor = Column(Numeric, nullable=False)
    moneda = Column(Text, nullable=False, default="eur")
    estado = Column(Text, nullable=False, default="pendiente_autorizacion")
    stripe_payment_intent_id = Column(Text, nullable=False)
    stripe_transfer_id = Column(Text, nullable=True)
    stripe_refund_id = Column(Text, nullable=True)
    fecha_creacion = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))
    fecha_captura = Column(DateTime, nullable=True)
    fecha_transferencia = Column(DateTime, nullable=True)
    fecha_reembolso = Column(DateTime, nullable=True)