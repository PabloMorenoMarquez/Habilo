from sqlalchemy import select, and_, func, update
from models.imagen_servicio import Imagen_Servicio
from database.session import SessionLocal
from uuid import UUID
from fastapi import HTTPException
from decimal import Decimal

class ImagenServicioRepository:
    
    def crear(self, servicio_id:UUID, url:str, orden:int):
        session = SessionLocal()
        try:
            imagen = Imagen_Servicio(servicio_id=servicio_id, url=url, orden=orden)
            session.add(imagen)
            session.commit()
            session.refresh(imagen)
            return imagen
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
    
    def listar_por_servicio(self, servicio_id:UUID):
        session = SessionLocal()
        try:
            stmt = select(Imagen_Servicio).where(Imagen_Servicio.servicio_id == servicio_id).order_by(Imagen_Servicio.orden)
            return session.scalars(stmt).all()
        finally:
            session.close()
            
    def contar_por_servicio(self, servicio_id:UUID):
        session = SessionLocal()
        try:
            stmt = select(func.count(Imagen_Servicio.id)).where(Imagen_Servicio.servicio_id == servicio_id)
            return session.scalar(stmt)
        finally:
            session.close()
    
    def get_by_id(self, imagen_id:UUID):
        session = SessionLocal()
        try:
            stmt = select(Imagen_Servicio).where(Imagen_Servicio.id == imagen_id)
            return session.scalar(stmt)
        finally:
            session.close()
    
    def eliminar(self, imagen_id:UUID):
        session = SessionLocal()
        try:
            stmt = select(Imagen_Servicio).where(Imagen_Servicio.id == imagen_id)
            imagen = session.scalar(stmt)
            if imagen:
                session.delete(imagen)
                session.commit()
                return True
            return False
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
            
    def reordenar(self, servicio_id:UUID, ids_en_orden: list[UUID]):
        session = SessionLocal()
        try:
            for indice, imagen_id in enumerate(ids_en_orden):
                stmt = (
                    update(Imagen_Servicio)
                    .where(
                        Imagen_Servicio.id == imagen_id,
                        Imagen_Servicio.servicio_id == servicio_id
                    )
                    .values(orden=indice)
                )
                session.execute(stmt)

            session.commit()
            
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()