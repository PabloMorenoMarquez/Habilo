from fastapi import APIRouter, Request, Depends
from schemas.feedback_schema import CrearFeedback
from services.feedback_service import FeedbackService
from utils.auth_middleware import get_current_user_opcional
from utils.rate_limiter import limiter

router = APIRouter(prefix="/feedback", tags=["feedback"])

@router.post("/")
@limiter.limit("10/hour")
async def crear_feedback(request: Request, datos: CrearFeedback, current_user=Depends(get_current_user_opcional)):
    service = FeedbackService()
    usuario_id = current_user["user_id"] if current_user else None
    service.crear(datos.tipo.value, datos.mensaje, usuario_id, datos.pagina)
    return {"ok": True}