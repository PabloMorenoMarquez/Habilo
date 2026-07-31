from uuid import UUID
from repositories.imagen_servicio_repository import ImagenServicioRepository
from repositories.servicio_repository import ServicioRepository
from fastapi import HTTPException

class ImagenServicioService:
    
    def __init__(self):
        self.imagen_servicio_repository = ImagenServicioRepository()
        self.servicio_repository = ServicioRepository()
        
    def añadir_imagen(self, servicio_id:UUID, proveedor_id:UUID, url:str):
        servicio = self.servicio_repository.get_by_id(servicio_id)
        if not servicio:
            raise HTTPException(status_code=404, detail="No existe el servicio")
        
        if str(servicio.proveedor_id) != str(proveedor_id):
            raise HTTPException(status_code=403, detail="No tienes permisos para modificar este servicio")
        
        cantidad = self.imagen_servicio_repository.contar_por_servicio(servicio_id)
        
        if cantidad >= 10:
            raise HTTPException(status_code=400, detail="Máximo 10 imágenes por servicio")
        
        imagen = self.imagen_servicio_repository.crear(servicio_id, url, cantidad)
        
        if not servicio.imagen_url:
            self.servicio_repository.actualizar(servicio_id, imagen_url=url)
            
        return imagen
    
    def eliminar_imagen(self, imagen_id:UUID, proveedor_id:UUID):
        imagen = self.imagen_servicio_repository.get_by_id(imagen_id)
        if not imagen:
            raise HTTPException(status_code=404, detail="No existe la imagen")
        
        servicio = self.servicio_repository.get_by_id(imagen.servicio_id)
        if not servicio:
            raise HTTPException(status_code=404, detail="No existe el servicio")
        
        if str(servicio.proveedor_id) != str(proveedor_id):
            raise HTTPException(status_code=403, detail="No tienes permisos para modificar este servicio")
        
        imagen_eliminada = self.imagen_servicio_repository.eliminar(imagen_id)
        
        imagenes = self.imagen_servicio_repository.listar_por_servicio(servicio.id)
        ids = [img.id for img in imagenes]
        
        self.imagen_servicio_repository.reordenar(servicio.id, ids)
        
        if imagen.url == servicio.imagen_url:
            if imagenes:
                self.servicio_repository.actualizar(
                    servicio.id,
                    imagen_url=imagenes[0].url
                )
            else:
                self.servicio_repository.actualizar(
                    servicio.id,
                    imagen_url=None
                )
        
        return imagen_eliminada
    
    def reordenar_imagenes(self, servicio_id:UUID, proveedor_id:UUID, ids_en_orden:list[UUID]):
        servicio = self.servicio_repository.get_by_id(servicio_id)
        if not servicio:
            raise HTTPException(status_code=404, detail="No existe el servicio")
        
        if str(servicio.proveedor_id) != str(proveedor_id):
            raise HTTPException(status_code=403, detail="No tienes permisos para modificar este servicio")
        
        imagenes = self.imagen_servicio_repository.listar_por_servicio(servicio_id)
        
        ids_bd = {img.id for img in imagenes}
        ids_recibidos = set(ids_en_orden)
        
        if ids_bd != ids_recibidos:
            raise HTTPException(status_code=400, detail="Las imagenes recibidas no son correctas")
        
        self.imagen_servicio_repository.reordenar(servicio_id, ids_en_orden)
        
        imagenes_actualizadas = self.imagen_servicio_repository.listar_por_servicio(servicio_id)
        
        self.servicio_repository.actualizar(servicio_id, imagen_url=imagenes_actualizadas[0].url)
        
        return imagenes_actualizadas
    
    def listar_imagenes(self, servicio_id:UUID):
        return self.imagen_servicio_repository.listar_por_servicio(servicio_id)