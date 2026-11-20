from fastapi import Request
from jose import jwt, JWTError
from utils.auth_middleware import decode_token_ws
from slowapi.util import get_remote_address
from slowapi import Limiter
from config import Config


def ip_cliente(request: Request) -> str:
    """IP real del cliente.

    En producción uvicorn solo recibe peticiones del contenedor de Caddy
    (el puerto 8000 no se publica), así que `request.client.host` es siempre
    la IP de Caddy y todos los anónimos compartirían el mismo límite. Caddy
    pone la IP que ve al final de X-Forwarded-For; lo anterior lo puede
    inventar el cliente, así que se usa la última.
    """
    reenviada = request.headers.get("x-forwarded-for", "")
    ips = [ip.strip() for ip in reenviada.split(",") if ip.strip()]
    if ips:
        return ips[-1]
    return get_remote_address(request)


def get_user_id(request: Request) -> str:
    authorization = request.headers.get("Authorization")
    
    if authorization:
        try:
            scheme, token = authorization.split(" ", 1)
            if scheme.lower() == "bearer":
                payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=[Config.JWT_ALGORITH])
                
                return str(payload["user_id"])
                
        except (ValueError, KeyError, JWTError):
            pass
    
    return ip_cliente(request)

limiter = Limiter(key_func = get_user_id)
