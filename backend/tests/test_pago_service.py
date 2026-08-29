"""
Tests unitarios de PagoService.

Cubre:
  - Cálculo de comisión (exacto y con redondeo ROUND_HALF_UP)
  - Protección contra doble pago
  - Solo el cliente puede confirmar la entrega
  - No se puede confirmar si la solicitud no está completada
  - No se puede capturar si no hay pago autorizado
"""
import pytest
from decimal import Decimal
from unittest.mock import MagicMock, AsyncMock, patch
from uuid import uuid4
from fastapi import HTTPException


# ── Helper ────────────────────────────────────────────────────────────────────

def _make_service():
    """PagoService con todos los colaboradores mockeados."""
    from services.pago_service import PagoService
    svc = PagoService.__new__(PagoService)
    svc.oferta_repository = MagicMock()
    svc.mensaje_service = MagicMock()
    svc.servicio_repository = MagicMock()
    svc.solicitud_repository = MagicMock()
    svc.pago_repository = MagicMock()
    svc.proveedor_repository = MagicMock()
    svc.solicitud_service = MagicMock()
    svc.stripe = MagicMock()
    svc.notificacion_push_service = MagicMock()
    return svc


def _make_pago(estado: str, solicitud_id=None, cliente_id=None, proveedor_id=None,
               monto_total=Decimal("100.00"), comision=Decimal("10.00"),
               monto_proveedor=Decimal("90.00"), stripe_pi_id="pi_test"):
    p = MagicMock()
    p.estado = estado
    p.solicitud_id = solicitud_id or uuid4()
    p.cliente_id = cliente_id or uuid4()
    p.proveedor_id = proveedor_id or uuid4()
    p.monto_total = monto_total
    p.comision_plataforma = comision
    p.monto_proveedor = monto_proveedor
    p.stripe_payment_intent_id = stripe_pi_id
    return p


def _make_solicitud(estado: str, cliente_id, id=None, servicio_id=None):
    s = MagicMock()
    s.id = id or uuid4()
    s.estado = estado
    s.cliente_id = str(cliente_id)
    s.servicio_id = servicio_id or uuid4()
    return s


# ── Tests de cálculo de comisión ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_calculo_comision_exacto():
    """Con precio=100€ y comisión=10%, comision=10.00€ y monto_proveedor=90.00€."""
    from services.pago_service import PagoService
    svc = _make_service()

    cliente_id = uuid4()
    solicitud_id = uuid4()
    oferta_id = uuid4()
    proveedor_perfil_id = uuid4()
    proveedor_usuario_id = uuid4()

    oferta = MagicMock(estado="aceptada", precio=Decimal("100.00"),
                       solicitud_id=solicitud_id, id=oferta_id)
    solicitud = _make_solicitud("negociando", cliente_id, id=solicitud_id)
    servicio = MagicMock(proveedor_id=proveedor_perfil_id)
    perfil = MagicMock(usuario_id=proveedor_usuario_id, stripe_account_id="acct_test")

    svc.oferta_repository.get_by_id.return_value = oferta
    svc.solicitud_repository.get_by_id.return_value = solicitud
    svc.servicio_repository.get_by_id.return_value = servicio
    svc.proveedor_repository.get_by_id.return_value = perfil
    svc.pago_repository.get_by_solicitud_id.return_value = None  # no hay pago previo

    fake_intent = MagicMock(id="pi_new", client_secret="secret_new")
    pago_nuevo = _make_pago("pendiente_autorizacion", solicitud_id=solicitud_id)

    captured_args = {}
    def fake_pago_crear(sol_id, cli_id, prov_id, monto_total, comision, monto_proveedor, pi_id):
        captured_args["comision"] = comision
        captured_args["monto_proveedor"] = monto_proveedor
        return pago_nuevo

    svc.pago_repository.crear.side_effect = fake_pago_crear

    with patch("services.pago_service.run_in_threadpool", new=AsyncMock(return_value=fake_intent)):
        result = await svc.crear_pago_desde_oferta(oferta_id=oferta_id, cliente_id=cliente_id)

    assert captured_args["comision"] == Decimal("10.00")
    assert captured_args["monto_proveedor"] == Decimal("90.00")


@pytest.mark.asyncio
async def test_calculo_comision_redondeo():
    """Con precio=33.33€ y comisión=10%: 33.33*10/100=3.333 → redondeado a 3.33€."""
    svc = _make_service()
    cliente_id = uuid4()
    solicitud_id = uuid4()
    oferta_id = uuid4()

    oferta = MagicMock(estado="aceptada", precio=Decimal("33.33"),
                       solicitud_id=solicitud_id, id=oferta_id)
    solicitud = _make_solicitud("negociando", cliente_id, id=solicitud_id)
    svc.oferta_repository.get_by_id.return_value = oferta
    svc.solicitud_repository.get_by_id.return_value = solicitud
    svc.servicio_repository.get_by_id.return_value = MagicMock(proveedor_id=uuid4())
    svc.proveedor_repository.get_by_id.return_value = MagicMock(usuario_id=uuid4())
    svc.pago_repository.get_by_solicitud_id.return_value = None

    fake_intent = MagicMock(id="pi_x", client_secret="sec_x")
    captured = {}
    def fake_crear(sol_id, cli_id, prov_id, monto_total, comision, monto_proveedor, pi_id):
        captured["comision"] = comision
        captured["monto_proveedor"] = monto_proveedor
        return MagicMock()

    svc.pago_repository.crear.side_effect = fake_crear

    with patch("services.pago_service.run_in_threadpool", new=AsyncMock(return_value=fake_intent)):
        await svc.crear_pago_desde_oferta(oferta_id=oferta_id, cliente_id=cliente_id)

    assert captured["comision"] == Decimal("3.33")
    assert captured["monto_proveedor"] == Decimal("30.00")


# ── Test anti-doble pago ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_no_puede_pagar_dos_veces():
    """Si ya hay un pago en estado 'autorizado', devuelve el intent existente sin crear otro."""
    svc = _make_service()
    cliente_id = uuid4()
    solicitud_id = uuid4()
    oferta_id = uuid4()

    oferta = MagicMock(estado="aceptada", precio=Decimal("50.00"),
                       solicitud_id=solicitud_id, id=oferta_id)
    solicitud = _make_solicitud("negociando", cliente_id, id=solicitud_id)
    pago_existente = _make_pago("autorizado", stripe_pi_id="pi_already_exists")

    svc.oferta_repository.get_by_id.return_value = oferta
    svc.solicitud_repository.get_by_id.return_value = solicitud
    svc.pago_repository.get_by_solicitud_id.return_value = pago_existente

    fake_intent = MagicMock(client_secret="existing_secret")
    with patch("services.pago_service.run_in_threadpool", new=AsyncMock(return_value=fake_intent)):
        result = await svc.crear_pago_desde_oferta(oferta_id=oferta_id, cliente_id=cliente_id)

    # No debe haberse creado un nuevo pago
    svc.pago_repository.crear.assert_not_called()
    assert result["client_secret"] == "existing_secret"


# ── Tests de confirmar_entrega_y_transferir ───────────────────────────────────

@pytest.mark.asyncio
async def test_solo_cliente_puede_confirmar_entrega():
    """Solo el cliente de la solicitud puede confirmar la entrega → otro usuario → 403."""
    svc = _make_service()
    cliente_id = uuid4()
    otro_usuario = uuid4()
    solicitud_id = uuid4()

    solicitud = _make_solicitud("completada", cliente_id, id=solicitud_id)
    svc.solicitud_repository.get_by_id.return_value = solicitud

    with pytest.raises(HTTPException) as exc_info:
        await svc.confirmar_entrega_y_transferir(
            solicitud_id=solicitud_id,
            cliente_id=otro_usuario,
        )
    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_confirmar_entrega_solicitud_no_completada():
    """Si la solicitud no está completada → 400."""
    svc = _make_service()
    cliente_id = uuid4()
    solicitud_id = uuid4()

    solicitud = _make_solicitud("aceptada", cliente_id, id=solicitud_id)  # no completada
    svc.solicitud_repository.get_by_id.return_value = solicitud

    with pytest.raises(HTTPException) as exc_info:
        await svc.confirmar_entrega_y_transferir(
            solicitud_id=solicitud_id,
            cliente_id=cliente_id,
        )
    assert exc_info.value.status_code == 400
    assert "completada" in exc_info.value.detail.lower()


# ── Test capturar_pago_de_solicitud ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_capturar_pago_sin_pago_autorizado():
    """Si no hay pago o no está en estado 'autorizado' → 400."""
    svc = _make_service()
    solicitud_id = uuid4()

    # Caso: no hay pago
    svc.pago_repository.get_by_solicitud_id.return_value = None
    with pytest.raises(HTTPException) as exc_info:
        await svc.capturar_pago_de_solicitud(solicitud_id=solicitud_id)
    assert exc_info.value.status_code == 400

    # Caso: hay pago pero en estado incorrecto
    pago = _make_pago("pendiente_autorizacion")
    svc.pago_repository.get_by_solicitud_id.return_value = pago
    with pytest.raises(HTTPException) as exc_info:
        await svc.capturar_pago_de_solicitud(solicitud_id=solicitud_id)
    assert exc_info.value.status_code == 400
