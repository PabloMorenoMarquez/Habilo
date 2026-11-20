"""Qué foto de perfil se puede mostrar en público.

La foto que llega de Google o Facebook al iniciar sesión no se publica: el
profesor no la ha elegido para su ficha. Solo se publica la que sube él mismo
desde «Mi perfil», que se guarda en `avatares/{usuario_id}/foto` del bucket de
servicios.
"""
from typing import Optional
from uuid import UUID

from config import Config


def url_foto_subida(usuario_id: UUID) -> str:
    base = (Config.SUPABASE_URL or "").rstrip("/")
    return f"{base}/storage/v1/object/public/{Config.STORAGE_BUCKET_SERVICIOS}/avatares/{usuario_id}/foto"


def es_foto_subida(foto_url: Optional[str], usuario_id: UUID) -> bool:
    if not foto_url or not usuario_id:
        return False
    return foto_url.split("?", 1)[0] == url_foto_subida(usuario_id)


def avatar_publico(foto_url: Optional[str], usuario_id: UUID) -> Optional[str]:
    return foto_url if es_foto_subida(foto_url, usuario_id) else None
