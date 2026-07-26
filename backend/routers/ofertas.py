from fastapi import APIRouter, HTTPException, Depends
from uuid import UUID
from utils.auth_middleware import get_current_user
from schemas.oferta_schema import CrearOferta, OfertaOut, CrearOfertaPorHoras
from services.oferta_service import OfertaService
from schemas.pago_schema import PagoConClientSecret
from services.pago_service import PagoService
from config import Config
from typing import List
from utils.ws_manager import manager

router = APIRouter(tags=["oferta"])

@router.post("/solicitudes/{solicitud_id}/ofertas", response_model=OfertaOut)
async def crear_oferta(solicitud_id:UUID, oferta: CrearOferta, current_user=Depends(get_current_user)):
    service = OfertaService()
    resultado =  service.crear_oferta(solicitud_id, current_user["user_id"], oferta.precio, oferta.descripcion)
    await manager.broadcast(str(solicitud_id), {"tipo": "oferta_actualizada"})
    return resultado

@router.post("/solicitudes/{solicitud_id}/ofertas/confirmar-precio-publicado", response_model=OfertaOut)
async def confirmar_precio_publicado(solicitud_id:UUID, current_user=Depends(get_current_user)):
    service = OfertaService()
    resultado =  service.confirmar_precio_publicado(solicitud_id, current_user["user_id"])
    await manager.broadcast(str(solicitud_id), {"tipo": "oferta_actualizada"})
    return resultado

@router.get("/solicitudes/{solicitud_id}/ofertas", response_model=List[OfertaOut])
async def listar_por_solicitud(solicitud_id:UUID, current_user=Depends(get_current_user)):
    service = OfertaService()
    return service.listar_por_solicitud(solicitud_id, current_user["user_id"])

@router.patch("/ofertas/{oferta_id}/aceptar", response_model=OfertaOut)
async def aceptar_oferta(oferta_id:UUID, current_user=Depends(get_current_user)):
    service = OfertaService()
    resultado =  service.aceptar_oferta(oferta_id, current_user["user_id"])
    await manager.broadcast(str(resultado.solicitud_id), {"tipo": "oferta_actualizada"})
    return resultado

@router.patch("/ofertas/{oferta_id}/rechazar", response_model=OfertaOut)
async def rechazar_oferta(oferta_id:UUID, current_user=Depends(get_current_user)):
    service = OfertaService()
    resultado =  service.rechazar_oferta(oferta_id, current_user["user_id"])
    await manager.broadcast(str(resultado.solicitud_id), {"tipo": "oferta_actualizada"})
    return resultado

@router.post("/ofertas/{oferta_id}/pago", response_model=PagoConClientSecret)
async def crear_pago(oferta_id: UUID, current_user=Depends(get_current_user)):
    service = PagoService()
    return service.crear_pago_desde_oferta(oferta_id, current_user["user_id"])

@router.post("/solicitudes/{solicitud_id}/ofertas/por-horas", response_model=OfertaOut)
async def crear_oferta_por_horas(solicitud_id: UUID, datos: CrearOfertaPorHoras, current_user=Depends(get_current_user)):
    service = OfertaService()
    resultado = service.crear_oferta_por_horas(solicitud_id, current_user["user_id"], datos.horas, datos.descripcion)
    await manager.broadcast(str(solicitud_id), {"tipo": "oferta_actualizada"})
    return resultado