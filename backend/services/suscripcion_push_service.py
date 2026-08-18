from uuid import UUID
from repositories.suscripcion_push_repository import SuscripcionPushRepository
from fastapi import HTTPException

class SuscripcionPushService:
    def __init__(self):
        self.suscripcion_repository = SuscripcionPushRepository()
    
    def crear_o_actualizar(self, usuario_id:UUID, endpoint: str, p256dh:str, auth:str):
        return self.suscripcion_repository.crear_o_actualizar(usuario_id, endpoint, p256dh, auth)
    
    def listar_por_usuario(self, usuario_id:UUID):
        return self.suscripcion_repository.listar_por_usuario(usuario_id)
    
    def eliminar_por_endpoint(self, endpoint:str):
        return self.suscripcion_repository.eliminar_por_endpoint(endpoint)
    