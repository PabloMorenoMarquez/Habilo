"""Contador público de reseñas (`GET /servicio/resumen`) contra PostGIS real."""
import secrets
import uuid

import pytest
from sqlalchemy import delete

from models.usuario import Usuario
from models.perfil_proveedor import Perfil_Proveedor
from models.resena_alumno import ResenaAlumno

pytestmark = pytest.mark.integration


@pytest.fixture
def repo(pg_engine):
    from repositories.servicio_repository import ServicioRepository
    return ServicioRepository()


def _perfil(s, publico=True):
    u = Usuario(id=uuid.uuid4(), email=f"{uuid.uuid4().hex}@test.com", nombre="Profe")
    s.add(u)
    s.flush()
    p = Perfil_Proveedor(id=uuid.uuid4(), usuario_id=u.id, radio_km_disponible=10,
                         codigo_referido=secrets.token_hex(4).upper(), codigo_resenas=secrets.token_hex(4),
                         ciudad="Talavera", perfil_publico=publico)
    s.add(p)
    s.flush()
    return u, p


def _resena(s, perfil_id, estado):
    r = ResenaAlumno(id=uuid.uuid4(), perfil_id=perfil_id, puntuacion=5, comentario="Muy buena",
                     autor_nombre="Eva", relacion="alumno", antiguedad="3-12m",
                     consentimiento=True, estado=estado)
    s.add(r)
    s.flush()
    return r


def test_resumen_cuenta_resenas_de_alumnos_aprobadas_y_visibles(Session, repo):
    antes = repo.resumen()["resenas"]

    s = Session()
    u_pub, p_pub = _perfil(s, publico=True)
    u_priv, p_priv = _perfil(s, publico=False)
    resenas = [
        _resena(s, p_pub.id, "aprobada"),   # cuenta
        _resena(s, p_pub.id, "pendiente"),  # sin moderar: no cuenta
        _resena(s, p_pub.id, "rechazada"),  # no cuenta
        _resena(s, p_priv.id, "aprobada"),  # perfil privado, no se ve: no cuenta
    ]
    s.commit()
    try:
        assert repo.resumen()["resenas"] == antes + 1
    finally:
        s.execute(delete(ResenaAlumno).where(ResenaAlumno.id.in_([r.id for r in resenas])))
        s.execute(delete(Perfil_Proveedor).where(Perfil_Proveedor.id.in_([p_pub.id, p_priv.id])))
        s.execute(delete(Usuario).where(Usuario.id.in_([u_pub.id, u_priv.id])))
        s.commit()
        s.close()
