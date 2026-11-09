from fastapi import APIRouter, Request

from schemas.lead_schema import CrearLead
from services.lead_service import LeadService
from utils.rate_limiter import limiter

router = APIRouter(prefix="/leads", tags=["leads"])


@router.post("/", status_code=201)
@limiter.limit("5/hour")
async def crear_lead(request: Request, datos: CrearLead):
    if datos.website.strip():
        return {"ok": True}

    LeadService().crear(datos, pagina_origen=datos.pagina_origen)
    return {"ok": True}
