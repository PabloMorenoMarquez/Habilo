from sqlalchemy import select
from models.referido import Referido
from database.session import SessionLocal
from uuid import UUID


class ReferidoRepository:

    def crear(self, referidor_perfil_id: UUID, referido_perfil_id: UUID):
        session = SessionLocal()
        try:
            referido = Referido(
                referidor_perfil_id=referidor_perfil_id,
                referido_perfil_id=referido_perfil_id,
            )
            session.add(referido)
            session.commit()
            session.refresh(referido)
            return referido
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def obtener_por_referido(self, referido_perfil_id: UUID):
        session = SessionLocal()
        try:
            stmt = select(Referido).where(Referido.referido_perfil_id == referido_perfil_id)
            return session.scalar(stmt)
        finally:
            session.close()