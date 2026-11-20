from fastapi import APIRouter, HTTPException, Request

from schemas.resena_alumno_schema import CrearResenaAlumno, FormularioResenaOut
from services.resena_alumno_service import ResenaAlumnoService
from utils.rate_limiter import limiter

router = APIRouter(prefix="/resenas", tags=["resenas"])


@router.get("/{codigo}", response_model=FormularioResenaOut)
# El 200/404 dice si un código existe: sin límite se podrían probar códigos.
@limiter.limit("30/minute")
async def obtener_formulario(request: Request, codigo: str):
    formulario = ResenaAlumnoService().formulario(codigo)
    if formulario is None:
        raise HTTPException(status_code=404, detail="No existe el enlace de opiniones")
    return formulario


@router.post("/{codigo}", status_code=201)
@limiter.limit("5/hour")
async def crear_resena(request: Request, codigo: str, datos: CrearResenaAlumno):
    # Campo trampa relleno: es un bot. Respondemos como si nada sin guardar.
    if datos.website.strip():
        return {"ok": True}

    # Un duplicado tampoco se guarda, pero responde igual (ver el servicio).
    ResenaAlumnoService().crear(codigo, datos)
    return {"ok": True}
