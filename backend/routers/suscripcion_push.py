from fastapi import APIRouter, Depends
from utils.auth_middleware import get_current_user
from services.suscripcion_push_service import SuscripcionPushService
from schemas.suscripcion_push_schema import CrearSuscripcionPush

router = APIRouter(prefix="/suscripciones-push", tags=["suscripciones-push"])

@router.post("/")
async def crear_suscripcion(datos: CrearSuscripcionPush, current_user=Depends(get_current_user)):
    service = SuscripcionPushService()
    service.crear_o_actualizar(current_user["user_id"], datos.endpoint, datos.p256dh, datos.auth)
    return {"ok": True}