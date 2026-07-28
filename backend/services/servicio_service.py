from uuid import UUID
from decimal import Decimal
from repositories.servicio_repository import ServicioRepository
from datetime import datetime, timezone
class ServicioService:
    def __init__(self):
        self.servicio_repository = ServicioRepository()

    def crear(self, proveedor_id:UUID, categoria_id:UUID, titulo:str, descripcion:str,
              precio:Decimal, tipo_precio:str, latitud:float=None, longitud:float=None):
        return self.servicio_repository.crear(
            proveedor_id, categoria_id, titulo, descripcion, precio, tipo_precio, latitud, longitud
        )

    def obtener(self, servicio_id:UUID):
        return self.servicio_repository.get_by_id(servicio_id)

    def listar_por_proveedor(self, proveedor_id:UUID):
        return self.servicio_repository.listar_por_proveedor(proveedor_id)

    def actualizar(self, servicio_id:UUID, proveedor_id:UUID, **campos):
        servicio = self.servicio_repository.get_by_id(servicio_id)
        if not servicio or str(servicio.proveedor_id) != str(proveedor_id):
            return None
        return self.servicio_repository.actualizar(servicio_id, **campos)

    def eliminar(self, servicio_id:UUID, proveedor_id:UUID):
        servicio = self.servicio_repository.get_by_id(servicio_id)
        if not servicio or str(servicio.proveedor_id) != str(proveedor_id):
            return False
        return self.servicio_repository.eliminar(servicio_id)

    def buscar(self, lat:float, lng:float, radio_km:float, categoria_id:UUID=None, texto:str=None, usuario_id:UUID=None):
        return self.servicio_repository.buscar_por_proximidad(lat, lng, radio_km, categoria_id, texto, usuario_id)
    
    def obtener_detalle_publico(self, servicio_id):
        return self.servicio_repository.obtener_detalle_publico(servicio_id)