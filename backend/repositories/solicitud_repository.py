from sqlalchemy import select
from models.solicitud import Solicitud
from models.servicio import Servicio
from database.session import SessionLocal
from uuid import UUID


class SolicitudRepository:
    def __init__(self):
        self.session = SessionLocal()

    def crear(self, servicio_id:UUID, cliente_id:UUID):
        session = SessionLocal()
        try:
            solicitud = Solicitud(servicio_id=servicio_id, cliente_id=cliente_id)
            session.add(solicitud)
            session.commit()
            session.refresh(solicitud)
            return solicitud
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def get_by_id(self, solicitud_id:UUID):
        session = SessionLocal()
        try:
            stmt = select(Solicitud).where(Solicitud.id == solicitud_id)
            return session.scalar(stmt)
        finally:
            session.close()

    def listar_por_cliente(self, cliente_id:UUID):
        session = SessionLocal()
        try:
            stmt = select(Solicitud).where(Solicitud.cliente_id == cliente_id)
            return list(session.scalars(stmt))
        finally:
            session.close()

    def listar_por_proveedor(self, proveedor_id:UUID):
        session = SessionLocal()
        try:
            stmt = (
                select(Solicitud)
                .join(Servicio, Solicitud.servicio_id == Servicio.id)
                .where(Servicio.proveedor_id == proveedor_id)
            )
            return list(session.scalars(stmt))
        finally:
            session.close()

    def actualizar_estado(self, solicitud_id:UUID, estado:str):
        session = SessionLocal()
        try:
            stmt = select(Solicitud).where(Solicitud.id == solicitud_id)
            solicitud = session.scalar(stmt)
            if not solicitud:
                return None
            solicitud.estado = estado
            session.commit()
            session.refresh(solicitud)
            return solicitud
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
