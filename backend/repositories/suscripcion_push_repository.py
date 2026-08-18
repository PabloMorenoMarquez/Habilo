from sqlalchemy import select, and_
from database.session import SessionLocal
from models.suscripcion_push import Suscripcion_Push
from uuid import UUID
from fastapi import HTTPException
from decimal import Decimal
from sqlalchemy.dialects.postgresql import insert as pg_insert

class SuscripcionPushRepository:
    
    def crear_o_actualizar(self, usuario_id:UUID, endpoint: str, p256dh:str, auth:str):
        session = SessionLocal()
        try:
            stmt = pg_insert(Suscripcion_Push).values(
                usuario_id=usuario_id, endpoint=endpoint, p256dh=p256dh, auth=auth
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=['endpoint'],
                set_={'p256dh': stmt.excluded.p256dh, 'auth': stmt.excluded.auth}
            )
            session.execute(stmt)
            session.commit()
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
            
    def listar_por_usuario(self, usuario_id:UUID):
        session = SessionLocal()
        try:
            stmt = select(Suscripcion_Push).where(Suscripcion_Push.usuario_id == usuario_id)
            return session.scalars(stmt).all()
        finally:
            session.close()
            
    def eliminar_por_endpoint(self, endpoint:str):
        session = SessionLocal()
        try:
            stmt = select(Suscripcion_Push).where(Suscripcion_Push.endpoint == endpoint)
            suscripcion_push = session.scalar(stmt)
            if suscripcion_push:
                session.delete(suscripcion_push)
                session.commit()
                return True
            return False
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
        