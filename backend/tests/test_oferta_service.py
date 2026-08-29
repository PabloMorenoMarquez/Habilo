"""
Tests unitarios de OfertaService.

Cubre:
  - No puedes aceptar tu propia oferta
  - No puedes aceptar una oferta que no está en estado 'pendiente'
  - Una oferta nueva reemplaza correctamente a la anterior pendiente
  - No se pueden hacer ofertas en solicitudes que no están en estado 'negociando'
"""
import pytest
from decimal import Decimal
from unittest.mock import MagicMock, call
from uuid import uuid4
from fastapi import HTTPException


def _make_service():
    from services.oferta_service import OfertaService
    svc = OfertaService.__new__(OfertaService)
    svc.oferta_repository = MagicMock()
    svc.mensaje_service = MagicMock()
    svc.servicio_repository = MagicMock()
    svc.solicitud_repository = MagicMock()
    svc.notificacion_push_service = MagicMock()
    return svc


def _make_oferta(estado: str, autor_id, id=None, solicitud_id=None):
    o = MagicMock()
    o.id = id or uuid4()
    o.estado = estado
    o.autor_id = str(autor_id)
    o.solicitud_id = solicitud_id or uuid4()
    return o


def _make_solicitud(estado: str, id=None, servicio_id=None, cliente_id=None):
    s = MagicMock()
    s.id = id or uuid4()
    s.estado = estado
    s.servicio_id = servicio_id or uuid4()
    s.cliente_id = str(cliente_id or uuid4())
    return s


# ── aceptar_oferta ────────────────────────────────────────────────────────────

def test_no_puede_aceptar_propia_oferta():
    """El autor de la oferta no puede aceptarla → 403."""
    svc = _make_service()
    autor_id = uuid4()
    solicitud_id = uuid4()

    oferta = _make_oferta("pendiente", autor_id, solicitud_id=solicitud_id)
    solicitud = _make_solicitud("negociando", id=solicitud_id)

    svc.oferta_repository.get_by_id.return_value = oferta
    svc.solicitud_repository.get_by_id.return_value = solicitud
    # _verificar_acceso no lanza nada (el usuario es parte de la solicitud)
    svc.mensaje_service._verificar_acceso.return_value = None

    with pytest.raises(HTTPException) as exc_info:
        svc.aceptar_oferta(oferta_id=oferta.id, usuario_id=autor_id)

    assert exc_info.value.status_code == 403
    assert "propia" in exc_info.value.detail.lower()


def test_aceptar_oferta_no_pendiente_falla():
    """Una oferta en estado 'reemplazada' no puede aceptarse → 400."""
    svc = _make_service()
    otro_usuario_id = uuid4()
    autor_id = uuid4()
    solicitud_id = uuid4()

    oferta = _make_oferta("reemplazada", autor_id, solicitud_id=solicitud_id)
    solicitud = _make_solicitud("negociando", id=solicitud_id)

    svc.oferta_repository.get_by_id.return_value = oferta
    svc.solicitud_repository.get_by_id.return_value = solicitud
    svc.mensaje_service._verificar_acceso.return_value = None

    with pytest.raises(HTTPException) as exc_info:
        svc.aceptar_oferta(oferta_id=oferta.id, usuario_id=otro_usuario_id)

    assert exc_info.value.status_code == 400


def test_aceptar_oferta_no_encontrada_falla():
    """Si la oferta no existe → 404."""
    svc = _make_service()
    svc.oferta_repository.get_by_id.return_value = None

    with pytest.raises(HTTPException) as exc_info:
        svc.aceptar_oferta(oferta_id=uuid4(), usuario_id=uuid4())

    assert exc_info.value.status_code == 404


# ── crear_oferta ──────────────────────────────────────────────────────────────

def test_nueva_oferta_reemplaza_la_anterior():
    """Si hay una oferta pendiente, debe marcarse como 'reemplazada' antes de crear la nueva."""
    svc = _make_service()
    autor_id = uuid4()
    solicitud_id = uuid4()
    oferta_anterior_id = uuid4()

    solicitud = _make_solicitud("negociando", id=solicitud_id)
    oferta_anterior = _make_oferta("pendiente", autor_id=uuid4(), id=oferta_anterior_id, solicitud_id=solicitud_id)
    oferta_nueva = _make_oferta("pendiente", autor_id=autor_id)
    servicio = MagicMock(tipo_precio="fijo")  # no es 'hora', no lanza excepción

    svc.solicitud_repository.get_by_id.return_value = solicitud
    svc.servicio_repository.get_by_id.return_value = servicio
    svc.oferta_repository.obtener_pendiente_de_solicitud.return_value = oferta_anterior
    svc.oferta_repository.crear.return_value = oferta_nueva
    svc.mensaje_service._verificar_acceso.return_value = None

    result = svc.crear_oferta(
        solicitud_id=solicitud_id,
        autor_id=autor_id,
        precio=Decimal("75.00"),
    )

    # La oferta anterior debe haberse marcado como reemplazada
    svc.oferta_repository.actualizar_estado.assert_called_with(oferta_anterior_id, "reemplazada")
    # Y luego se crea la nueva
    svc.oferta_repository.crear.assert_called_once()
    assert result == oferta_nueva


def test_crear_oferta_sin_oferta_previa():
    """Si no hay oferta pendiente, no se llama a actualizar_estado antes de crear."""
    svc = _make_service()
    autor_id = uuid4()
    solicitud_id = uuid4()

    solicitud = _make_solicitud("negociando", id=solicitud_id)
    oferta_nueva = _make_oferta("pendiente", autor_id=autor_id)
    servicio = MagicMock(tipo_precio="fijo")

    svc.solicitud_repository.get_by_id.return_value = solicitud
    svc.servicio_repository.get_by_id.return_value = servicio
    svc.oferta_repository.obtener_pendiente_de_solicitud.return_value = None  # sin oferta previa
    svc.oferta_repository.crear.return_value = oferta_nueva
    svc.mensaje_service._verificar_acceso.return_value = None

    svc.crear_oferta(solicitud_id=solicitud_id, autor_id=autor_id, precio=Decimal("50.00"))

    # No debe haberse llamado a actualizar_estado (no había oferta anterior)
    svc.oferta_repository.actualizar_estado.assert_not_called()


def test_oferta_en_solicitud_no_negociando_falla():
    """Si la solicitud no está en 'negociando' no se pueden crear ofertas → 400."""
    svc = _make_service()
    solicitud_id = uuid4()

    solicitud = _make_solicitud("aceptada", id=solicitud_id)  # ya no está negociando
    svc.solicitud_repository.get_by_id.return_value = solicitud

    with pytest.raises(HTTPException) as exc_info:
        svc.crear_oferta(solicitud_id=solicitud_id, autor_id=uuid4(), precio=Decimal("50.00"))

    assert exc_info.value.status_code == 400
