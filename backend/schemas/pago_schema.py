from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from datetime import datetime
from enum import Enum
from decimal import Decimal
from typing_extensions import Self

class EstadoPago(str, Enum):
    pendiente_autorizacion = "pendiente_autorizacion"
    autorizado = "autorizado"
    capturado = "capturado"
    cancelado = "cancelado"
    transferido = "transferido"
    reembolsado = "reembolsado"
    fallido = "fallido"
    
class PagoOut(BaseModel):
    id: UUID
    solicitud_id: UUID
    cliente_id: UUID
    proveedor_id: UUID
    monto_total: Decimal
    comision_plataforma: Decimal
    monto_proveedor: Decimal
    moneda: str
    estado: str
    stripe_payment_intent_id: str
    stripe_transfer_id: Optional[str] = None
    stripe_refund_id: Optional[str] = None
    fecha_creacion: Optional[datetime] = None
    fecha_captura: Optional[datetime] = None
    fecha_transferencia: Optional[datetime] = None
    fecha_reembolso: Optional[datetime] = None
    class Config:
        from_attributes = True
        
class PagoConClientSecret(BaseModel):
    pago: PagoOut
    client_secret: str