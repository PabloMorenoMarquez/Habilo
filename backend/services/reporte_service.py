from uuid import UUID
from repositories.reporte_repository import ReporteRepository
from fastapi import HTTPException

TRANSICIONES_VALIDAS_REPORTE = {
    "pendiente": {"resuelto", "descartado"},
    "resuelto": set(),
    "descartado": set(),
}

class ReporteService:
    
    def __init__(self):
        self.reporte_repository = ReporteRepository()

    def crear(self, autor_id: UUID, usuario_reportado_id: UUID, motivo: str,
              descripcion: str = None, solicitud_id: UUID = None):
        
        if str(autor_id) == str(usuario_reportado_id):
            raise HTTPException(status_code=400, detail="No puedes reportarte a ti mismo")
        
        return self.reporte_repository.crear(autor_id, usuario_reportado_id, motivo, descripcion, solicitud_id)
    
    def listar(self, estado: str = None):
        return self.reporte_repository.listar(estado)

    def obtener(self, reporte_id: UUID):
        reporte = self.reporte_repository.obtener_detalle(reporte_id)
        if not reporte:
            raise HTTPException(status_code=404, detail="Reporte no encontrado")
        return reporte

    def cambiar_estado(self, reporte_id: UUID, nuevo_estado: str):
        reporte = self.reporte_repository.obtener_detalle(reporte_id)
        if not reporte:
            raise HTTPException(status_code=404, detail="Reporte no encontrado")

        estado_actual = reporte["estado"]
        if nuevo_estado not in TRANSICIONES_VALIDAS_REPORTE.get(estado_actual, set()):
            raise HTTPException(
                status_code=400,
                detail=f"Transición '{estado_actual}' → '{nuevo_estado}' no permitida"
            )

        return self.reporte_repository.actualizar_estado(reporte_id, nuevo_estado)