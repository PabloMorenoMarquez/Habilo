from uuid import UUID
from cachetools import TTLCache
from repositories.categoria_repository import CategoriaRepository

_categorias_cache = TTLCache(maxsize=1, ttl=3600)
_CACHE_KEY = "todas"

class CategoriaService:
    def __init__(self):
        self.categoria_repository = CategoriaRepository()

    def listar(self):
        if _CACHE_KEY in _categorias_cache:
            return _categorias_cache[_CACHE_KEY]
        
        categorias = self.categoria_repository.listar()
        _categorias_cache[_CACHE_KEY] = categorias
        return categorias

    def obtener(self, categoria_id:UUID):
        return self.categoria_repository.get_by_id(categoria_id)

    def crear(self, nombre:str, icono:str=None, descripcion:str=None):
        categoria = self.categoria_repository.crear(nombre, icono, descripcion)
        _categorias_cache.pop(_CACHE_KEY, None)
        return categoria
