from supabase import create_client
from config import Config

_client = None


def get_supabase():
    global _client
    if _client is None:
        _client = create_client(Config.SUPABASE_URL, Config.SUPABASE_SERVICE_KEY)
    return _client


def generar_signed_upload_url(bucket: str, path: str, expires_in: int = 300) -> dict:
    """Genera una URL firmada para subida directa desde el frontend."""
    client = get_supabase()
    result = client.storage.from_(bucket).create_signed_upload_url(path)
    return {
        "signed_url": result["signedURL"],
        "path": path,
        "token": result.get("token")
    }


def get_public_url(bucket: str, path: str) -> str:
    client = get_supabase()
    return client.storage.from_(bucket).get_public_url(path)
