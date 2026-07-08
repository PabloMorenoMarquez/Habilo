from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from config import Config

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        return jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=[Config.JWT_ALGORITH])
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Token no válido: {str(e)}")


def decode_token_ws(token: str):
    """Valida JWT para WebSocket (token llega por query param, no por header)."""
    try:
        return jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=[Config.JWT_ALGORITH])
    except JWTError:
        return None
