"""Reseñas de alumnos por enlace: código por profesor, formulario y publicación."""
from unittest.mock import MagicMock, patch
from uuid import uuid4


# ── Código de reseñas al crear el perfil ─────────────────────────────────────

def test_crear_perfil_asigna_codigo_resenas():
    import repositories.proveedor_repository as modulo
    sesion = MagicMock()
    sesion.scalar.return_value = None  # ningún código choca con uno existente
    with patch.object(modulo, "SessionLocal", return_value=sesion):
        modulo.ProveedorRepository().crear_perfil(
            usuario_id=uuid4(), descripcion="Clases de matemáticas", radio_km_disponible=10)

    perfil = sesion.add.call_args.args[0]
    assert isinstance(perfil, modulo.Perfil_Proveedor)
    assert isinstance(perfil.codigo_resenas, str)
    assert len(perfil.codigo_resenas) == 8


# ── Servicio: formulario y creación ──────────────────────────────────────────

import pytest
from fastapi import HTTPException
from pydantic import ValidationError


def _make_resena_service():
    from services.resena_alumno_service import ResenaAlumnoService
    svc = ResenaAlumnoService.__new__(ResenaAlumnoService)
    svc.resena_alumno_repository = MagicMock()
    svc.proveedor_repository = MagicMock()
    svc.notificacion_email_service = MagicMock()
    return svc


def _con_profesor(svc, nombre="Lucía Pérez Gómez", publico=True):
    perfil = MagicMock()
    perfil.id = uuid4()
    perfil.perfil_publico = publico
    svc.proveedor_repository.get_by_codigo_resenas.return_value = perfil
    svc.proveedor_repository.get_publico.return_value = {
        "perfil": perfil, "usuario_nombre": nombre, "usuario_avatar": None, "fecha_creacion": None,
    }
    return perfil


def _datos_resena(**cambios):
    from schemas.resena_alumno_schema import CrearResenaAlumno
    datos = {
        "puntuacion": 5,
        "comentario": "Explica muy bien y con mucha paciencia.",
        "autor_nombre": "Marta G.",
        "relacion": "padre_madre",
        "antiguedad": "3_12_meses",
        "contacto": "ana@x.com",
        "consentimiento": True,
    }
    datos.update(cambios)
    return CrearResenaAlumno(**datos)


def _resena_guardada(perfil_id):
    resena = MagicMock()
    resena.id = uuid4()
    resena.perfil_id = perfil_id
    resena.estado = "pendiente"
    return resena


def test_formulario_codigo_inexistente_none():
    svc = _make_resena_service()
    svc.proveedor_repository.get_by_codigo_resenas.return_value = None

    assert svc.formulario("noexiste") is None


def test_formulario_perfil_privado_solo_nombre_de_pila():
    svc = _make_resena_service()
    _con_profesor(svc, nombre="Lucía Pérez Gómez", publico=False)

    assert svc.formulario("abcd1234") == {"nombre_profesor": "Lucía"}


def test_formulario_perfil_publico_nombre_completo():
    svc = _make_resena_service()
    _con_profesor(svc, nombre="Lucía Pérez Gómez", publico=True)

    assert svc.formulario("abcd1234") == {"nombre_profesor": "Lucía Pérez Gómez"}


def test_crear_guarda_pendiente():
    svc = _make_resena_service()
    perfil = _con_profesor(svc)
    svc.resena_alumno_repository.existe.return_value = False
    svc.resena_alumno_repository.crear.side_effect = lambda perfil_id, datos: _resena_guardada(perfil_id)

    resena = svc.crear("abcd1234", _datos_resena())

    assert resena.estado == "pendiente"
    perfil_id, datos = svc.resena_alumno_repository.crear.call_args.args
    assert perfil_id == perfil.id
    assert "website" not in datos
    assert "estado" not in datos  # lo pone la base de datos: siempre 'pendiente'
    assert datos["contacto"] == "ana@x.com"
    assert datos["consentimiento"] is True


def test_crear_codigo_inexistente_404():
    svc = _make_resena_service()
    svc.proveedor_repository.get_by_codigo_resenas.return_value = None

    with pytest.raises(HTTPException) as error:
        svc.crear("noexiste", _datos_resena())

    assert error.value.status_code == 404
    svc.resena_alumno_repository.crear.assert_not_called()


def test_crear_duplicado_409():
    svc = _make_resena_service()
    perfil = _con_profesor(svc)
    # En la base ya hay una reseña con "ana@x.com": el repositorio solo
    # encuentra el duplicado si el servicio le pasa el contacto normalizado.
    svc.resena_alumno_repository.existe.side_effect = (
        lambda perfil_id, contacto: perfil_id == perfil.id and contacto == "ana@x.com")

    with pytest.raises(HTTPException) as error:
        svc.crear("abcd1234", _datos_resena(contacto=" Ana@X.com"))

    assert error.value.status_code == 409
    assert error.value.detail == "Ya has dejado una opinión para este profesor. ¡Gracias!"
    svc.resena_alumno_repository.crear.assert_not_called()


def test_crear_duplicado_por_carrera_409():
    from sqlalchemy.exc import IntegrityError
    svc = _make_resena_service()
    _con_profesor(svc)
    svc.resena_alumno_repository.existe.return_value = False
    svc.resena_alumno_repository.crear.side_effect = IntegrityError("INSERT", {}, Exception("duplicado"))

    with pytest.raises(HTTPException) as error:
        svc.crear("abcd1234", _datos_resena())

    assert error.value.status_code == 409


def test_crear_avisa_a_soporte_sin_contacto_en_asunto():
    svc = _make_resena_service()
    _con_profesor(svc, nombre="Lucía Pérez Gómez")
    svc.resena_alumno_repository.existe.return_value = False
    guardada = _resena_guardada(uuid4())
    svc.resena_alumno_repository.crear.return_value = guardada

    svc.crear("abcd1234", _datos_resena(
        contacto="ana@x.com", puntuacion=4,
        comentario="<script>alert(1)</script> muy buena profesora"))

    destinatario, asunto, cuerpo = svc.notificacion_email_service.enviar_a_email.call_args.args
    assert destinatario == "soporte@habilo.es"
    assert asunto == "Nueva reseña para Lucía Pérez Gómez: 4★"
    assert "ana@x.com" not in asunto
    assert "<script>" not in cuerpo
    assert "&lt;script&gt;" in cuerpo
    assert "ana@x.com" in cuerpo  # el fundador lo necesita para verificar
    assert f"UPDATE resenas_alumnos SET estado='aprobada', fecha_moderacion=now() WHERE id='{guardada.id}';" in cuerpo
    assert f"UPDATE resenas_alumnos SET estado='rechazada', fecha_moderacion=now() WHERE id='{guardada.id}';" in cuerpo


def test_crear_no_falla_si_resend_falla():
    svc = _make_resena_service()
    _con_profesor(svc)
    svc.resena_alumno_repository.existe.return_value = False
    guardada = _resena_guardada(uuid4())
    svc.resena_alumno_repository.crear.return_value = guardada
    svc.notificacion_email_service.enviar_a_email.side_effect = RuntimeError("Resend caído")

    assert svc.crear("abcd1234", _datos_resena()) is guardada


def test_schema_rechaza_comentario_corto():
    with pytest.raises(ValidationError):
        _datos_resena(comentario="Muy bien")


def test_schema_rechaza_puntuacion_6():
    with pytest.raises(ValidationError):
        _datos_resena(puntuacion=6)


def test_schema_recorta_espacios_antes_de_validar():
    with pytest.raises(ValidationError):
        _datos_resena(autor_nombre="     ")
    assert _datos_resena(contacto="  ana@x.com  ").contacto == "ana@x.com"


def test_schema_exige_consentimiento():
    with pytest.raises(ValidationError):
        _datos_resena(consentimiento=False)


# ── Repositorio ──────────────────────────────────────────────────────────────

def test_existe_compara_contacto_normalizado_como_el_indice():
    from sqlalchemy.dialects import postgresql
    import repositories.resena_alumno_repository as modulo
    sesion = MagicMock()
    sesion.scalar.return_value = None
    with patch.object(modulo, "SessionLocal", return_value=sesion):
        assert modulo.ResenaAlumnoRepository().existe(uuid4(), " Ana@X.com ") is False

    sql = str(sesion.scalar.call_args.args[0].compile(
        dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True}))
    assert "lower(btrim(resenas_alumnos.contacto))" in sql
    assert "'ana@x.com'" in sql


def test_listar_aprobadas_solo_estado_aprobada():
    from sqlalchemy.dialects import postgresql
    import repositories.resena_alumno_repository as modulo
    sesion = MagicMock()
    sesion.execute.return_value.all.return_value = []
    with patch.object(modulo, "SessionLocal", return_value=sesion):
        assert modulo.ResenaAlumnoRepository().listar_aprobadas(uuid4()) == []

    sql = str(sesion.execute.call_args.args[0].compile(
        dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True}))
    assert "resenas_alumnos.estado = 'aprobada'" in sql
    assert "contacto" not in sql


# ── Router público /resenas ──────────────────────────────────────────────────

from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.testclient import TestClient


def _cliente_resenas():
    from routers.resenas import router
    from utils.rate_limiter import limiter
    app = FastAPI()
    app.state.limiter = limiter
    app.include_router(router)
    return TestClient(app)


def _cuerpo_post(**cambios):
    cuerpo = {
        "puntuacion": 5,
        "comentario": "Explica muy bien y con mucha paciencia.",
        "autor_nombre": "Marta G.",
        "relacion": "alumno",
        "antiguedad": "mas_1_ano",
        "contacto": "ana@x.com",
        "consentimiento": True,
    }
    cuerpo.update(cambios)
    return cuerpo


def test_get_formulario_404():
    with patch("routers.resenas.ResenaAlumnoService") as service:
        service.return_value.formulario.return_value = None
        response = _cliente_resenas().get("/resenas/noexiste")

    assert response.status_code == 404


def test_get_formulario_ok():
    with patch("routers.resenas.ResenaAlumnoService") as service:
        service.return_value.formulario.return_value = {"nombre_profesor": "Lucía"}
        response = _cliente_resenas().get("/resenas/abc12345")

    assert response.status_code == 200
    assert response.json() == {"nombre_profesor": "Lucía"}
    service.return_value.formulario.assert_called_once_with("abc12345")


def test_post_honeypot_no_guarda():
    with patch("routers.resenas.ResenaAlumnoService") as service:
        response = _cliente_resenas().post(
            "/resenas/abc12345", json=_cuerpo_post(website="https://spam.example"))

    assert response.status_code == 201
    assert response.json() == {"ok": True}
    service.return_value.crear.assert_not_called()


def test_post_ok_201():
    with patch("routers.resenas.ResenaAlumnoService") as service:
        response = _cliente_resenas().post("/resenas/abc12345", json=_cuerpo_post())

    assert response.status_code == 201
    assert response.json() == {"ok": True}
    codigo, datos = service.return_value.crear.call_args.args
    assert codigo == "abc12345"
    assert datos.contacto == "ana@x.com"


# ── Ficha: unión de valoraciones y reseñas de alumnos ───────────────────────

def _make_proveedor_service():
    from services.proveedor_service import ProveedorService
    svc = ProveedorService.__new__(ProveedorService)
    svc.proveedor_repository = MagicMock()
    svc.servicio_repository = MagicMock()
    svc.valoracion_repository = MagicMock()
    svc.resena_alumno_repository = MagicMock()
    return svc


def _perfil_publico_ficha():
    perfil = MagicMock()
    perfil.id = uuid4()
    perfil.usuario_id = uuid4()
    perfil.descripcion = "Profesora de matemáticas"
    perfil.experiencia_años = 5
    perfil.radio_km_disponible = 20
    perfil.valoracion_media = 4.5
    perfil.num_valoraciones = 2
    perfil.verificado = False
    perfil.dias_disponibles = None
    perfil.hora_inicio = None
    perfil.hora_fin = None
    perfil.ciudad = "Talavera de la Reina"
    perfil.zona = None
    perfil.materias = []
    perfil.niveles = []
    perfil.perfil_publico = True
    return perfil


def _ficha_con(svc, valoraciones, resenas_alumnos):
    perfil = _perfil_publico_ficha()
    svc.proveedor_repository.get_publico.return_value = {
        "perfil": perfil, "usuario_nombre": "Lucía Pérez", "usuario_avatar": None, "fecha_creacion": None,
    }
    svc.servicio_repository.listar_por_proveedor_publico.return_value = []
    svc.valoracion_repository.listar_publicas_por_destinatario.return_value = valoraciones
    svc.resena_alumno_repository.listar_aprobadas.return_value = resenas_alumnos
    return perfil, svc.obtener_perfil_publico(perfil.id)


def _resena_alumno_aprobada(fecha):
    # Lo que devuelve listar_aprobadas: nunca incluye `contacto`.
    return {
        "puntuacion": 5, "comentario": "Mi hija ha aprobado matemáticas gracias a ella.",
        "fecha": fecha, "autor_nombre": "Marta G.",
        "relacion": "padre_madre", "antiguedad": "3_12_meses",
    }


def test_ficha_une_resenas_ordenadas_por_fecha_desc():
    svc = _make_proveedor_service()
    # valoraciones.fecha es timestamp sin zona; resenas_alumnos.fecha, con zona.
    antigua = {"puntuacion": 4, "comentario": "Bien", "fecha": datetime(2026, 10, 1, 12, 0),
               "autor_nombre": "Luis Pérez"}
    reciente = _resena_alumno_aprobada(datetime(2026, 11, 15, 9, 0, tzinfo=timezone.utc))

    perfil, resultado = _ficha_con(svc, [antigua], [reciente])

    svc.resena_alumno_repository.listar_aprobadas.assert_called_once_with(perfil.id)
    resenas = resultado["resenas"]
    assert [r["origen"] for r in resenas] == ["alumno", "habilo"]
    assert resenas[0]["autor_nombre"] == "Marta G."  # tal cual, sin recortar
    assert resenas[0]["relacion"] == "padre_madre"
    assert resenas[0]["antiguedad"] == "3_12_meses"
    assert resenas[1]["autor_nombre"] == "Luis"
    assert resenas[1]["relacion"] is None


def test_ficha_no_expone_contacto():
    from schemas.proveedor_schema import PerfilProveedorPublicoOut, ResenaPublicaOut
    svc = _make_proveedor_service()
    resena = _resena_alumno_aprobada(datetime(2026, 11, 15, tzinfo=timezone.utc))
    # Aunque el repositorio devolviera el contacto por error, no debe salir.
    resena["contacto"] = "ana@x.com"

    _, resultado = _ficha_con(svc, [], [resena])
    json_ficha = PerfilProveedorPublicoOut.model_validate(resultado).model_dump_json()

    assert "contacto" not in ResenaPublicaOut.model_fields
    assert "contacto" not in json_ficha
    assert "ana@x.com" not in json_ficha
    assert '"origen":"alumno"' in json_ficha


def test_ficha_no_muestra_pendientes():
    svc = _make_proveedor_service()

    perfil, resultado = _ficha_con(svc, [], [])

    # Solo se consulta la lista de aprobadas: pendientes y rechazadas no llegan.
    svc.resena_alumno_repository.listar_aprobadas.assert_called_once_with(perfil.id)
    assert resultado["resenas"] == []


# ── Enlace del profesor: GET /proveedor/me/codigo-resenas ────────────────────

def _cliente_proveedores(usuario_id):
    from routers.proveedores import router
    from utils.auth_middleware import get_current_user
    from utils.rate_limiter import limiter
    app = FastAPI()
    app.state.limiter = limiter
    app.include_router(router)
    app.dependency_overrides[get_current_user] = lambda: {"user_id": usuario_id}
    return TestClient(app)


def test_me_codigo_resenas_no_choca_con_perfil_id():
    usuario_id = str(uuid4())
    with patch("routers.proveedores.ProveedorService") as service:
        service.return_value.obtener_codigo_resenas.return_value = "abc12345"
        response = _cliente_proveedores(usuario_id).get("/proveedor/me/codigo-resenas")

    assert response.status_code == 200
    assert response.json() == {"codigo": "abc12345"}
    service.return_value.obtener_codigo_resenas.assert_called_once_with(usuario_id)
    service.return_value.obtener_perfil_publico.assert_not_called()


def test_me_codigo_resenas_404_sin_perfil():
    with patch("routers.proveedores.ProveedorService") as service:
        service.return_value.obtener_codigo_resenas.return_value = None
        response = _cliente_proveedores(str(uuid4())).get("/proveedor/me/codigo-resenas")

    assert response.status_code == 404
    # El 404 viene de la ruta (no es profesor), no de una ruta inexistente.
    service.return_value.obtener_codigo_resenas.assert_called_once()


def test_obtener_codigo_resenas_devuelve_el_existente():
    svc = _make_proveedor_service()
    perfil = MagicMock()
    perfil.codigo_resenas = "abc12345"
    svc.proveedor_repository.get_by_usuario_id.return_value = perfil

    assert svc.obtener_codigo_resenas(uuid4()) == "abc12345"
    svc.proveedor_repository.asignar_codigo_resenas.assert_not_called()


def test_obtener_codigo_resenas_genera_si_falta():
    svc = _make_proveedor_service()
    perfil = MagicMock()
    perfil.codigo_resenas = None
    svc.proveedor_repository.get_by_usuario_id.return_value = perfil
    svc.proveedor_repository.asignar_codigo_resenas.return_value = "nuevo123"

    assert svc.obtener_codigo_resenas(uuid4()) == "nuevo123"
    svc.proveedor_repository.asignar_codigo_resenas.assert_called_once_with(perfil.id)


def test_obtener_codigo_resenas_none_si_no_es_profesor():
    svc = _make_proveedor_service()
    svc.proveedor_repository.get_by_usuario_id.return_value = None

    assert svc.obtener_codigo_resenas(uuid4()) is None


def test_asignar_codigo_resenas_respeta_el_existente():
    import repositories.proveedor_repository as modulo
    sesion = MagicMock()
    perfil = MagicMock()
    perfil.codigo_resenas = "yaestaba"
    sesion.scalar.return_value = perfil
    with patch.object(modulo, "SessionLocal", return_value=sesion):
        assert modulo.ProveedorRepository().asignar_codigo_resenas(uuid4()) == "yaestaba"

    sesion.commit.assert_not_called()


# ── Borrado de contactos a los 90 días ───────────────────────────────────────

def test_borrar_contactos_caducados_filtra_por_fecha_moderacion():
    from sqlalchemy.dialects import postgresql
    import repositories.resena_alumno_repository as modulo
    sesion = MagicMock()
    sesion.execute.return_value.rowcount = 3
    with patch.object(modulo, "SessionLocal", return_value=sesion):
        assert modulo.ResenaAlumnoRepository().borrar_contactos_caducados(90) == 3

    sql = str(sesion.execute.call_args.args[0].compile(
        dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True}))
    assert sql.startswith("UPDATE resenas_alumnos SET contacto=NULL")
    assert "resenas_alumnos.fecha_moderacion <" in sql
    assert "resenas_alumnos.estado != 'pendiente'" in sql
    sesion.commit.assert_called_once()


def test_scheduler_registra_borrado_diario_de_contactos():
    import utils.scheduler as modulo
    with patch.object(modulo, "scheduler") as scheduler:
        modulo.iniciar_jobs()

    jobs = {c.kwargs["id"]: c for c in scheduler.add_job.call_args_list}
    job = jobs["borrar_contactos_resenas"]
    assert job.args[1] == "interval"
    assert job.kwargs["hours"] == 24

    with patch("repositories.resena_alumno_repository.ResenaAlumnoRepository") as repo:
        job.args[0]()
    repo.return_value.borrar_contactos_caducados.assert_called_once_with(90)
