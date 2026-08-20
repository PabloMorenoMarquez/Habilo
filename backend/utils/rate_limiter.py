from fastapi import Request
from jose import jwt, JWTError
from utils.auth_middleware import decode_token_ws
from slowapi.util import get_remote_address
from slowapi import Limiter
from config import Config

    
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
    
    return get_remote_address(request)

limiter = Limiter(key_func = get_user_id)