from uuid import UUID
from repositories.user_repository import UserRepository
from fastapi import HTTPException


class UserService:
    def __init__(self):
        self.user_repository = UserRepository()

    def create_or_update(self, email:str, nombre:str, foto_url:str):
        return self.user_repository.create_or_update(email, nombre, foto_url)

    def obtener(self, usuario_id:UUID):
        return self.user_repository.get_by_id(usuario_id)

    def actualizar(self, usuario_id:UUID, **campos):
        if "telefono" in campos:
            campos["telefono_verificado"] = False
        return self.user_repository.actualizar(usuario_id, **campos)
    
    def buscar_por_email(self, email:str):
        return self.user_repository.buscar_por_email(email)
    
    def listar_baneados(self):
        return self.user_repository.listar_baneados()
    
    def banear(self, usuario_id:UUID, motivo:str, admin_actual_id:UUID):
        usuario = self.user_repository.get_by_id(usuario_id)
        if not usuario:
            raise HTTPException(status_code=404, detail="No existe este usuario")
        
        if str(usuario_id) == str(admin_actual_id):
            raise HTTPException(status_code=400, detail="No puedes banearte a ti mismo")
        
        if usuario.es_admin:
             raise HTTPException(status_code=400, detail="No puedes banear a otro administrador")
        
        return self.user_repository.banear(usuario_id, motivo)
    
    def desbanear(self, usuario_id:UUID):
        usuario = self.user_repository.get_by_id(usuario_id)
        if not usuario:
            raise HTTPException(status_code=404, detail="No existe este usuario")
        
        return self.user_repository.desbanear(usuario_id)
    
    def eliminar_cuenta(self, usuario_id: UUID, admin_actual_id: UUID):
        from repositories.solicitud_repository import SolicitudRepository
        from services.solicitud_service import SolicitudService
        from repositories.proveedor_repository import ProveedorRepository
        from repositories.servicio_repository import ServicioRepository
        usuario = self.user_repository.get_by_id(usuario_id)
        if not usuario:
            raise HTTPException(status_code=404, detail="No existe este usuario")
        
        if str(usuario_id) == str(admin_actual_id):
            raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
        
        if usuario.es_admin:
                raise HTTPException(status_code=400, detail="No puedes eliminar a otro administrador")
            
        
        solicitudes = SolicitudRepository().listar_activas_de_usuario(usuario_id)
        for solicitud in solicitudes:
            SolicitudService().cancelar_por_sistema(solicitud.id, motivo="cuenta eliminada")
        
        proveedor = ProveedorRepository().get_by_usuario_id(usuario_id)
        
        if proveedor:
            servicios = ServicioRepository().listar_por_proveedor(proveedor.id)
            for servicio in servicios:
                ServicioRepository().actualizar(servicio.id, activo=False)
        
        return self.user_repository.eliminar(usuario_id)