from sqlalchemy import select, and_
from models.favorito_servicio import Favorito_Servicio
from models.favorito_proveedor import Favorito_Proveedor
from database.session import SessionLocal
from uuid import UUID
from fastapi import HTTPException
from decimal import Decimal

class FavoritoRepository:
    
    def marcar_servicio(self, usuario_id:UUID, servicio_id:UUID):
        session = SessionLocal()
        try:
            favorito_servicio = Favorito_Servicio(usuario_id=usuario_id, servicio_id=servicio_id)
            session.add(favorito_servicio)
            session.commit()
            session.refresh(favorito_servicio)
            return favorito_servicio
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
            
    def desmarcar_servicio(self, usuario_id:UUID, servicio_id:UUID):
        session = SessionLocal()
        try:
            stmt = select(Favorito_Servicio).where(Favorito_Servicio.usuario_id == usuario_id, Favorito_Servicio.servicio_id == servicio_id)
            favorito_servicio = session.scalar(stmt)
            if favorito_servicio:
                session.delete(favorito_servicio)
                session.commit()
                return True
            return False
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
            
    def listar_ids_favoritos_servicio(self, usuario_id:UUID) -> set[UUID]:
        session = SessionLocal()
        try:
            stmt = select(Favorito_Servicio.servicio_id).where(Favorito_Servicio.usuario_id == usuario_id)
            return set(session.scalars(stmt).all())
        finally:
            session.close()

    def es_favorito_servicio(self, usuario_id:UUID, servicio_id:UUID) -> bool:
        session = SessionLocal()
        try:
            stmt = select(Favorito_Servicio).where(Favorito_Servicio.usuario_id == usuario_id, Favorito_Servicio.servicio_id == servicio_id)
            favorito_servicio = session.scalar(stmt)
            if favorito_servicio:
                return True
            return False
        finally:
            session.close()
    
    def marcar_proveedor(self, usuario_id:UUID, perfil_id:UUID):
        session = SessionLocal()
        try:
            favorito_proveedor = Favorito_Proveedor(usuario_id=usuario_id, perfil_proveedor_id=perfil_id)
            session.add(favorito_proveedor)
            session.commit()
            session.refresh(favorito_proveedor)
            return favorito_proveedor
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
            
    def desmarcar_proveedor(self, usuario_id:UUID, perfil_id:UUID):
        session = SessionLocal()
        try:
            stmt = select(Favorito_Proveedor).where(Favorito_Proveedor.usuario_id == usuario_id, Favorito_Proveedor.perfil_proveedor_id == perfil_id)
            favorito_provedor = session.scalar(stmt)
            if favorito_provedor:
                session.delete(favorito_provedor)
                session.commit()
                return True
            return False
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
            
    def listar_ids_favoritos_proveedor(self, usuario_id:UUID) -> set[UUID]:
        session = SessionLocal()
        try:
            stmt = select(Favorito_Proveedor.perfil_proveedor_id).where(Favorito_Proveedor.usuario_id == usuario_id)
            return set(session.scalars(stmt).all())
        finally:
            session.close()

    def es_favorito_proveedor(self, usuario_id:UUID, perfil_id:UUID) -> bool:
        session = SessionLocal()
        try:
            stmt = select(Favorito_Proveedor).where(Favorito_Proveedor.usuario_id == usuario_id, Favorito_Proveedor.perfil_proveedor_id == perfil_id)
            favorito_proveedor = session.scalar(stmt)
            if favorito_proveedor:
                return True
            return False
        finally:
            session.close()
        