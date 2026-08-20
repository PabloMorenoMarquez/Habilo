from fastapi import WebSocket
from typing import Dict, Set, List
import time


class ConnectionManager:
    def __init__(self):
        self.salas: Dict[str, Set[WebSocket]] = {}
        self.intentos_conexion: Dict[str, List[float]] = {}

    def permitir_conexion(self, usuario_id: str, limite: int = 20, ventana_segundos: float = 60.0) -> bool:
        ahora = time.monotonic()
        intentos = self.intentos_conexion.get(usuario_id, [])
        intentos = [t for t in intentos if ahora - t < ventana_segundos]

        if len(intentos) >= limite:
            self.intentos_conexion[usuario_id] = intentos
            return False

        intentos.append(ahora)
        self.intentos_conexion[usuario_id] = intentos
        return True

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