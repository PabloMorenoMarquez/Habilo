from sqlalchemy import select, and_
from models.oferta import Oferta
from database.session import SessionLocal
from uuid import UUID
from fastapi import HTTPException
from decimal import Decimal

class OfertaRepository:
    
    def crear(self, solicitud_id:UUID, autor_id:UUID, precio:Decimal, descripcion:str=None, horas:Decimal=None, fecha_hora_propuesta=None):
        session = SessionLocal()
        try:
            oferta = Oferta(solicitud_id = solicitud_id, autor_id= autor_id, precio= precio, descripcion= descripcion, horas=horas, fecha_hora_propuesta=fecha_hora_propuesta)
            session.add(oferta)
            session.commit()
            session.refresh(oferta)
            return oferta
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
            
    def get_by_id(self, oferta_id:UUID):
        session = SessionLocal()
        try:
            stmt = select(Oferta).where(Oferta.id == oferta_id)
            return session.scalar(stmt)
        finally:
            session.close()
            
    def obtener_pendiente_de_solicitud(self, solicitud_id:UUID):
        session = SessionLocal()
        try:
            stmt = select(Oferta).where(Oferta.solicitud_id == solicitud_id, Oferta.estado == "pendiente")
            return session.scalar(stmt)
        finally:
            session.close()
    
    def actualizar_estado(self, oferta_id:UUID, estado:str):
        session = SessionLocal()
        try:
            stmt = select(Oferta).where(Oferta.id == oferta_id)
            oferta = session.scalar(stmt)
            if not oferta:
                return None
            oferta.estado = estado
            session.commit()
            session.refresh(oferta)
            return oferta
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
            
    def listar_por_solicitud(self, solicitud_id:UUID):
        session = SessionLocal()
        try:
            stmt = select(Oferta).where(Oferta.solicitud_id == solicitud_id).order_by(Oferta.fecha_creacion)
            return session.scalars(stmt).all()
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()