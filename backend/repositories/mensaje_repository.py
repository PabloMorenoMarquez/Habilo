from sqlalchemy import select
from models.mensaje import Mensaje
from database.session import SessionLocal
from uuid import UUID


class MensajeRepository:
    def __init__(self):
        self.session = SessionLocal()

    def crear(self, solicitud_id:UUID, remitente_id:UUID, contenido:str):
        session = SessionLocal()
        try:
            mensaje = Mensaje(
                solicitud_id=solicitud_id,
                remitente_id=remitente_id,
                contenido=contenido
            )
            session.add(mensaje)
            session.commit()
            session.refresh(mensaje)
            return mensaje
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def listar_por_solicitud(self, solicitud_id:UUID):
        session = SessionLocal()
        try:
            stmt = select(Mensaje).where(
                Mensaje.solicitud_id == solicitud_id
            ).order_by(Mensaje.fecha)
            return list(session.scalars(stmt))
        finally:
            session.close()
