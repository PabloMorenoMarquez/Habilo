from unittest.mock import MagicMock
from uuid import uuid4


def _make_service():
    from services.servicio_service import ServicioService
    svc = ServicioService.__new__(ServicioService)
    svc.servicio_repository = MagicMock()
    svc.favorito_repository = MagicMock()
    return svc


def test_buscar_sin_coordenadas_pasa_none_al_repositorio():
    svc = _make_service()
    svc.servicio_repository.buscar_por_proximidad.return_value = []
    svc.buscar(None, None, 50, ciudad="Talavera de la Reina")
    svc.servicio_repository.buscar_por_proximidad.assert_called_once_with(
        lat=None, lng=None, radio_km=50, categoria_id=None, texto=None,
        ciudad="Talavera de la Reina", usuario_id=None, limit=20, offset=0
    )


def test_resumen_devuelve_contadores():
    svc = _make_service()
    svc.servicio_repository.resumen.return_value = {
        "servicios_activos": 6, "profesores_activos": 8, "resenas": 0
    }
    assert svc.resumen()["servicios_activos"] == 6


def _fila_servicio(es_publico: bool):
    servicio = MagicMock()
    servicio.id = uuid4()
    servicio.proveedor_id = uuid4()
    servicio.categoria_id = None
    servicio.titulo = "Clases de matemáticas"
    servicio.descripcion = None
    servicio.precio = 20
    servicio.tipo_precio = "hora"
    servicio.activo = True
    servicio.fecha_creacion = None
    servicio.imagen_url = None
    servicio.ciudad = "Talavera de la Reina"
    servicio.zona = "Centro"
    servicio.materias = []
    servicio.niveles = []
    servicio.ubicacion = None

    fila = MagicMock()
    fila.__getitem__.return_value = servicio
    fila.proveedor_nombre = "Ana García"
    fila.proveedor_avatar = None
    fila.proveedor_ciudad = "Talavera de la Reina"
    fila.proveedor_perfil_publico = es_publico
    fila.proveedor_valoracion_media = None
    fila.proveedor_num_valoraciones = 0
    fila.categoria_nombre = "Matemáticas"
    fila.proveedor_destacado_hasta = None
    return fila


def test_busqueda_publica_oculta_ciudad_y_zona_de_perfil_privado():
    from unittest.mock import patch
    import repositories.servicio_repository as modulo

    sesion = MagicMock()
    sesion.execute.return_value.all.return_value = [_fila_servicio(False)]
    with patch.object(modulo, "SessionLocal", return_value=sesion):
        repo = modulo.ServicioRepository()
        resultado = repo.buscar_por_proximidad(None, None, 50, ciudad="Talavera")

    assert resultado[0]["ciudad"] is None
    assert resultado[0]["zona"] is None
    assert resultado[0]["proveedor_ciudad"] is None
    assert resultado[0]["proveedor_nombre"] == "Profesional de Habilo"

    # El filtro por ciudad solo puede leer la ubicación dentro del CASE que
    # exige perfil público; nunca antes.
    sentencia = sesion.execute.call_args.args[0]
    sql = str(sentencia.compile(compile_kwargs={"literal_binds": True}))
    assert "CASE WHEN (perfiles_proveedor.perfil_publico IS true) THEN coalesce" in sql


def test_busqueda_publica_mantiene_ciudad_si_perfil_es_publico():
    from unittest.mock import patch
    import repositories.servicio_repository as modulo

    sesion = MagicMock()
    sesion.execute.return_value.all.return_value = [_fila_servicio(True)]
    with patch.object(modulo, "SessionLocal", return_value=sesion):
        repo = modulo.ServicioRepository()
        resultado = repo.buscar_por_proximidad(None, None, 50, ciudad="Talavera")

    assert resultado[0]["ciudad"] == "Talavera de la Reina"
    assert resultado[0]["zona"] == "Centro"
    assert resultado[0]["proveedor_nombre"] == "Ana García"


def test_busqueda_por_proximidad_excluye_perfiles_privados():
    from unittest.mock import patch
    import repositories.servicio_repository as modulo

    sesion = MagicMock()
    sesion.execute.return_value.all.return_value = []
    with patch.object(modulo, "SessionLocal", return_value=sesion):
        repo = modulo.ServicioRepository()
        repo.buscar_por_proximidad(39.96, -4.83, 25)

    sentencia = sesion.execute.call_args.args[0]
    sql = str(sentencia.compile(compile_kwargs={"literal_binds": True}))
    assert "perfiles_proveedor.perfil_publico IS true" in sql
    assert "ST_DWithin" in sql


def test_detalle_publico_oculta_ubicacion_de_perfil_privado():
    from unittest.mock import patch
    import repositories.servicio_repository as modulo

    fila = _fila_servicio(False)
    fila.__getitem__.return_value.ubicacion = MagicMock()
    punto = MagicMock()
    punto.y = 39.96
    punto.x = -4.83
    sesion = MagicMock()
    sesion.execute.return_value.first.return_value = fila
    with patch.object(modulo, "SessionLocal", return_value=sesion), patch.object(
        modulo, "to_shape", return_value=punto
    ):
        repo = modulo.ServicioRepository()
        resultado = repo.obtener_detalle_publico(uuid4())

    assert resultado["ciudad"] is None
    assert resultado["zona"] is None
    assert resultado["latitud"] is None
    assert resultado["longitud"] is None


def _orden_de_busqueda(lat, lng):
    from unittest.mock import patch
    from sqlalchemy.dialects import postgresql
    import repositories.servicio_repository as modulo

    sesion = MagicMock()
    sesion.execute.return_value.all.return_value = []
    with patch.object(modulo, "SessionLocal", return_value=sesion):
        modulo.ServicioRepository().buscar_por_proximidad(lat, lng, 25)
    sql = str(sesion.execute.call_args.args[0].compile(
        dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True}))
    return sql.split("ORDER BY", 1)[1]


def test_busqueda_pone_primero_los_destacados_vigentes():
    """Recompensa por invitar: los anuncios de un perfil destacado salen primero."""
    orden = _orden_de_busqueda(None, None)
    primero, resto = orden.split(",", 1)
    assert "perfiles_proveedor.destacado_hasta >" in primero
    assert "now()" in primero
    assert "servicios.fecha_creacion DESC" in resto


def test_busqueda_por_proximidad_tambien_pone_primero_los_destacados():
    orden = _orden_de_busqueda(39.96, -4.83)
    primero, resto = orden.split(",", 1)
    assert "perfiles_proveedor.destacado_hasta >" in primero
    assert "ST_Distance" in resto
