from sqlalchemy import select
from models.valoracion import Valoracion
from database.session import SessionLocal
from uuid import UUID


class ValoracionRepository:
    def __init__(self):
        self.session = SessionLocal()

    def crear(self, solicitud_id:UUID, autor_id:UUID, destinatario_id:UUID, puntuacion:int, comentario:str=None):
        session = SessionLocal()
        try:
            valoracion = Valoracion(
                solicitud_id=solicitud_id,
                autor_id=autor_id,
                destinatario_id=destinatario_id,
                puntuacion=puntuacion,
                comentario=comentario
            )
            session.add(valoracion)
            session.commit()
            session.refresh(valoracion)
            return valoracion
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def existe_para_solicitud(self, solicitud_id:UUID):
        session = SessionLocal()
        try:
            stmt = select(Valoracion).where(Valoracion.solicitud_id == solicitud_id)
            return session.scalar(stmt) is not None
        finally:
            session.close()

    def listar_por_destinatario(self, destinatario_id:UUID):
        session = SessionLocal()
        try:
            stmt = select(Valoracion).where(
                Valoracion.destinatario_id == destinatario_id
            ).order_by(Valoracion.fecha.desc())
            return list(session.scalars(stmt))
        finally:
            session.close()
