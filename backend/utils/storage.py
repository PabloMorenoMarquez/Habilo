from supabase import create_client, ClientOptions
from config import Config
from fastapi import HTTPException
from starlette.concurrency import run_in_threadpool
from tenacity import retry, stop_after_attempt, wait_exponential
import logging
_client = None

logger = logging.getLogger(__name__)

_retry_storage = retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=0.3, min=0.3, max=2),
    reraise=True,
)

def get_supabase():
    global _client
    if _client is None:
        _client = create_client(
            Config.SUPABASE_URL,
            Config.SUPABASE_SERVICE_KEY,
            options=ClientOptions(storage_client_timeout=10),
        )
    return _client

@_retry_storage
async def generar_signed_upload_url(bucket: str, path: str, expires_in: int = 300) -> dict:
    """Genera una URL firmada para subida directa desde el frontend."""
    client = get_supabase()
    result = await run_in_threadpool(
        client.storage.from_(bucket).create_signed_upload_url, path
    )
    return {
        "signed_url": result["signed_url"],
        "path": path,
        "token": result.get("token")
    }


def get_public_url(bucket: str, path: str) -> str:
    client = get_supabase()
    return client.storage.from_(bucket).get_public_url(path)

@_retry_storage
async def generar_signed_download_url(bucket:str, path:str, expires_in: int = 120) -> dict:
    client = get_supabase()
    
    result = await run_in_threadpool(
        client.storage.from_(bucket).create_signed_url, path, expires_in
    )
    
    return {
        "signed_url": result["signedURL"],
        "path": path,
        "token": result.get("token")
    }

async def eliminar_archivo(bucket: str, path: str) -> bool:
    # Borra un archivo de Supabase Storage
    client = get_supabase()
    try:
        await run_in_threadpool(client.storage.from_(bucket).remove, [path])
        return True
    except Exception as e:
        logger.error(f"No se pudo eliminar {path} de {bucket}: {e}")
        return False


def extraer_path_desde_url_publica(bucket: str, url: str) -> str | None:
    #Recupera el path interno (el que se usó al generar la signed URL) a partir
    # de una URL pública de Supabase Storage, del tipo:
    # https://<proyecto>.supabase.co/storage/v1/object/public/<bucket>/<path>
    # Devuelve None si la URL no tiene el formato esperado.
    marcador = f"/object/public/{bucket}/"
    if marcador not in url:
        return None
    return url.split(marcador, 1)[1]
