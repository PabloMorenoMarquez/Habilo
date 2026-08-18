from uuid import UUID
from services.suscripcion_push_service import SuscripcionPushService
from fastapi import HTTPException
from pywebpush import webpush, WebPushException
from config import Config
import json

class NotificacionPushService:
    def __init__(self):
        self.suscripcion_push_service = SuscripcionPushService()
        
    def enviar(self, usuario_id: UUID, titulo: str, cuerpo: str, url:str=None):
        suscripciones = self.suscripcion_push_service.listar_por_usuario(usuario_id)
        if not suscripciones:
            return
        
        
        for suscripcion in suscripciones:
            try:
                subscription_info = {"endpoint": suscripcion.endpoint, "keys": {"p256dh": suscripcion.p256dh, "auth": suscripcion.auth}}
                payload = {
                    "titulo": titulo,
                    "cuerpo": cuerpo,
                    "url": url,
                }

                webpush(
                    subscription_info=subscription_info,
                    data=json.dumps(payload),
                    vapid_private_key=Config.VAPID_PRIVATE_KEY_PATH,
                    vapid_claims={"sub": Config.VAPID_CONTACT_EMAIL},
                )
            except WebPushException as ex:
                if ex.response is not None and ex.response.status_code in (410, 404):
                    self.suscripcion_push_service.eliminar_por_endpoint(suscripcion.endpoint)
                else:
                    print(f"Error enviando push a {suscripcion.endpoint}: {ex}")