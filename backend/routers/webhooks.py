from fastapi import APIRouter, Request, HTTPException
from utils.stripe_client import get_stripe
from services.proveedor_service import ProveedorService
from services.pago_service import PagoService
from config import Config

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
stripe = get_stripe()


@router.post("/stripe")
async def webhook_stripe(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, Config.STRIPE_WEBHOOK_SECRET)
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(status_code=400, detail="Firma de webhook inválida")

    if event["type"] == "account.updated":
        cuenta = event["data"]["object"]
        ProveedorService().actualizar_estado_onboarding(cuenta["id"], cuenta)
        
    elif event["type"] == "payment_intent.amount_capturable_updated":
        payment_intent = event["data"]["object"]
        PagoService().marcar_autorizado(payment_intent.id)

    elif event["type"] == "payment_intent.payment_failed":
        payment_intent = event["data"]["object"]
        PagoService().marcar_fallido(payment_intent.id)

    return {"received": True}

