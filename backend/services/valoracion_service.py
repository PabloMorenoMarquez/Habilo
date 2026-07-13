from uuid import UUID
from fastapi import HTTPException
from repositories.valoracion_repository import ValoracionRepository
from repositories.solicitud_repository import SolicitudRepository
from repositories.servicio_repository import ServicioRepository
from repositories.proveedor_repository import ProveedorRepository


class ValoracionService:
    def __init__(self):
        self.valoracion_repository = ValoracionRepository()
        self.solicitud_repository = SolicitudRepository()
        self.servicio_repository = ServicioRepository()
        self.proveedor_repository = ProveedorRepository()

    def crear(self, solicitud_id:UUID, autor_id:UUID, puntuacion:int, comentario:str=None):
        solicitud = self.solicitud_repository.get_by_id(solicitud_id)
        if not solicitud:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        if solicitud.estado != "completada":
            raise HTTPException(status_code=400, detail="Solo se puede valorar una solicitud completada")
        if str(solicitud.cliente_id) != str(autor_id):
            raise HTTPException(status_code=403, detail="Solo el cliente puede valorar al proveedor")
        if self.valoracion_repository.existe_para_solicitud(solicitud_id):
            raise HTTPException(status_code=400, detail="Esta solicitud ya fue valorada")
        # El trigger de Supabase actualiza valoracion_media en perfiles_proveedor automáticamente
        
        servicio = self.servicio_repository.get_by_id(solicitud.servicio_id)
        perfil_proveedor = self.proveedor_repository.get_by_id(servicio.proveedor_id)
        destinatario_id = perfil_proveedor.usuario_id
        
        return self.valoracion_repository.crear(solicitud_id, autor_id, destinatario_id, puntuacion, comentario)

    def listar_por_destinatario(self, destinatario_id:UUID):
        return self.valoracion_repository.listar_por_destinatario(destinatario_id)
