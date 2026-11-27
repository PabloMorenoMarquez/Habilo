"""Migración 2026-11-22_horario_por_dias.sql contra PostgreSQL real."""
import secrets
import uuid
from pathlib import Path

import pytest
from sqlalchemy import text

from models.usuario import Usuario
from models.perfil_proveedor import Perfil_Proveedor

pytestmark = pytest.mark.integration

SQL = (Path(__file__).resolve().parents[2] / "migrations" / "2026-11-22_horario_por_dias.sql").read_text(encoding="utf-8")


def _perfil(s, **campos):
    u = Usuario(id=uuid.uuid4(), email=f"{uuid.uuid4().hex}@test.com", nombre="Profe")
    s.add(u)
    s.flush()
    p = Perfil_Proveedor(id=uuid.uuid4(), usuario_id=u.id, radio_km_disponible=10,
                         codigo_referido=secrets.token_hex(4).upper(), **campos)
    s.add(p)
    s.flush()
    return p.id


def _migrar(Session):
    with Session() as s:
        s.execute(text(SQL))
        s.commit()


def test_migracion_convierte_horario_antiguo(Session):
    with Session() as s:
        pid = _perfil(s, dias_disponibles="2, 3", hora_inicio="17:00", hora_fin="21:00")
        s.commit()

    _migrar(Session)

    with Session() as s:
        tramo = [{"inicio": "17:00", "fin": "21:00"}]
        assert s.get(Perfil_Proveedor, pid).horario == {"2": tramo, "3": tramo}


def test_migracion_es_idempotente_y_respeta_vacios(Session):
    ya = {"5": [{"inicio": "10:00", "fin": "12:00"}]}
    with Session() as s:
        sin_horas = _perfil(s, dias_disponibles="1,2", hora_inicio=None, hora_fin=None)
        relleno = _perfil(s, dias_disponibles="1", hora_inicio="09:00", hora_fin="10:00", horario=ya)
        s.commit()

    _migrar(Session)
    _migrar(Session)

    with Session() as s:
        assert s.get(Perfil_Proveedor, sin_horas).horario is None
        assert s.get(Perfil_Proveedor, relleno).horario == ya
