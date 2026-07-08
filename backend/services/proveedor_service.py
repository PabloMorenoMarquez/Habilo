from uuid import UUID
from repositories.proveedor_repository import ProveedorRepository

class ProveedorService:
    def __init__(self):
        self.proveedor_repository = ProveedorRepository()

    def create_or_update(self, usuario_id:UUID, descripcion:str, radio_km_disponible:int, experiencia_años:int=None):
        return self.proveedor_repository.crear_perfil(usuario_id, descripcion, radio_km_disponible, experiencia_años)

    def obtener_por_usuario(self, usuario_id:UUID):
        return self.proveedor_repository.get_by_usuario_id(usuario_id)

    def obtener_por_id(self, perfil_id:UUID):
        return self.proveedor_repository.get_by_id(perfil_id)

    def actualizar_documento(self, perfil_id:UUID, url_documento:str):
        return self.proveedor_repository.actualizar_documento(perfil_id, url_documento)