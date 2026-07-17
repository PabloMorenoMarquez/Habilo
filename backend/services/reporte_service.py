from uuid import UUID
from repositories.reporte_repository import ReporteRepository
from fastapi import HTTPException

class ReporteService:
    
    def __init__(self):
        self.reporte_repository = ReporteRepository()

    def crear(self, autor_id: UUID, usuario_reportado_id: UUID, motivo: str,
              descripcion: str = None, solicitud_id: UUID = None):
        
        if str(autor_id) == str(usuario_reportado_id):
            raise HTTPException(status_code=400, detail="No puedes reportarte a ti mismo")
        
        return self.reporte_repository.crear(autor_id, usuario_reportado_id, motivo, descripcion, solicitud_id)