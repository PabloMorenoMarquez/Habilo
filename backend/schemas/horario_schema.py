"""Horario semanal del profesor: por cada día (1 = lunes … 7 = domingo), de 1 a 3 tramos.

Formato guardado en perfiles_proveedor.horario (JSONB):
    {"1": [{"inicio": "09:00", "fin": "13:00"}, {"inicio": "15:00", "fin": "20:00"}], ...}
Solo aparecen los días disponibles; un horario vacío se guarda como NULL.
"""
from typing import Literal

from pydantic import BaseModel, Field

HORA = r"^([01]\d|2[0-3]):[0-5]\d$"
MAX_TRAMOS = 3

DiaSemana = Literal["1", "2", "3", "4", "5", "6", "7"]


class Tramo(BaseModel):
    inicio: str = Field(pattern=HORA)
    fin: str = Field(pattern=HORA)


HorarioEntrada = dict[DiaSemana, list[Tramo]]


def normalizar_horario(h: HorarioEntrada | None) -> dict | None:
    """Valida las reglas entre tramos y devuelve el horario como dict plano, ordenado.

    Las horas HH:MM se comparan como texto: con dos dígitos, el orden coincide.
    """
    if not h:
        return None
    resultado: dict[str, list[dict]] = {}
    for dia in sorted(h):
        tramos = sorted(h[dia], key=lambda t: t.inicio)
        if not tramos:
            raise ValueError("Un día disponible necesita al menos un tramo")
        if len(tramos) > MAX_TRAMOS:
            raise ValueError("Como mucho 3 tramos por día")
        for tramo in tramos:
            if tramo.fin <= tramo.inicio:
                raise ValueError("La hora de fin debe ser posterior a la de inicio")
        for anterior, siguiente in zip(tramos, tramos[1:]):
            if siguiente.inicio < anterior.fin:
                raise ValueError("Los tramos se solapan")
        resultado[dia] = [t.model_dump() for t in tramos]
    return resultado
