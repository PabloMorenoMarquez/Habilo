"""Borrado de cuenta contra PostgreSQL real: SQL de las dos ramas (borrado total y anonimización)."""
import secrets
import uuid

import pytest
from sqlalchemy import func, select

# Registrar todos los modelos antes de que el conftest haga create_all.
from models.usuario import Usuario
from models.perfil_proveedor import Perfil_Proveedor
from models.servicio import Servicio
from models.imagen_servicio import Imagen_Servicio
from models.lead import Lead
from models.resena_alumno import ResenaAlumno
from models.referido import Referido
from models.bloqueo import Bloqueo
from models.suscripcion_push import Suscripcion_Push
from models.feedback import Feedback
from models.favorito_servicio import Favorito_Servicio
from models.favorito_proveedor import Favorito_Proveedor
from models.solicitud import Solicitud
from models.mensaje import Mensaje  # noqa: F401
from models.oferta import Oferta  # noqa: F401
from models.valoracion import Valoracion  # noqa: F401
from models.reporte import Reporte  # noqa: F401
from models.pago import Pago  # noqa: F401
from models.categoria import Categoria  # noqa: F401


@pytest.fixture
def repo(pg_engine):
    from repositories.borrado_cuenta_repository import BorradoCuentaRepository
    return BorradoCuentaRepository()


def _usuario(s, nombre="Persona"):
    u = Usuario(id=uuid.uuid4(), email=f"{uuid.uuid4().hex}@test.com", nombre=nombre,
                foto_url="https://x/foto", telefono="600000000", ciudad="Talavera")
    s.add(u)
    s.flush()
    return u


def _profesor(s):
    u = _usuario(s, "Profe")
    p = Perfil_Proveedor(id=uuid.uuid4(), usuario_id=u.id, radio_km_disponible=10,
                         codigo_referido=secrets.token_hex(4).upper(), codigo_resenas=secrets.token_hex(4),
                         descripcion="Doy clases", ciudad="Talavera", zona="Centro",
                         materias=["Matemáticas"], niveles=["ESO"], perfil_publico=True)
    s.add(p)
    s.flush()
    sv = Servicio(id=uuid.uuid4(), proveedor_id=p.id, titulo="Clases", descripcion="d", precio=10,
                  tipo_precio="hora", imagen_url="https://x/img", ciudad="Talavera", zona="Centro",
                  ubicacion="SRID=4326;POINT(-4.83 39.96)")
    s.add(sv)
    s.flush()
    return u, p, sv


def _contar(s, modelo, *condiciones):
    return s.scalar(select(func.count()).select_from(modelo).where(*condiciones))


def test_borrado_total_profesor(Session, repo):
    s = Session()
    u, p, sv = _profesor(s)
    otro = _usuario(s, "Otro")
    _, otro_perfil, _ = _profesor(s)
    s.add_all([
        Imagen_Servicio(servicio_id=sv.id, url="https://x/i1", orden=0),
        Lead(servicio_id=sv.id, perfil_id=p.id, proveedor_id=p.id, nombre="Fam", contacto="f@x.com",
             canal_contacto="email", mensaje="Hola", consentimiento=True),
        ResenaAlumno(perfil_id=p.id, puntuacion=5, comentario="Bien", autor_nombre="A", relacion="alumno",
                     antiguedad="1 año", consentimiento=True),
        Favorito_Servicio(usuario_id=otro.id, servicio_id=sv.id),
        Favorito_Proveedor(usuario_id=otro.id, perfil_proveedor_id=p.id),
        Favorito_Proveedor(usuario_id=u.id, perfil_proveedor_id=otro_perfil.id),
        Referido(referidor_perfil_id=p.id, referido_perfil_id=otro_perfil.id),
        Bloqueo(bloqueador_id=u.id, bloqueado_id=otro.id),
        Suscripcion_Push(usuario_id=u.id, endpoint=f"https://push/{uuid.uuid4()}", p256dh="k", auth="a"),
        Feedback(usuario_id=u.id, tipo="sugerencia", mensaje="Idea"),
    ])
    s.commit()
    uid, pid, sid, otro_id = u.id, p.id, sv.id, otro.id
    s.close()

    repo.borrar_todo(repo.datos(uid))

    s = Session()
    assert _contar(s, Usuario, Usuario.id == uid) == 0
    assert _contar(s, Perfil_Proveedor, Perfil_Proveedor.id == pid) == 0
    assert _contar(s, Servicio, Servicio.id == sid) == 0
    assert _contar(s, Imagen_Servicio, Imagen_Servicio.servicio_id == sid) == 0
    assert _contar(s, Lead, Lead.proveedor_id == pid) == 0
    assert _contar(s, ResenaAlumno, ResenaAlumno.perfil_id == pid) == 0
    assert _contar(s, Favorito_Servicio, Favorito_Servicio.servicio_id == sid) == 0
    assert _contar(s, Favorito_Proveedor, Favorito_Proveedor.perfil_proveedor_id == pid) == 0
    assert _contar(s, Favorito_Proveedor, Favorito_Proveedor.usuario_id == uid) == 0
    assert _contar(s, Referido, Referido.referidor_perfil_id == pid) == 0
    assert _contar(s, Bloqueo, Bloqueo.bloqueador_id == uid) == 0
    assert _contar(s, Suscripcion_Push, Suscripcion_Push.usuario_id == uid) == 0
    assert _contar(s, Feedback, Feedback.usuario_id == uid) == 0
    assert _contar(s, Usuario, Usuario.id == otro_id) == 1
    s.close()


def test_borrado_total_cliente_sin_perfil(Session, repo):
    s = Session()
    u = _usuario(s)
    s.commit()
    uid = u.id
    s.close()

    d = repo.datos(uid)
    assert d.perfil_id is None and d.servicio_ids == [] and d.es_admin is False
    repo.borrar_todo(d)

    s = Session()
    assert _contar(s, Usuario, Usuario.id == uid) == 0
    s.close()


def test_usuario_inexistente_devuelve_none(repo):
    assert repo.datos(uuid.uuid4()) is None


def test_sin_historial_no_es_compartido(Session, repo):
    s = Session()
    u, _, _ = _profesor(s)
    s.commit()
    uid = u.id
    s.close()

    assert repo.tiene_historial_compartido(repo.datos(uid)) is False


def test_solicitud_en_su_anuncio_cuenta_como_historial(Session, repo):
    s = Session()
    u, _, sv = _profesor(s)
    familia = _usuario(s, "Familia")
    s.add(Solicitud(servicio_id=sv.id, cliente_id=familia.id))
    s.commit()
    uid = u.id
    s.close()

    assert repo.tiene_historial_compartido(repo.datos(uid)) is True


def test_anonimiza_con_historial(Session, repo):
    s = Session()
    u, p, sv = _profesor(s)
    familia = _usuario(s, "Familia")
    sol = Solicitud(servicio_id=sv.id, cliente_id=familia.id)
    s.add_all([
        sol,
        Imagen_Servicio(servicio_id=sv.id, url="https://x/i1", orden=0),
        Lead(servicio_id=sv.id, perfil_id=p.id, proveedor_id=p.id, nombre="Fam", contacto="f@x.com",
             canal_contacto="email", mensaje="Hola", consentimiento=True),
        ResenaAlumno(perfil_id=p.id, puntuacion=5, comentario="Bien", autor_nombre="A", relacion="alumno",
                     antiguedad="1 año", consentimiento=True),
        Favorito_Servicio(usuario_id=familia.id, servicio_id=sv.id),
        Favorito_Proveedor(usuario_id=familia.id, perfil_proveedor_id=p.id),
        Suscripcion_Push(usuario_id=u.id, endpoint=f"https://push/{uuid.uuid4()}", p256dh="k", auth="a"),
    ])
    s.commit()
    uid, pid, sid, sol_id, codigo_viejo = u.id, p.id, sv.id, sol.id, p.codigo_referido
    s.close()

    repo.anonimizar(repo.datos(uid))

    s = Session()
    usuario = s.get(Usuario, uid)
    assert usuario.email == f"eliminado-{uid}@habilo.invalid"
    assert usuario.nombre == "Usuario eliminado"
    assert (usuario.foto_url, usuario.telefono, usuario.ciudad) == (None, None, None)
    assert usuario.telefono_verificado is False
    assert usuario.cuenta_eliminada is True and usuario.fecha_eliminacion is not None

    perfil = s.get(Perfil_Proveedor, pid)
    assert perfil.perfil_publico is False and perfil.consentimiento_marketing is False
    assert (perfil.descripcion, perfil.ciudad, perfil.zona) == (None, None, None)
    assert perfil.materias == [] and perfil.niveles == []
    assert perfil.codigo_resenas is None
    assert perfil.codigo_referido and perfil.codigo_referido != codigo_viejo

    servicio = s.get(Servicio, sid)
    assert servicio.activo is False
    assert (servicio.imagen_url, servicio.ubicacion, servicio.ciudad, servicio.zona) == (None, None, None, None)

    assert _contar(s, Imagen_Servicio, Imagen_Servicio.servicio_id == sid) == 0
    assert _contar(s, Lead, Lead.proveedor_id == pid) == 0
    assert _contar(s, ResenaAlumno, ResenaAlumno.perfil_id == pid) == 0
    assert _contar(s, Favorito_Servicio, Favorito_Servicio.servicio_id == sid) == 0
    assert _contar(s, Favorito_Proveedor, Favorito_Proveedor.perfil_proveedor_id == pid) == 0
    assert _contar(s, Suscripcion_Push, Suscripcion_Push.usuario_id == uid) == 0
    assert _contar(s, Solicitud, Solicitud.id == sol_id) == 1
    s.close()


def test_borrar_todo_se_niega_si_aparece_historial_tras_comprobarlo(Session, repo):
    # Carrera: se comprobó que no había historial, pero antes de borrar una familia pide clase.
    from repositories.borrado_cuenta_repository import HistorialCompartidoError
    s = Session()
    u, p, sv = _profesor(s)
    s.commit()
    uid, sid = u.id, sv.id
    s.close()

    d = repo.datos(uid)
    assert repo.tiene_historial_compartido(d) is False

    s = Session()
    familia = _usuario(s, "Familia")
    s.add(Solicitud(servicio_id=sid, cliente_id=familia.id))
    s.commit()
    s.close()

    with pytest.raises(HistorialCompartidoError):
        repo.borrar_todo(d)

    s = Session()
    assert _contar(s, Usuario, Usuario.id == uid) == 1
    assert _contar(s, Servicio, Servicio.id == sid) == 1
    s.close()


def test_borrar_todo_incluye_anuncios_creados_tras_leer_los_datos(Session, repo):
    s = Session()
    u, p, _ = _profesor(s)
    s.commit()
    uid, pid = u.id, p.id
    s.close()

    d = repo.datos(uid)

    s = Session()
    nuevo = Servicio(id=uuid.uuid4(), proveedor_id=pid, titulo="Otra", descripcion="d", precio=10, tipo_precio="hora")
    s.add(nuevo)
    s.flush()
    s.add(Imagen_Servicio(servicio_id=nuevo.id, url="https://x/i2", orden=0))
    s.commit()
    nuevo_id = nuevo.id
    s.close()

    repo.borrar_todo(d)

    s = Session()
    assert _contar(s, Servicio, Servicio.id == nuevo_id) == 0
    assert _contar(s, Usuario, Usuario.id == uid) == 0
    s.close()
