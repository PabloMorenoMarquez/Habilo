from uuid import UUID
from repositories.categoria_repository import CategoriaRepository


class CategoriaService:
    def __init__(self):
        self.categoria_repository = CategoriaRepository()

    def listar(self):
        return self.categoria_repository.listar()

    def obtener(self, categoria_id:UUID):
        return self.categoria_repository.get_by_id(categoria_id)

    def crear(self, nombre:str, icono:str=None, descripcion:str=None):
        return self.categoria_repository.crear(nombre, icono, descripcion)
