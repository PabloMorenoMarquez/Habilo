from sqlalchemy import select, and_
from models.reporte import Reporte
from database.session import SessionLocal
from uuid import UUID
from fastapi import HTTPException

class ReporteRepository:
    
    def crear(self, autor_id: UUID, usuario_reportado_id: UUID, motivo: str,
              descripcion: str = None, solicitud_id: UUID = None): 
        session = SessionLocal()
        try:
            reporte = Reporte(autor_id = autor_id, usuario_reportado_id= usuario_reportado_id, motivo= motivo, descripcion= descripcion, solicitud_id= solicitud_id)
            session.add(reporte)
            session.commit()
            session.refresh(reporte)
            return reporte
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()