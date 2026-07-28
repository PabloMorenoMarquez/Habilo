from uuid import UUID
from fastapi import HTTPException
from repositories.oferta_repository import OfertaRepository
from services.mensaje_service import MensajeService
from repositories.servicio_repository import ServicioRepository
from repositories.solicitud_repository import SolicitudRepository
from decimal import Decimal, ROUND_HALF_UP

class OfertaService:
    
    def __init__(self):
        self.oferta_repository = OfertaRepository()
        self.mensaje_service = MensajeService()
        self.servicio_repository = ServicioRepository()
        self.solicitud_repository = SolicitudRepository()
        
    def crear_oferta(self, solicitud_id:UUID, autor_id:UUID, precio:Decimal, descripcion:str | None = None):
        solicitud = self.solicitud_repository.get_by_id(solicitud_id)
        if not solicitud:
            raise HTTPException(status_code=404, detail="No existe la solicitud")
        
        if solicitud.estado != "negociando":
            raise HTTPException(status_code=400, detail="Ya no se pueden hacer ofertas sobre esta solicitud")
        
        self.mensaje_service._verificar_acceso(solicitud_id, autor_id)
        
        servicio = self.servicio_repository.get_by_id(solicitud.servicio_id)
        if servicio and servicio.tipo_precio == "hora":
            raise HTTPException(status_code=400, detail="Para servicios por horas, usa 'Proponer horas'")
        
        oferta = self.oferta_repository.obtener_pendiente_de_solicitud(solicitud_id)
        
        if oferta:
            self.oferta_repository.actualizar_estado(oferta.id, "reemplazada")
        
        oferta_nueva = self.oferta_repository.crear(solicitud_id, autor_id, precio, descripcion)
        
        self.solicitud_repository.actualizar_ultima_actividad(solicitud_id)
        
        return oferta_nueva
    
    def confirmar_precio_publicado(self, solicitud_id:UUID, cliente_id:UUID):
        solicitud = self.solicitud_repository.get_by_id(solicitud_id)
        if not solicitud:
            raise HTTPException(status_code=404, detail="No existe la solicitud")
        
        if solicitud.estado != "negociando":
            raise HTTPException(status_code=400, detail="Ya no se pueden hacer ofertas sobre esta solicitud")
        
        if str(cliente_id) != str(solicitud.cliente_id):
            raise HTTPException(status_code=403, detail="No es el cliente de la solicitud")
        
        servicio = self.servicio_repository.get_by_id(solicitud.servicio_id)
        if not servicio.tipo_precio == "fijo":
            raise HTTPException(status_code=400, detail="Este servicio requiere una oferta porque el precio no es fijo")
        
        oferta = self.oferta_repository.obtener_pendiente_de_solicitud(solicitud_id)     
        if oferta:
            self.oferta_repository.actualizar_estado(oferta.id, "reemplazada")
        
        oferta_nueva = self.oferta_repository.crear(solicitud_id, cliente_id, servicio.precio)
        
        self.solicitud_repository.actualizar_ultima_actividad(solicitud_id)
        
        return self.oferta_repository.actualizar_estado(oferta_nueva.id, "aceptada")
    
    def aceptar_oferta(self, oferta_id:UUID, usuario_id:UUID):
        oferta = self.oferta_repository.get_by_id(oferta_id)
        if not oferta:
            raise HTTPException(status_code=404, detail="No existe la oferta")
        
        if oferta.estado != "pendiente":
            raise HTTPException(status_code=400, detail="Esta oferta ya no está disponible")
        
        solicitud = self.solicitud_repository.get_by_id(oferta.solicitud_id)
        
        self.mensaje_service._verificar_acceso(solicitud.id, usuario_id)
        
        if str(usuario_id) == str(oferta.autor_id):
            raise HTTPException(status_code=403, detail="No puedes aceptar tu propia oferta")
        
        return self.oferta_repository.actualizar_estado(oferta_id, "aceptada")
        
    def rechazar_oferta(self, oferta_id:UUID, usuario_id:UUID):
        oferta = self.oferta_repository.get_by_id(oferta_id)
        if not oferta:
            raise HTTPException(status_code=404, detail="No existe la oferta")
        
        if oferta.estado != "pendiente":
            raise HTTPException(status_code=400, detail="Esta oferta ya no está disponible")
        
        solicitud = self.solicitud_repository.get_by_id(oferta.solicitud_id)
        
        self.mensaje_service._verificar_acceso(solicitud.id, usuario_id)
        
        return self.oferta_repository.actualizar_estado(oferta_id, "rechazada")
    
    def listar_por_solicitud(self, solicitud_id:UUID, usuario_id:UUID):
        self.mensaje_service._verificar_acceso(solicitud_id, usuario_id)
        return self.oferta_repository.listar_por_solicitud(solicitud_id)
    
    def crear_oferta_por_horas(self, solicitud_id: UUID, autor_id: UUID, horas: Decimal, descripcion: str | None = None):
        solicitud = self.solicitud_repository.get_by_id(solicitud_id)
        if not solicitud:
            raise HTTPException(status_code=404, detail="No existe la solicitud")
        if solicitud.estado != "negociando":
            raise HTTPException(status_code=400, detail="Ya no se pueden hacer ofertas sobre esta solicitud")

        self.mensaje_service._verificar_acceso(solicitud_id, autor_id)

        servicio = self.servicio_repository.get_by_id(solicitud.servicio_id)
        if not servicio or servicio.tipo_precio != "hora":
            raise HTTPException(status_code=400, detail="Este servicio no es de precio por hora")

        precio = (servicio.precio * horas).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        oferta_existente = self.oferta_repository.obtener_pendiente_de_solicitud(solicitud_id)
        if oferta_existente:
            self.oferta_repository.actualizar_estado(oferta_existente.id, "reemplazada")

        oferta = self.oferta_repository.crear(solicitud_id, autor_id, precio, descripcion, horas)

        self.solicitud_repository.actualizar_ultima_actividad(solicitud_id)
        
        return oferta
        
        
        