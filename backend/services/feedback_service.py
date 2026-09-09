from uuid import UUID
from repositories.feedback_repository import FeedbackRepository
from repositories.user_repository import UserRepository
from config import Config
import resend
import logging

logger = logging.getLogger(__name__)

class FeedbackService:
    def __init__(self):
        self.feedback_repository = FeedbackRepository()
        self.user_repository = UserRepository()
        resend.api_key = Config.RESEND_API_KEY

    def crear(self, tipo: str, mensaje: str, usuario_id: UUID = None, pagina: str = None):
        feedback = self.feedback_repository.crear(tipo, mensaje, usuario_id, pagina)

        nombre_usuario = "Anónimo"
        email_usuario = "—"
        if usuario_id:
            usuario = self.user_repository.get_by_id(usuario_id)
            if usuario:
                nombre_usuario = usuario.nombre
                email_usuario = usuario.email

        try:
            resend.Emails.send({
                "from": Config.EMAIL_FROM,
                "to": Config.FEEDBACK_EMAIL_DESTINO,
                "subject": f"[Feedback Habilo] {tipo}",
                "html": f"""
                    <p><strong>Tipo:</strong> {tipo}</p>
                    <p><strong>De:</strong> {nombre_usuario} ({email_usuario})</p>
                    <p><strong>Página:</strong> {pagina or 'no especificada'}</p>
                    <p><strong>Mensaje:</strong></p>
                    <p>{mensaje}</p>
                """,
            })
        except Exception as e:
            logger.error(f"No se pudo enviar el email de feedback: {e}", exc_info=True)

        return feedback