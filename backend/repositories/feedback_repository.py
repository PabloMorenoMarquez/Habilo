from models.feedback import Feedback
from database.session import SessionLocal
from uuid import UUID

class FeedbackRepository:

    def crear(self, tipo: str, mensaje: str, usuario_id: UUID = None, pagina: str = None):
        session = SessionLocal()
        try:
            feedback = Feedback(tipo=tipo, mensaje=mensaje, usuario_id=usuario_id, pagina=pagina)
            session.add(feedback)
            session.commit()
            session.refresh(feedback)
            return feedback
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()