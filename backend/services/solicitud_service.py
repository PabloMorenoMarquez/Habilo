from uuid import UUID
from repositories.solicitud_repository import SolicitudRepository
from repositories.servicio_repository import ServicioRepository
from repositories.proveedor_repository import ProveedorRepository
from repositories.bloqueo_repository import BloqueoRepository
from fastapi import HTTPException
from datetime import datetime, timezone

TRANSICIONES_VALIDAS = {
    "negociando": {"pendiente", "cancelada"},
    "pendiente": {"aceptada", "rechazada", "cancelada"},
    "aceptada": {"completada", "cancelada"},
    "rechazada": set(),
    "completada": set(),
    "cancelada": set(),
}

QUIEN_PUEDE = {
    ("pendiente", "aceptada"): "proveedor",
    ("pendiente", "rechazada"): "proveedor",
    ("aceptada", "completada"): "proveedor",
    ("pendiente", "cancelada"): "cliente",
    ("aceptada", "cancelada"): "ambos",
}


class SolicitudService:
    def __init__(self):
        self.solicitud_repository = SolicitudRepository()
        self.servicio_repository = ServicioRepository()
        self.proveedor_repository = ProveedorRepository()
        self.bloqueo_repository = BloqueoRepository()

    def crear(self, servicio_id: UUID, cliente_id: UUID):
        servicio = self.servicio_repository.get_by_id(servicio_id)
        if not servicio or not servicio.activo:
            raise HTTPException(status_code=404, detail="Servicio no encontrado o inactivo")
        
        proveedor = self.proveedor_repository.get_by_id(servicio.proveedor_id)
        
        if str(proveedor.usuario_id) == str(cliente_id):
            raise HTTPException(status_code=400, detail="No puedes realizar una solicitud a tu propio servicio")
        
        if self.bloqueo_repository.existe_bloqueo_entre(cliente_id, proveedor.usuario_id):
            raise HTTPException(status_code=403, detail="No puedes contactar con este usuario")

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

    def cambiar_estado(self, solicitud_id:UUID, nuevo_estado:str,usuario_id:UUID, proveedor_id:UUID = None, motivo:str = None):  
        solicitud = self.solicitud_repository.get_by_id(solicitud_id)
        if not solicitud:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        servicio = self.servicio_repository.get_by_id(solicitud.servicio_id)
        
        es_cliente = False
        es_proveedor = False
        
        if str(usuario_id) == str(solicitud.cliente_id):
            es_cliente = True
        
        if proveedor_id is not None and proveedor_id == servicio.proveedor_id:
            es_proveedor = True
        
        if nuevo_estado not in TRANSICIONES_VALIDAS.get(solicitud.estado, set()):
            raise HTTPException(
                status_code=400,
                detail=f"Transición '{solicitud.estado}' → '{nuevo_estado}' no permitida"
            ) 
        
        rol_requerido = QUIEN_PUEDE.get((solicitud.estado, nuevo_estado))
        
        if rol_requerido == "proveedor" and not es_proveedor:
            raise HTTPException(status_code=403, detail="Solo el proveedor puede hacer este cambio")
        elif rol_requerido == "cliente" and not es_cliente:
            raise HTTPException(status_code=403, detail="Solo el cliente puede hacer este cambio")
        elif rol_requerido == "ambos" and not (es_cliente or es_proveedor):
            raise HTTPException(status_code=403, detail="No tienes permisos sobre esta solicitud")
        
        if nuevo_estado == "cancelada" and motivo is None:
            raise HTTPException(status_code=400, detail="No ha especificado el motivo de la cancelación")
        
        if solicitud.estado == "pendiente" and nuevo_estado == "aceptada":
            from services.pago_service import PagoService
            PagoService().capturar_pago_de_solicitud(solicitud_id)

        if solicitud.estado == "pendiente" and nuevo_estado in ("rechazada", "cancelada"):
            from services.pago_service import PagoService
            PagoService().cancelar_pago_de_solicitud(solicitud_id)
            
        if solicitud.estado == "aceptada" and nuevo_estado == "cancelada":
            from services.pago_service import PagoService
            PagoService().reembolsar_pago_de_solicitud(solicitud_id)     
        
        if nuevo_estado == "completada":
            self.solicitud_repository.marcar_fecha_completada(solicitud_id)
        
        return self.solicitud_repository.actualizar_estado(solicitud_id, nuevo_estado, motivo)
    
    def listar_conversaciones(self, usuario_id: UUID):
        from repositories.mensaje_repository import MensajeRepository
        from repositories.valoracion_repository import ValoracionRepository
        
        base = self.solicitud_repository.listar_conversaciones_base(usuario_id)
        ids = [c["id"] for c in base]
        resumen = MensajeRepository().resumen_por_solicitudes(ids, usuario_id) if ids else {}
        valoradas = ValoracionRepository().obtener_solicitudes_valoradas(ids) if ids else set()
        for c in base:
            info = resumen.get(str(c["id"]), {})
            c["ultimo_mensaje"] = info.get("ultimo_mensaje")
            c["ultimo_mensaje_fecha"] = info.get("ultimo_mensaje_fecha")
            c["no_leidos"] = info.get("no_leidos", 0)
            c["ya_valorada"] = str(c["id"]) in valoradas
        return base
    
    def cancelar_por_sistema(self, solicitud_id: UUID, motivo: str):
        solicitud = self.solicitud_repository.get_by_id(solicitud_id)
        if not solicitud:
            return None
        if "cancelada" not in TRANSICIONES_VALIDAS.get(solicitud.estado, set()):
            return None  # ya está en un estado terminal, no hay nada que cancelar
        
        from services.pago_service import PagoService
        if solicitud.estado == "pendiente":
            PagoService().cancelar_pago_de_solicitud(solicitud_id)
        elif solicitud.estado == "aceptada":
            PagoService().reembolsar_pago_de_solicitud(solicitud_id)
            
        return self.solicitud_repository.actualizar_estado(solicitud_id, "cancelada", motivo)
    
    def marcar_pendiente_por_pago(self, solicitud_id: UUID):
        solicitud = self.solicitud_repository.get_by_id(solicitud_id)
        if not solicitud:
            raise HTTPException(status_code=404, detail="No existe la solicitud")
        if solicitud.estado != "negociando":
            return solicitud
        return self.solicitud_repository.actualizar_estado(solicitud_id, "pendiente")
    
    def autocancelar_negociaciones_inactivas(self):
        from datetime import timedelta
        limite = datetime.now(timezone.utc) - timedelta(days=7)
        solicitudes = self.solicitud_repository.listar_negociando_inactivas(limite)
        for solicitud in solicitudes:
            self.cancelar_por_sistema(solicitud.id, motivo="inactividad")
