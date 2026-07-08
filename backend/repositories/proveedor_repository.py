from sqlalchemy import select
from models.perfil_proveedor import Perfil_Proveedor
from database.session import SessionLocal
from uuid import UUID

class ProveedorRepository:
    def __init__(self):
        self.session = SessionLocal()

    def crear_perfil(self, usuario_id:UUID, descripcion:str, radio_km_disponible:int, experiencia_años:int=None):
        session = SessionLocal()
        try:
            perfil = Perfil_Proveedor(
                usuario_id=usuario_id,
                descripcion=descripcion,
                radio_km_disponible=radio_km_disponible,
                experiencia_años=experiencia_años
            )
            session.add(perfil)
            session.commit()
            session.refresh(perfil)
            return perfil
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def get_by_usuario_id(self, usuario_id:UUID):
        session = SessionLocal()
        try:
            stmt = select(Perfil_Proveedor).where(Perfil_Proveedor.usuario_id == usuario_id)
            return session.scalar(stmt)
        finally:
            session.close()

    def get_by_id(self, perfil_id:UUID):
        session = SessionLocal()
        try:
            stmt = select(Perfil_Proveedor).where(Perfil_Proveedor.id == perfil_id)
            return session.scalar(stmt)
        finally:
            session.close()

    def actualizar_documento(self, perfil_id:UUID, url_documento:str):
        session = SessionLocal()
        try:
            stmt = select(Perfil_Proveedor).where(Perfil_Proveedor.id == perfil_id)
            perfil = session.scalar(stmt)
            if not perfil:
                return None
            perfil.url_documento = url_documento
            session.commit()
            session.refresh(perfil)
            return perfil
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()