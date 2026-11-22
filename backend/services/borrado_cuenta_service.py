"""Borrado de cuenta, común al propio usuario (DELETE /usuarios/me) y al admin.

Sin historial compartido con otras personas se borra todo; con historial, se
anonimiza a fondo. Los archivos de Storage se borran antes de tocar la BD: si
fallan, no se cambia nada y se puede reintentar.
"""
import logging
from typing import Literal
from uuid import UUID

from fastapi import HTTPException

from config import Config
from repositories.borrado_cuenta_repository import BorradoCuentaRepository, DatosCuenta
from repositories.solicitud_repository import SolicitudRepository
from services.solicitud_service import SolicitudService
from utils.storage import eliminar_archivos, listar_archivos

logger = logging.getLogger(__name__)


class BorradoCuentaService:
    def __init__(self):
        self.repo = BorradoCuentaRepository()

    async def borrar(self, usuario_id: UUID, admin_id: UUID | None = None) -> Literal["borrada", "anonimizada"]:
        d = self.repo.datos(usuario_id)
        if not d:
            raise HTTPException(status_code=404, detail="No existe este usuario")
        if admin_id is not None and str(admin_id) == str(usuario_id):
            raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
        if d.es_admin:
            raise HTTPException(status_code=400, detail="No se puede eliminar una cuenta de administrador")

        compartido = self.repo.tiene_historial_compartido(d)
        if compartido:
            for solicitud in SolicitudRepository().listar_activas_de_usuario(usuario_id):
                await SolicitudService().cancelar_por_sistema(solicitud.id, motivo="cuenta eliminada")

        try:
            await self._borrar_archivos(d)
        except Exception as e:
            logger.error(f"Borrado de cuenta {usuario_id}: fallo en Storage: {e}")
            raise HTTPException(status_code=502, detail="No se pudieron borrar tus archivos. Inténtalo de nuevo.")

        if compartido:
            self.repo.anonimizar(d)
            return "anonimizada"
        self.repo.borrar_todo(d)
        return "borrada"

    async def _borrar_archivos(self, d: DatosCuenta) -> None:
        servicios = Config.STORAGE_BUCKET_SERVICIOS
        documentos = Config.STORAGE_BUCKET_DOCUMENTOS
        rutas_servicios = await listar_archivos(servicios, f"avatares/{d.usuario_id}")
        if d.perfil_id:
            rutas_servicios += await listar_archivos(servicios, str(d.perfil_id))
        rutas_documentos = await listar_archivos(documentos, str(d.usuario_id))
        await eliminar_archivos(servicios, rutas_servicios)
        await eliminar_archivos(documentos, rutas_documentos)
