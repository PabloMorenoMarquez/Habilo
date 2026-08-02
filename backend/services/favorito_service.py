from uuid import UUID
from repositories.favorito_repository import FavoritoRepository
from services.servicio_service import ServicioService
from repositories.proveedor_repository import ProveedorRepository
from repositories.user_repository import UserRepository
from fastapi import HTTPException

class FavoritoService:
    def __init__(self):
        self.favorito_repository = FavoritoRepository()
        self.servicio_service = ServicioService()
        self.proveedor_repository = ProveedorRepository()
        self.user_repository = UserRepository()
    
    def marcar_servicio(self, usuario_id: UUID, servicio_id: UUID):
        return self.favorito_repository.marcar_servicio(usuario_id, servicio_id)


    def desmarcar_servicio(self, usuario_id: UUID, servicio_id: UUID):
        return self.favorito_repository.desmarcar_servicio(usuario_id, servicio_id)


    def marcar_proveedor(self, usuario_id: UUID, perfil_id: UUID):
        return self.favorito_repository.marcar_proveedor(usuario_id, perfil_id)


    def desmarcar_proveedor(self, usuario_id: UUID, perfil_id: UUID):
        return self.favorito_repository.desmarcar_proveedor(usuario_id, perfil_id)
        
    def listar_servicios_favoritos(self, usuario_id:UUID):
        ids_favoritos = self.favorito_repository.listar_ids_favoritos_servicio(usuario_id)
        
        servicios=[]
        
        for id in ids_favoritos:
            servicio = self.servicio_service.obtener_detalle_publico(id, usuario_id)
            servicios.append(servicio)
        
        return servicios
    
    def listar_proveedores_favoritos(self, usuario_id:UUID):
        ids_favoritos = self.favorito_repository.listar_ids_favoritos_proveedor(usuario_id)
                    
        proveedores=[]
        
        for id in ids_favoritos:
            perfil = self.proveedor_repository.get_by_id(id)
            if not perfil:
                continue
            usuario = self.user_repository.get_by_id(perfil.usuario_id)
            proveedores.append({
                "id": perfil.id,
                "nombre": usuario.nombre if usuario else None,
                "foto_url": usuario.foto_url if usuario else None,
                "descripcion": perfil.descripcion,
                "valoracion_media": perfil.valoracion_media,
                "num_valoraciones": perfil.num_valoraciones,
                "verificado": perfil.verificado,
            })
        
        return proveedores
    