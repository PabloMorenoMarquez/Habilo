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
