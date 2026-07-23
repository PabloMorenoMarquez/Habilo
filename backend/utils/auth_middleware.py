from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from config import Config

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(
            token,
            Config.JWT_SECRET_KEY,
            algorithms=[Config.JWT_ALGORITH]
        )
    except JWTError as e:
        raise HTTPException(
            status_code=401,
            detail=f"Token no válido: {str(e)}"
        )

    from repositories.user_repository import UserRepository

    usuario = UserRepository().get_by_id(payload["user_id"])

    if not usuario or usuario.baneado:
        raise HTTPException(
            status_code=403,
            detail="Tu cuenta ha sido suspendida"
        )

    payload["es_admin"] = usuario.es_admin
    return payload


def get_current_admin(current_user: dict = Depends(get_current_user)):
    if not current_user.get("es_admin"):
        raise HTTPException(
            status_code=403,
            detail="No tienes permisos de administrador"
        )
    return current_user


def decode_token_ws(token: str):
    try:
        payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=[Config.JWT_ALGORITH])
    except JWTError:
        return None

    from repositories.user_repository import UserRepository
    usuario = UserRepository().get_by_id(payload["user_id"])
    if not usuario or usuario.baneado:
        return None

    return payload
