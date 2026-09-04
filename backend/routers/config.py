from fastapi import APIRouter, Response
from config import Config

router = APIRouter(prefix="/config", tags=["config"])

@router.get("/flags")
async def obtener_flags(response: Response):
    response.headers["Cache-Control"] = "public, max-age=300"
    return {
        "pagos_habilitados": Config.PAGOS_HABILITADOS,
        "verificacion_identidad_habilitada": Config.VERIFICACION_IDENTIDAD_HABILITADA,
    }