from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends, Query
from uuid import UUID
from typing import List
import time
from utils.auth_middleware import get_current_user, decode_token_ws
from utils.ws_manager import manager
from schemas.mensaje_schema import MensajeOut
from services.mensaje_service import MensajeService
from config import Config
from schemas.paginacion_schema import PaginatedResponse

router = APIRouter(tags=["mensajes"])


@router.get("/solicitudes/{solicitud_id}/mensajes", response_model=PaginatedResponse[MensajeOut])
async def historial_mensajes(solicitud_id: UUID,limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0), current_user=Depends(get_current_user)):
    service = MensajeService()
    mensajes, has_more = service.historial(solicitud_id, current_user["user_id"], limit=limit, offset=offset)
    return PaginatedResponse(items=mensajes, has_more=has_more, limit=limit, offset=offset)


@router.websocket("/ws/solicitudes/{solicitud_id}")
async def chat_websocket(
    solicitud_id: UUID,
    websocket: WebSocket,
    token: str = Query(...)
):
    payload = decode_token_ws(token)
    if not payload:
        await websocket.close(code=4001)
        return

    usuario_id = payload["user_id"]
    
    origin = websocket.headers.get("origin")
    if origin and origin.rstrip("/") not in Config.FRONTEND_URLS: #Cambiar if origin not in Config.FRONTEND_URLS para exigir Origin siempre
        await websocket.close(code=4003)
        return

    if not manager.permitir_conexion(str(usuario_id)):
        await websocket.close(code=4029)
        return

    service = MensajeService()

    try:
        service.verificar_acceso(solicitud_id, usuario_id)
    except HTTPException:
        await websocket.close(code=4003)
        return

    sala = str(solicitud_id)
    await manager.connect(sala, websocket)

    ultimo_mensaje: float | None = None
    intervalo_minimo = 0.5

    try:
        while True:
            data = await websocket.receive_json()
            MAX_LONGITUD_MENSAJE = 2000
            contenido = data.get("contenido", "").strip()
            if not contenido:
                continue
            
            if len(contenido) > MAX_LONGITUD_MENSAJE:
                await websocket.send_json({"error": f"El mensaje no puede superar los {MAX_LONGITUD_MENSAJE} caracteres"})
                continue

            ahora = time.monotonic()
            if ultimo_mensaje is not None and (ahora - ultimo_mensaje) < intervalo_minimo:
                await websocket.send_json({"error": "Estás enviando mensajes muy rápido"})
                continue
            ultimo_mensaje = ahora

            try:
                mensaje = service.enviar(solicitud_id, usuario_id, contenido)
            except HTTPException as e:
                await websocket.send_json({"error": e.detail})
                continue
            await manager.broadcast(sala, {
                "id": str(mensaje.id),
                "solicitud_id": str(mensaje.solicitud_id),
                "remitente_id": str(mensaje.remitente_id),
                "contenido": mensaje.contenido,
                "fecha": mensaje.fecha.isoformat() if mensaje.fecha else None
            })
    except WebSocketDisconnect:
        manager.disconnect(sala, websocket)

@router.patch("/solicitudes/{solicitud_id}/mensajes/leer")
async def marcar_mensajes_leidos(solicitud_id: UUID, current_user=Depends(get_current_user)):
    service = MensajeService()
    service.marcar_leidos(solicitud_id, current_user["user_id"])
    return {"ok": True}