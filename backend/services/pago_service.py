from uuid import UUID
from fastapi import HTTPException
from repositories.oferta_repository import OfertaRepository
from services.mensaje_service import MensajeService
from repositories.servicio_repository import ServicioRepository
from repositories.solicitud_repository import SolicitudRepository
from repositories.pago_repository import PagoRepository
from repositories.proveedor_repository import ProveedorRepository
from services.solicitud_service import SolicitudService
from decimal import Decimal, ROUND_HALF_UP
from config import Config
from utils.stripe_client import get_stripe

class PagoService:
    
    def __init__(self):
        self.oferta_repository = OfertaRepository()
        self.mensaje_service = MensajeService()
        self.servicio_repository = ServicioRepository()
        self.solicitud_repository = SolicitudRepository()
        self.pago_repository = PagoRepository()
        self.proveedor_repository = ProveedorRepository()
        self.solicitud_service = SolicitudService()
        self.stripe = get_stripe()
        
    def crear_pago_desde_oferta(self, oferta_id:UUID, cliente_id: UUID):
        
        oferta = self.oferta_repository.get_by_id(oferta_id)
        if not oferta:
            raise HTTPException(status_code=404, detail="No existe la oferta")
        
        if oferta.estado != "aceptada":
            raise HTTPException(status_code=400, detail="Esa oferta no está aceptada todavía")
        
        solicitud = self.solicitud_repository.get_by_id(oferta.solicitud_id)
        if not solicitud:
            raise HTTPException(status_code=404, detail="No existe la solicitud")
        if solicitud.estado != "negociando":
            raise HTTPException(status_code=400, detail="La solicitud no es válida")
        
        if str(cliente_id) != str(solicitud.cliente_id):
            raise HTTPException(status_code=403, detail="Solo el cliente de la solicitud puede pagar")
        
        pago = self.pago_repository.get_by_solicitud_id(solicitud.id)
        if pago and pago.estado not in ("fallido", "cancelado"):
            payment_intent_pago = self.stripe.PaymentIntent.retrieve(
                pago.stripe_payment_intent_id
            )
            return {
                "pago": pago,
                "client_secret": payment_intent_pago.client_secret
            }
        
        comision = (oferta.precio * Decimal(Config.STRIPE_COMISION_PORCENTAJE) / Decimal(100)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        monto_proveedor = oferta.precio - comision
        
        servicio = self.servicio_repository.get_by_id(solicitud.servicio_id)
        if not servicio:
            raise HTTPException(status_code=404, detail="No existe el servicio")
        perfil = self.proveedor_repository.get_by_id(servicio.proveedor_id)
        if not perfil:
            raise HTTPException(status_code=404, detail="No existe el proveedor")
        

        payment_intent = self.stripe.PaymentIntent.create(
            amount=int(oferta.precio * 100),
            currency="eur",
            capture_method="manual",
            transfer_group=str(solicitud.id),
            automatic_payment_methods={"enabled": True},
            metadata={"solicitud_id": str(solicitud.id), "oferta_id": str(oferta.id)},
        )
        
        pago_nuevo = self.pago_repository.crear(solicitud.id, solicitud.cliente_id, perfil.usuario_id, oferta.precio, comision, monto_proveedor, payment_intent.id)
        return {
            "pago": pago_nuevo,
            "client_secret": payment_intent.client_secret
        }
    
    def marcar_autorizado(self, stripe_payment_intent_id: str):
        pago = self.pago_repository.actualizar_estado_por_payment_intent_id(stripe_payment_intent_id, "autorizado")
        if not pago:
            return
        return self.solicitud_service.marcar_pendiente_por_pago(pago.solicitud_id)
    
    def marcar_fallido(self, stripe_payment_intent_id: str):
        return self.pago_repository.actualizar_estado_por_payment_intent_id(stripe_payment_intent_id, "fallido")
    
    def capturar_pago_de_solicitud(self, solicitud_id:UUID):
        pago = self.pago_repository.get_by_solicitud_id(solicitud_id)
        if not pago or pago.estado != "autorizado":
            raise HTTPException(status_code=400, detail="No hay un pago autorizado para esta solicitud")
        
        try:
            self.stripe.PaymentIntent.capture(pago.stripe_payment_intent_id)
        except self.stripe.error.StripeError as e:
            raise HTTPException(status_code=400, detail=f"No se pudo cobrar el pago: {str(e)}")
        
        return self.pago_repository.marcar_capturado_por_payment_intent_id(pago.stripe_payment_intent_id)
    
    def cancelar_pago_de_solicitud(self, solicitud_id:UUID):
        pago = self.pago_repository.get_by_solicitud_id(solicitud_id)
        if not pago:
            return
        
        if pago.estado != "autorizado":
            return
        
        try:
            self.stripe.PaymentIntent.cancel(pago.stripe_payment_intent_id)
        except self.stripe.error.StripeError as e:
            raise HTTPException(status_code=400, detail=f"No se pudo cancelar el pago: {str(e)}")
        
        return self.pago_repository.marcar_cancelado_por_payment_intent_id(pago.stripe_payment_intent_id)
    
    def confirmar_entrega_y_transferir(self, solicitud_id:UUID, cliente_id:UUID):
        solicitud = self.solicitud_repository.get_by_id(solicitud_id)
        if not solicitud:
            raise HTTPException(status_code=404, detail="No existe esta solicitud")
        
        if solicitud.estado != "completada":
            raise HTTPException(status_code=400, detail="Esta solicitud no está completada")
        
        if str(cliente_id) != str(solicitud.cliente_id):
            raise HTTPException(status_code=403, detail="Solo puede realizar esta acción el cliente de la solicitud")
        
        pago = self.pago_repository.get_by_solicitud_id(solicitud_id)
        if not pago:
            raise HTTPException(status_code=404, detail="No existe este pago")
        
        if pago.estado != "capturado":
            raise HTTPException(status_code=400, detail="No hay ningún pago capturado para confirmar")
        
        perfil = self.proveedor_repository.get_by_usuario_id(pago.proveedor_id)
        
        try:
            transfer = self.stripe.Transfer.create(amount=int(pago.monto_proveedor * 100), currency="eur", destination=perfil.stripe_account_id, transfer_group=str(solicitud_id))
        except self.stripe.error.StripeError as e:
            raise HTTPException(status_code=400, detail=f"No se pudo cobrar el pago: {str(e)}")
        
        return self.pago_repository.marcar_transferido_por_payment_intent_id(pago.stripe_payment_intent_id, transfer.id)
    
    def reembolsar_pago_de_solicitud(self, solicitud_id:UUID):
        pago = self.pago_repository.get_by_solicitud_id(solicitud_id)
        if not pago:
            return
        
        if pago.estado != "capturado":
            return
        
        try:
            refund = self.stripe.Refund.create(payment_intent=pago.stripe_payment_intent_id)
        except self.stripe.error.StripeError as e:
            raise HTTPException(status_code=400, detail=f"No se pudo reembolsar el pago: {str(e)}")
        
        return self.pago_repository.marcar_reembolsado_por_payment_intent_id(pago.stripe_payment_intent_id, refund.id)
        
        
        