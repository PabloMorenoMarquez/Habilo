from uuid import UUID
from fastapi import HTTPException
from repositories.mensaje_repository import MensajeRepository
from repositories.solicitud_repository import SolicitudRepository
from repositories.servicio_repository import ServicioRepository


class MensajeService:
    def __init__(self):
        self.mensaje_repository = MensajeRepository()
        self.solicitud_repository = SolicitudRepository()
        self.servicio_repository = ServicioRepository()

    def _verificar_acceso(self, solicitud_id:UUID, usuario_id:UUID):
        solicitud = self.solicitud_repository.get_by_id(solicitud_id)
        if not solicitud:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        if str(solicitud.cliente_id) == str(usuario_id):
            return solicitud
        servicio = self.servicio_repository.get_by_id(solicitud.servicio_id)
        if servicio:
            from repositories.proveedor_repository import ProveedorRepository
            repo = ProveedorRepository()
            perfil = repo.get_by_usuario_id(usuario_id)
            if perfil and str(servicio.proveedor_id) == str(perfil.id):
                return solicitud
        raise HTTPException(status_code=403, detail="Sin acceso a esta conversación")

    def enviar(self, solicitud_id:UUID, remitente_id:UUID, contenido:str):
        self._verificar_acceso(solicitud_id, remitente_id)
        return self.mensaje_repository.crear(solicitud_id, remitente_id, contenido)

    def historial(self, solicitud_id:UUID, usuario_id:UUID):
        self._verificar_acceso(solicitud_id, usuario_id)
        return self.mensaje_repository.listar_por_solicitud(solicitud_id)
