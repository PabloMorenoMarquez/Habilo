from uuid import UUID
from repositories.bloqueo_repository import BloqueoRepository
from repositories.solicitud_repository import SolicitudRepository
from services.solicitud_service import SolicitudService
from fastapi import HTTPException

class BloqueoService:
    def __init__(self):
        self.bloqueo_repository = BloqueoRepository()
        self.solicitud_repository = SolicitudRepository()
        self.solicitud_service = SolicitudService()

    def bloquear(self, bloqueador_id:UUID, bloqueado_id:UUID):
        if bloqueador_id == bloqueado_id:
            raise HTTPException(status_code=400, detail="No te puedes bloquear a ti mismo")
            
        bloqueo = self.bloqueo_repository.crear(bloqueador_id, bloqueado_id)
        
        solicitudes_activas = self.solicitud_repository.buscar_activas_entre_usuarios(bloqueador_id, bloqueado_id)
        
        for solicitud_activa in solicitudes_activas:
            self.solicitud_service.cancelar_por_sistema(solicitud_activa.id, "bloqueo")
        
        return bloqueo


    def desbloquear(self, bloqueador_id: UUID, bloqueado_id: UUID):
        return self.bloqueo_repository.eliminar(bloqueador_id, bloqueado_id)

    def listar_bloqueados(self, bloqueador_id: UUID):
        return self.bloqueo_repository.listar_bloqueados_enriquecido(bloqueador_id)