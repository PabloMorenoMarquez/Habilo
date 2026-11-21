"""Invitaciones entre profesionales: registro del referido y recompensa de «Destacado»."""
from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4


def _proveedor_service():
    from services.proveedor_service import ProveedorService
    svc = ProveedorService.__new__(ProveedorService)
    svc.proveedor_repository = MagicMock()
    svc.referido_repository = MagicMock()
    return svc


def _servicio_service():
    from services.servicio_service import ServicioService
    svc = ServicioService.__new__(ServicioService)
    svc.servicio_repository = MagicMock()
    svc.referido_repository = MagicMock()
    svc.proveedor_repository = MagicMock()
    return svc


def test_alta_con_codigo_registra_quien_invito():
    svc = _proveedor_service()
    nuevo = SimpleNamespace(id=uuid4())
    referidor = SimpleNamespace(id=uuid4(), usuario_id=uuid4())
    svc.proveedor_repository.crear_perfil.return_value = nuevo
    svc.proveedor_repository.get_by_codigo_referido.return_value = referidor

    svc.create_or_update(uuid4(), "desc", 10, codigo_referido="ABC12345")

    svc.referido_repository.crear.assert_called_once_with(referidor.id, nuevo.id)


def test_no_se_puede_invitar_a_uno_mismo():
    svc = _proveedor_service()
    usuario_id = uuid4()
    svc.proveedor_repository.crear_perfil.return_value = SimpleNamespace(id=uuid4())
    svc.proveedor_repository.get_by_codigo_referido.return_value = SimpleNamespace(id=uuid4(), usuario_id=usuario_id)

    svc.create_or_update(usuario_id, "desc", 10, codigo_referido="PROPIO01")

    svc.referido_repository.crear.assert_not_called()


def test_codigo_inexistente_no_registra_nada():
    svc = _proveedor_service()
    svc.proveedor_repository.crear_perfil.return_value = SimpleNamespace(id=uuid4())
    svc.proveedor_repository.get_by_codigo_referido.return_value = None

    svc.create_or_update(uuid4(), "desc", 10, codigo_referido="NOEXISTE")

    svc.referido_repository.crear.assert_not_called()


def _crear_servicio(svc, proveedor_id):
    svc.servicio_repository.crear.return_value = SimpleNamespace(id=uuid4())
    svc.crear(proveedor_id, uuid4(), "Clases", "desc", 12, "hora")


def test_primer_anuncio_del_invitado_da_15_dias_de_destacado_a_quien_invito():
    from services.servicio_service import DIAS_DESTACADO_REFERIDO
    svc = _servicio_service()
    proveedor_id, referidor_id = uuid4(), uuid4()
    svc.servicio_repository.contar_por_proveedor.return_value = 0
    svc.referido_repository.obtener_por_referido.return_value = SimpleNamespace(referidor_perfil_id=referidor_id)

    _crear_servicio(svc, proveedor_id)

    assert DIAS_DESTACADO_REFERIDO == 15
    svc.proveedor_repository.aplicar_destacado.assert_called_once_with(referidor_id, 15)


def test_segundo_anuncio_no_vuelve_a_dar_destacado():
    svc = _servicio_service()
    svc.servicio_repository.contar_por_proveedor.return_value = 1
    svc.referido_repository.obtener_por_referido.return_value = SimpleNamespace(referidor_perfil_id=uuid4())

    _crear_servicio(svc, uuid4())

    svc.proveedor_repository.aplicar_destacado.assert_not_called()
