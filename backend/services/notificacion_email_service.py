from repositories.user_repository import UserRepository 
import resend
from config import Config
from uuid import UUID

class NotificacionEmailService:
    
    def __init__(self):
        self.user_repository = UserRepository()
        resend.api_key = Config.RESEND_API_KEY
    
    def enviar(self, usuario_id:UUID, asunto: str, cuerpo_html: str):
        try:
            usuario = self.user_repository.get_by_id(usuario_id)
            if not usuario:
                return None
            resend.Emails.send({
                "from": Config.EMAIL_FROM,
                "to": usuario.email,
                "subject": asunto,
                "html": cuerpo_html,
            })
        except Exception as e:
            print(f"Error enviando email a {usuario_id}: {e}")
        
        
    