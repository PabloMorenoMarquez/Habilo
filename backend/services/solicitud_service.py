from uuid import UUID
from repositories.solicitud_repository import SolicitudRepository
from repositories.servicio_repository import ServicioRepository
from fastapi import HTTPException

TRANSICIONES_VALIDAS = {
    "pendiente": {"aceptada", "rechazada"},
    "aceptada": {"completada"},
    "rechazada": set(),
    "completada": set(),
}


class SolicitudService:
    def __init__(self):
        self.solicitud_repository = SolicitudRepository()
        self.servicio_repository = ServicioRepository()

    def crear(self, servicio_id: UUID, cliente_id: UUID):
        servicio = self.servicio_repository.get_by_id(servicio_id)
        if not servicio or not servicio.activo:
            raise HTTPException(status_code=404, detail="Servicio no encontrado o inactivo")

        existente = self.solicitud_repository.buscar_activa_de_cliente(servicio_id, cliente_id)
        if existente:
            raise HTTPException(status_code=409, detail="Ya tienes una solicitud activa para este servicio")

        return self.solicitud_repository.crear(servicio_id, cliente_id)

    def obtener(self, solicitud_id:UUID, usuario_id:UUID, proveedor_id:UUID=None):
        solicitud = self.solicitud_repository.get_by_id(solicitud_id)
        if not solicitud:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        es_cliente = str(solicitud.cliente_id) == str(usuario_id)
        es_proveedor = False
        if proveedor_id:
            servicio = self.servicio_repository.get_by_id(solicitud.servicio_id)
            es_proveedor = servicio and str(servicio.proveedor_id) == str(proveedor_id)
        if not es_cliente and not es_proveedor:
            raise HTTPException(status_code=403, detail="Sin permisos para ver esta solicitud")
        return solicitud

    def listar_mias(self, usuario_id:UUID, proveedor_id:UUID=None):
        if proveedor_id:
            return self.solicitud_repository.listar_por_proveedor(proveedor_id)
        return self.solicitud_repository.listar_por_cliente(usuario_id)

    def cambiar_estado(self, solicitud_id:UUID, nuevo_estado:str, proveedor_id:UUID):
        solicitud = self.solicitud_repository.get_by_id(solicitud_id)
        if not solicitud:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        servicio = self.servicio_repository.get_by_id(solicitud.servicio_id)
        if not servicio or str(servicio.proveedor_id) != str(proveedor_id):
            raise HTTPException(status_code=403, detail="Solo el proveedor puede cambiar el estado")
        if nuevo_estado not in TRANSICIONES_VALIDAS.get(solicitud.estado, set()):
            raise HTTPException(
                status_code=400,
                detail=f"Transición '{solicitud.estado}' → '{nuevo_estado}' no permitida"
            )
        return self.solicitud_repository.actualizar_estado(solicitud_id, nuevo_estado)
    
    def listar_conversaciones(self, usuario_id: UUID):
        from repositories.mensaje_repository import MensajeRepository
        base = self.solicitud_repository.listar_conversaciones_base(usuario_id)
        ids = [c["id"] for c in base]
        resumen = MensajeRepository().resumen_por_solicitudes(ids, usuario_id) if ids else {}
        for c in base:
            info = resumen.get(str(c["id"]), {})
            c["ultimo_mensaje"] = info.get("ultimo_mensaje")
            c["ultimo_mensaje_fecha"] = info.get("ultimo_mensaje_fecha")
            c["no_leidos"] = info.get("no_leidos", 0)
        return base
