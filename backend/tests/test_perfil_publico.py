from unittest.mock import MagicMock
from uuid import uuid4

# Horario en el formato actual (JSONB por días, 1 = lunes, con tramos; ver
# schemas/horario_schema.py). Equivale al antiguo dias_disponibles="1,3" de 17:00 a 20:00.
HORARIO = {
    "1": [{"inicio": "17:00", "fin": "20:00"}],
    "3": [{"inicio": "17:00", "fin": "20:00"}],
}


def _make_service():
    from services.proveedor_service import ProveedorService
    svc = ProveedorService.__new__(ProveedorService)
    svc.proveedor_repository = MagicMock()
    svc.servicio_repository = MagicMock()
    svc.valoracion_repository = MagicMock()
    svc.resena_alumno_repository = MagicMock()
    svc.resena_alumno_repository.listar_aprobadas.return_value = []
    return svc


def _perfil(publico: bool):
    perfil = MagicMock()
    perfil.id = uuid4()
    perfil.usuario_id = uuid4()
    perfil.descripcion = "Profesora de matemáticas"
    perfil.experiencia_años = 5
    perfil.radio_km_disponible = 20
    perfil.valoracion_media = 0
    perfil.num_valoraciones = 0
    perfil.verificado = False
    perfil.horario = HORARIO
    perfil.ciudad = "Talavera de la Reina"
    perfil.zona = "Centro"
    perfil.materias = ["matemáticas"]
    perfil.niveles = ["ESO"]
    perfil.perfil_publico = publico
    return perfil


def test_perfil_no_publico_anonimiza_nombre_foto_y_ciudad():
    svc = _make_service()
    svc.proveedor_repository.get_publico.return_value = {
        "perfil": _perfil(False),
        "usuario_nombre": "Ana García",
        "usuario_avatar": "https://img/ana.jpg",
        "fecha_creacion": None,
    }
    svc.servicio_repository.listar_por_proveedor_publico.return_value = []
    svc.valoracion_repository.listar_publicas_por_destinatario.return_value = []

    resultado = svc.obtener_perfil_publico(uuid4())

    assert resultado["nombre_publico"] == "Profesional de Habilo"
    assert resultado["avatar_publico"] is None
    assert resultado["ciudad"] is None
    assert resultado["perfil_publico"] is False
    assert resultado["servicios"] == []
    assert resultado["resenas"] == []
    assert "usuario_id" not in resultado
    assert "email" not in resultado
    assert "telefono" not in resultado


def test_perfil_publico_muestra_nombre_real():
    svc = _make_service()
    svc.proveedor_repository.get_publico.return_value = {
        "perfil": _perfil(True),
        "usuario_nombre": "Ana García",
        "usuario_avatar": "https://img/ana.jpg",
        "fecha_creacion": None,
    }
    svc.servicio_repository.listar_por_proveedor_publico.return_value = []
    svc.valoracion_repository.listar_publicas_por_destinatario.return_value = []

    resultado = svc.obtener_perfil_publico(uuid4())

    assert resultado["nombre_publico"] == "Ana García"
    # Foto externa (de login): no se publica. Ver test_avatar_publico.py.
    assert resultado["avatar_publico"] is None
    assert resultado["ciudad"] == "Talavera de la Reina"
    assert resultado["horario"] == HORARIO


def test_perfil_no_publico_oculta_zona_descripcion_y_no_consulta_servicios():
    svc = _make_service()
    svc.proveedor_repository.get_publico.return_value = {
        "perfil": _perfil(False),
        "usuario_nombre": "Ana García",
        "usuario_avatar": None,
        "fecha_creacion": None,
    }

    resultado = svc.obtener_perfil_publico(uuid4())

    assert resultado["zona"] is None
    assert resultado["descripcion"] is None
    svc.servicio_repository.listar_por_proveedor_publico.assert_not_called()
    svc.valoracion_repository.listar_publicas_por_destinatario.assert_not_called()


def test_perfil_publico_reduce_autor_a_primer_nombre():
    svc = _make_service()
    perfil = _perfil(True)
    svc.proveedor_repository.get_publico.return_value = {
        "perfil": perfil,
        "usuario_nombre": "Ana García",
        "usuario_avatar": None,
        "fecha_creacion": None,
    }
    svc.servicio_repository.listar_por_proveedor_publico.return_value = [
        {
            "id": uuid4(),
            "titulo": "Clases de matemáticas",
            "descripcion": None,
            "precio": 20,
            "tipo_precio": "hora",
            "imagen_url": None,
            "categoria_nombre": "Matemáticas",
        }
    ]
    svc.valoracion_repository.listar_publicas_por_destinatario.return_value = [
        {"puntuacion": 5, "comentario": "Genial", "fecha": None, "autor_nombre": "Luis Pérez"}
    ]

    resultado = svc.obtener_perfil_publico(perfil.id)

    svc.valoracion_repository.listar_publicas_por_destinatario.assert_called_once_with(perfil.usuario_id)
    assert resultado["servicios"][0]["titulo"] == "Clases de matemáticas"
    assert resultado["resenas"][0]["autor_nombre"] == "Luis"


def test_obtener_perfil_publico_ignora_cache():
    from services import proveedor_service

    svc = _make_service()
    perfil_id = uuid4()
    proveedor_service._perfil_publico_cache[str(perfil_id)] = _perfil(False)
    svc.proveedor_repository.get_publico.return_value = {
        "perfil": _perfil(True),
        "usuario_nombre": "Ana García",
        "usuario_avatar": None,
        "fecha_creacion": None,
    }
    svc.servicio_repository.listar_por_proveedor_publico.return_value = []
    svc.valoracion_repository.listar_publicas_por_destinatario.return_value = []

    resultado = svc.obtener_perfil_publico(perfil_id)

    proveedor_service._perfil_publico_cache.clear()
    svc.proveedor_repository.get_publico.assert_called_once_with(perfil_id)
    assert resultado["nombre_publico"] == "Ana García"


def test_actualizar_perfil_invalida_cache_publica():
    from services import proveedor_service

    svc = _make_service()
    perfil_id = uuid4()
    proveedor_service._perfil_publico_cache[str(perfil_id)] = _perfil(True)
    svc.proveedor_repository.actualizar.return_value = _perfil(False)

    svc.actualizar_perfil(perfil_id, perfil_publico=False)

    assert str(perfil_id) not in proveedor_service._perfil_publico_cache


def test_schema_publico_no_expone_datos_privados():
    from schemas.proveedor_schema import PerfilProveedorPublicoOut

    campos = set(PerfilProveedorPublicoOut.model_fields)
    assert "usuario_id" not in campos
    assert "email" not in campos
    assert "telefono" not in campos
    assert PerfilProveedorPublicoOut.model_fields["materias"].default_factory is list
    assert PerfilProveedorPublicoOut.model_fields["niveles"].default_factory is list
