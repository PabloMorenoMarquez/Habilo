from sqlalchemy import select, and_
from models.pago import Pago
from database.session import SessionLocal
from uuid import UUID
from fastapi import HTTPException
from decimal import Decimal
from datetime import datetime, timezone

class PagoRepository:
    
    def crear(self, solicitud_id: UUID, cliente_id: UUID, proveedor_id: UUID, monto_total: Decimal, comision_plataforma: Decimal, monto_proveedor: Decimal, stripe_payment_intent_id: str):
        session = SessionLocal()
        try:
            pago = Pago(solicitud_id = solicitud_id, cliente_id= cliente_id, proveedor_id= proveedor_id, monto_total= monto_total, comision_plataforma= comision_plataforma, monto_proveedor= monto_proveedor, stripe_payment_intent_id= stripe_payment_intent_id)
            session.add(pago)
            session.commit()
            session.refresh(pago)
            return pago
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
            
    def get_by_solicitud_id(self, solicitud_id: UUID):
        session = SessionLocal()
        try:
            stmt = select(Pago).where(Pago.solicitud_id == solicitud_id)
            return session.scalar(stmt)
        finally:
            session.close()
            
    def actualizar_estado_por_payment_intent_id(self, stripe_payment_intent_id: str, estado: str):
        session = SessionLocal()
        try:
            stmt = select(Pago).where(Pago.stripe_payment_intent_id == stripe_payment_intent_id)
            pago = session.scalar(stmt)
            if not pago:
                return None
            pago.estado = estado
            session.commit()
            session.refresh(pago)
            return pago
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
            
    def marcar_capturado_por_payment_intent_id(self, stripe_payment_intent_id: str):
        session = SessionLocal()
        try:
            stmt = select(Pago).where(Pago.stripe_payment_intent_id == stripe_payment_intent_id)
            pago = session.scalar(stmt)
            if not pago:
                return None
            pago.estado = "capturado"
            pago.fecha_captura = datetime.now(timezone.utc)
            session.commit()
            session.refresh(pago)
            return pago
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def marcar_cancelado_por_payment_intent_id(self, stripe_payment_intent_id: str):
        session = SessionLocal()
        try:
            stmt = select(Pago).where(Pago.stripe_payment_intent_id == stripe_payment_intent_id)
            pago = session.scalar(stmt)
            if not pago:
                return None
            pago.estado = "cancelado"
            session.commit()
            session.refresh(pago)
            return pago
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
            
    def marcar_transferido_por_payment_intent_id(self, stripe_payment_intent_id: str, stripe_transfer_id: str):
        session = SessionLocal()
        try:
            stmt = select(Pago).where(Pago.stripe_payment_intent_id == stripe_payment_intent_id)
            pago = session.scalar(stmt)
            if not pago:
                return None
            pago.estado = "transferido"
            pago.stripe_transfer_id = stripe_transfer_id
            pago.fecha_transferencia = datetime.now(timezone.utc)
            session.commit()
            session.refresh(pago)
            return pago
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def marcar_reembolsado_por_payment_intent_id(self, stripe_payment_intent_id: str, stripe_refund_id: str):
        session = SessionLocal()
        try:
            stmt = select(Pago).where(Pago.stripe_payment_intent_id == stripe_payment_intent_id)
            pago = session.scalar(stmt)
            if not pago:
                return None
            pago.estado = "reembolsado"
            pago.stripe_refund_id = stripe_refund_id
            pago.fecha_reembolso = datetime.now(timezone.utc)
            session.commit()
            session.refresh(pago)
            return pago
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()