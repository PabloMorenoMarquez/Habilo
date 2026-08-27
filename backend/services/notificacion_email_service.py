from repositories.user_repository import UserRepository
import resend
from config import Config
from uuid import UUID
from utils.background import ejecutar_en_segundo_plano
import logging

logger = logging.getLogger(__name__)


class NotificacionEmailService:
    def __init__(self):
        self.user_repository = UserRepository()
        resend.api_key = Config.RESEND_API_KEY

    def enviar(self, usuario_id: UUID, asunto: str, cuerpo_html: str):
        ejecutar_en_segundo_plano(self._enviar_sincrono, usuario_id, asunto, cuerpo_html)

    def _enviar_sincrono(self, usuario_id: UUID, asunto: str, cuerpo_html: str):
        try:
            usuario = self.user_repository.get_by_id(usuario_id)
            if not usuario:
                return
            resend.Emails.send({
                "from": Config.EMAIL_FROM,
                "to": usuario.email,
                "subject": asunto,
                "html": cuerpo_html,
            })
        except Exception as e:
            logger.error(f"Error enviando email a {usuario_id}: {e}", exc_info=True)