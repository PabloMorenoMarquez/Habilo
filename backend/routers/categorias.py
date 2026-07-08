from fastapi import APIRouter, HTTPException, Depends
from uuid import UUID
from typing import List
from utils.auth_middleware import get_current_user
from schemas.categoria_schema import CrearCategoria, CategoriaOut
from services.categoria_service import CategoriaService

router = APIRouter(prefix="/categorias", tags=["categorias"])


@router.get("/", response_model=List[CategoriaOut])
async def listar_categorias():
    service = CategoriaService()
    return service.listar()


@router.get("/{categoria_id}", response_model=CategoriaOut)
async def obtener_categoria(categoria_id: UUID):
    service = CategoriaService()
    categoria = service.obtener(categoria_id)
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoria no encontrada")
    return categoria


@router.post("/", response_model=CategoriaOut)
async def crear_categoria(datos: CrearCategoria, current_user=Depends(get_current_user)):
    service = CategoriaService()
    return service.crear(datos.nombre, datos.icono, datos.descripcion)
