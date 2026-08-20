from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from utils.google_oauth import get_google_oauth_client
from utils.facebook_oauth import get_facebook_oauth_client
from config import Config
from utils.jwt_handler import create_access_token
from services.user_service import UserService
import httpx   
from utils.rate_limiter import limiter

router = APIRouter(prefix="/auth", tags=["auth"])

@router.get("/google/login")
@limiter.limit("10/minute")
async def google_login(request: Request):
    google = get_google_oauth_client()
    redirect_uri = Config.BACKEND_URL.rstrip("/") + "/auth/google/callback"
    return await google.authorize_redirect(request, redirect_uri)

@router.get("/google/callback")
@limiter.limit("10/minute")
async def google_callback(request: Request):
    try:
        google = get_google_oauth_client()

        token = await google.authorize_access_token(request)

        user_info = token.get("userinfo")
        if not user_info:
            user_info = await google.parse_id_token(request, token)

        if not user_info:
            raise HTTPException(status_code=400, detail="No se pudo obtener informacion del usuario")

        user_service = UserService()
        user = user_service.create_or_update(email=user_info["email"], nombre=user_info["name"], foto_url=user_info["picture"])

        user_data = {
            "id": str(user.id),
            "email": user.email,
            "name": user.nombre
        }

        jwt_token = create_access_token(user_data)

        return RedirectResponse(f"{Config.FRONTEND_URL}?token={jwt_token}")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error en callback de Google: {str(e)}")
    

@router.get("/facebook/login")
@limiter.limit("10/minute")
async def facebook_login(request: Request):
    facebook = get_facebook_oauth_client()
    redirect_uri = Config.BACKEND_URL.rstrip("/") + "/auth/facebook/callback"
    return await facebook.authorize_redirect(request, redirect_uri)

@router.get("/facebook/callback")
@limiter.limit("10/minute")
async def facebook_callback(request: Request):
    try:
        facebook = get_facebook_oauth_client()

        token = await facebook.authorize_access_token(request)

        access_token = token.get("access_token")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
            "https://graph.facebook.com/me",
            params={
                "fields": "id,name,email,picture",
                "access_token": access_token
            }
        )
        user_info = response.json()

        if not user_info:
            raise HTTPException(status_code=400, detail="No se pudo obtener informacion del usuario")
        
        user_service = UserService()
        user = user_service.create_or_update(email=user_info["email"], nombre=user_info["name"], foto_url=user_info["picture"]["data"]["url"])
        
        user_data = {
            "id": str(user.id),
            "email": user.email,
            "name": user.nombre
        }

        jwt_token = create_access_token(user_data)

        return RedirectResponse(f"{Config.FRONTEND_URL}?token={jwt_token}")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error en callback de Facebook: {str(e)}")