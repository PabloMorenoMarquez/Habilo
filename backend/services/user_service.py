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