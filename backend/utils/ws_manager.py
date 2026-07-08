from fastapi import WebSocket
from typing import Dict, Set


class ConnectionManager:
    def __init__(self):
        self.salas: Dict[str, Set[WebSocket]] = {}

    async def connect(self, solicitud_id: str, websocket: WebSocket):
        await websocket.accept()
        if solicitud_id not in self.salas:
            self.salas[solicitud_id] = set()
        self.salas[solicitud_id].add(websocket)

    def disconnect(self, solicitud_id: str, websocket: WebSocket):
        if solicitud_id in self.salas:
            self.salas[solicitud_id].discard(websocket)
            if not self.salas[solicitud_id]:
                del self.salas[solicitud_id]

    async def broadcast(self, solicitud_id: str, mensaje: dict):
        if solicitud_id not in self.salas:
            return
        muertos = set()
        for ws in self.salas[solicitud_id]:
            try:
                await ws.send_json(mensaje)
            except Exception:
                muertos.add(ws)
        for ws in muertos:
            self.salas[solicitud_id].discard(ws)


manager = ConnectionManager()
