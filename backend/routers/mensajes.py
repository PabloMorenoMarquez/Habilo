from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends, Query
from uuid import UUID
from typing import List
from utils.auth_middleware import get_current_user, decode_token_ws
from utils.ws_manager import manager
from schemas.mensaje_schema import MensajeOut
from services.mensaje_service import MensajeService

router = APIRouter(tags=["mensajes"])


@router.get("/solicitudes/{solicitud_id}/mensajes", response_model=List[MensajeOut])
async def historial_mensajes(solicitud_id: UUID, current_user=Depends(get_current_user)):
    service = MensajeService()
    return service.historial(solicitud_id, current_user["user_id"])


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
    sala = str(solicitud_id)
    service = MensajeService()

    await manager.connect(sala, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            contenido = data.get("contenido", "").strip()
            if not contenido:
                continue
            mensaje = service.enviar(solicitud_id, usuario_id, contenido)
            await manager.broadcast(sala, {
                "id": str(mensaje.id),
                "solicitud_id": str(mensaje.solicitud_id),
                "remitente_id": str(mensaje.remitente_id),
                "contenido": mensaje.contenido,
                "fecha": mensaje.fecha.isoformat() if mensaje.fecha else None
            })
    except WebSocketDisconnect:
        manager.disconnect(sala, websocket)
    except HTTPException:
        await websocket.close(code=4003)
        manager.disconnect(sala, websocket)
