from uuid import UUID
from repositories.user_repository import UserRepository

class UserService:
    def __init__(self):
        self.user_repository = UserRepository()

    def create_or_update(self, email:str, nombre:str, foto_url:str):
        return self.user_repository.create_or_update(email, nombre, foto_url)

    def obtener(self, usuario_id:UUID):
        return self.user_repository.get_by_id(usuario_id)

    def actualizar(self, usuario_id:UUID, **campos):
        return self.user_repository.actualizar(usuario_id, **campos)