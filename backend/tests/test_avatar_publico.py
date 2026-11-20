"""La foto de Google/Facebook no se publica; solo la que sube el propio profesor."""
from unittest.mock import MagicMock, patch
from uuid import uuid4

SUPABASE = "https://fake.supabase.co"
GOOGLE = "https://lh3.googleusercontent.com/a/ACg8ocI=s96-c"


def _subida(usuario_id):
    return f"{SUPABASE}/storage/v1/object/public/servicios/avatares/{usuario_id}/foto"


# ── Regla ────────────────────────────────────────────────────────────────────

def test_foto_subida_por_el_propio_usuario_se_publica():
    from utils.avatar import avatar_publico
    uid = uuid4()
    assert avatar_publico(_subida(uid), uid) == _subida(uid)


def test_foto_de_google_no_se_publica():
    from utils.avatar import avatar_publico
    assert avatar_publico(GOOGLE, uuid4()) is None


def test_foto_subida_por_otro_usuario_no_se_publica():
    from utils.avatar import avatar_publico
    assert avatar_publico(_subida(uuid4()), uuid4()) is None


def test_sin_foto_devuelve_none():
    from utils.avatar import avatar_publico
    assert avatar_publico(None, uuid4()) is None


# ── Perfil público ───────────────────────────────────────────────────────────

def _servicio_perfil(avatar, usuario_id):
    from services.proveedor_service import ProveedorService
    svc = ProveedorService.__new__(ProveedorService)
    svc.proveedor_repository = MagicMock()
    svc.servicio_repository = MagicMock()
    svc.valoracion_repository = MagicMock()
    svc.resena_alumno_repository = MagicMock()
    svc.resena_alumno_repository.listar_aprobadas.return_value = []
    perfil = MagicMock()
    perfil.perfil_publico = True
    perfil.usuario_id = usuario_id
    svc.proveedor_repository.get_publico.return_value = {
        "perfil": perfil, "usuario_nombre": "Ana García",
        "usuario_avatar": avatar, "fecha_creacion": None,
    }
    svc.servicio_repository.listar_por_proveedor_publico.return_value = []
    svc.valoracion_repository.listar_publicas_por_destinatario.return_value = []
    return svc


def test_perfil_publico_no_muestra_foto_de_google():
    svc = _servicio_perfil(GOOGLE, uuid4())
    assert svc.obtener_perfil_publico(uuid4())["avatar_publico"] is None


def test_perfil_publico_muestra_foto_subida():
    uid = uuid4()
    svc = _servicio_perfil(_subida(uid), uid)
    assert svc.obtener_perfil_publico(uuid4())["avatar_publico"] == _subida(uid)


# ── Búsqueda y detalle de servicio ───────────────────────────────────────────

def _fila(avatar, usuario_id):
    servicio = MagicMock()
    servicio.materias = []
    servicio.niveles = []
    servicio.ubicacion = None
    fila = MagicMock()
    fila.__getitem__.return_value = servicio
    fila.proveedor_nombre = "Ana García"
    fila.proveedor_avatar = avatar
    fila.proveedor_usuario_id = usuario_id
    fila.proveedor_perfil_publico = True
    fila.proveedor_num_valoraciones = 0
    return fila


def _buscar(fila):
    import repositories.servicio_repository as modulo
    sesion = MagicMock()
    sesion.execute.return_value.all.return_value = [fila]
    with patch.object(modulo, "SessionLocal", return_value=sesion):
        return modulo.ServicioRepository().buscar_por_proximidad(None, None, 50)


def _detalle(fila):
    import repositories.servicio_repository as modulo
    sesion = MagicMock()
    sesion.execute.return_value.first.return_value = fila
    with patch.object(modulo, "SessionLocal", return_value=sesion):
        return modulo.ServicioRepository().obtener_detalle_publico(uuid4())


def test_busqueda_no_muestra_foto_de_google():
    assert _buscar(_fila(GOOGLE, uuid4()))[0]["proveedor_avatar"] is None


def test_busqueda_muestra_foto_subida():
    uid = uuid4()
    assert _buscar(_fila(_subida(uid), uid))[0]["proveedor_avatar"] == _subida(uid)


def test_detalle_no_muestra_foto_de_google():
    assert _detalle(_fila(GOOGLE, uuid4()))["proveedor_avatar"] is None


# ── Inicio de sesión ─────────────────────────────────────────────────────────

def _login(usuario_existente, foto_nueva):
    import repositories.user_repository as modulo
    sesion = MagicMock()
    sesion.scalar.return_value = usuario_existente
    with patch.object(modulo, "SessionLocal", return_value=sesion):
        modulo.UserRepository().create_or_update(
            email="ana@test.com", nombre="Ana García", foto_url=foto_nueva)
    return usuario_existente


def test_login_no_pisa_la_foto_subida():
    uid = uuid4()
    usuario = MagicMock(id=uid, foto_url=_subida(uid))
    assert _login(usuario, GOOGLE).foto_url == _subida(uid)


def test_login_actualiza_la_foto_de_google():
    usuario = MagicMock(id=uuid4(), foto_url=GOOGLE)
    nueva = "https://lh3.googleusercontent.com/a/OTRA=s96-c"
    assert _login(usuario, nueva).foto_url == nueva


# ── Nombre al iniciar sesión ─────────────────────────────────────────────────

def test_login_no_pisa_el_nombre_editado():
    usuario = MagicMock(id=uuid4(), foto_url=GOOGLE, nombre="Ana G. (profe de mates)",
                        cuenta_eliminada=False)
    assert _login(usuario, GOOGLE).nombre == "Ana G. (profe de mates)"


def test_login_rellena_el_nombre_si_esta_vacio():
    usuario = MagicMock(id=uuid4(), foto_url=None, nombre="", cuenta_eliminada=False)
    assert _login(usuario, GOOGLE).nombre == "Ana García"
