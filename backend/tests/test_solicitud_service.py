"""
Tests unitarios de SolicitudService.cambiar_estado.

Estrategia de mockeo: SolicitudService instancia sus repositorios en __init__,
por lo que usamos SolicitudService.__new__ para crear la instancia sin llamar
al constructor, y luego asignamos mocks directamente a cada atributo.

PagoService se importa dentro de los métodos de SolicitudService mediante
`from services.pago_service import PagoService`, así que lo parcheamos en
services.pago_service (el módulo fuente) para que la importación dinámica
recoja el mock.
"""
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from uuid import uuid4
from fastapi import HTTPException


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_service():
    """Crea un SolicitudService con todos los repositorios mockeados."""
    from services.solicitud_service import SolicitudService
    svc = SolicitudService.__new__(SolicitudService)
    svc.solicitud_repository = MagicMock()
    svc.servicio_repository = MagicMock()
    svc.proveedor_repository = MagicMock()
    svc.bloqueo_repository = MagicMock()
    svc.notificacion_push_service = MagicMock()
    return svc


def _make_solicitud(estado: str, cliente_id, servicio_id, id=None):
    s = MagicMock()
    s.id = id or uuid4()
    s.estado = estado
    s.cliente_id = str(cliente_id)
    s.servicio_id = servicio_id
    return s


def _make_servicio(proveedor_id, servicio_id=None):
    sv = MagicMock()
    sv.id = servicio_id or uuid4()
    sv.proveedor_id = proveedor_id
    sv.titulo = "Servicio test"
    return sv


def _make_pago_service_mock():
    """Devuelve un mock de PagoService con métodos async."""
    mock = MagicMock()
    mock.capturar_pago_de_solicitud = AsyncMock()
    mock.cancelar_pago_de_solicitud = AsyncMock()
    mock.reembolsar_pago_de_solicitud = AsyncMock()
    return mock


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def cliente_id():
    return uuid4()


@pytest.fixture
def proveedor_perfil_id():
    return uuid4()


@pytest.fixture
def solicitud_id():
    return uuid4()


@pytest.fixture
def servicio_id():
    return uuid4()


# ── Transiciones válidas ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_proveedor_acepta_solicitud_pendiente(cliente_id, proveedor_perfil_id, solicitud_id, servicio_id):
    """pendiente → aceptada: solo el proveedor, llama a capturar_pago."""
    svc = _make_service()
    solicitud = _make_solicitud("pendiente", cliente_id, servicio_id, id=solicitud_id)
    servicio = _make_servicio(proveedor_perfil_id, servicio_id)

    svc.solicitud_repository.get_by_id.return_value = solicitud
    svc.servicio_repository.get_by_id.return_value = servicio
    svc.solicitud_repository.actualizar_estado.return_value = solicitud

    pago_mock = _make_pago_service_mock()
    with patch("services.pago_service.PagoService", return_value=pago_mock):
        result = await svc.cambiar_estado(
            solicitud_id=solicitud_id,
            nuevo_estado="aceptada",
            usuario_id=uuid4(),          # usuario distinto al cliente
            proveedor_id=proveedor_perfil_id,
            motivo=None,
        )

    pago_mock.capturar_pago_de_solicitud.assert_awaited_once_with(solicitud_id)
    svc.solicitud_repository.actualizar_estado.assert_called_once_with(solicitud_id, "aceptada", None)


@pytest.mark.asyncio
async def test_proveedor_rechaza_solicitud_pendiente(cliente_id, proveedor_perfil_id, solicitud_id, servicio_id):
    """pendiente → rechazada: solo el proveedor, llama a cancelar_pago, requiere motivo."""
    svc = _make_service()
    solicitud = _make_solicitud("pendiente", cliente_id, servicio_id, id=solicitud_id)
    servicio = _make_servicio(proveedor_perfil_id, servicio_id)

    svc.solicitud_repository.get_by_id.return_value = solicitud
    svc.servicio_repository.get_by_id.return_value = servicio
    svc.solicitud_repository.actualizar_estado.return_value = solicitud

    pago_mock = _make_pago_service_mock()
    with patch("services.pago_service.PagoService", return_value=pago_mock):
        await svc.cambiar_estado(
            solicitud_id=solicitud_id,
            nuevo_estado="rechazada",
            usuario_id=uuid4(),
            proveedor_id=proveedor_perfil_id,
            motivo="No disponible",
        )

    pago_mock.cancelar_pago_de_solicitud.assert_awaited_once_with(solicitud_id)


@pytest.mark.asyncio
async def test_cliente_cancela_solicitud_pendiente(cliente_id, proveedor_perfil_id, solicitud_id, servicio_id):
    """pendiente → cancelada: solo el cliente."""
    svc = _make_service()
    solicitud = _make_solicitud("pendiente", cliente_id, servicio_id, id=solicitud_id)
    servicio = _make_servicio(proveedor_perfil_id, servicio_id)

    svc.solicitud_repository.get_by_id.return_value = solicitud
    svc.servicio_repository.get_by_id.return_value = servicio
    svc.solicitud_repository.actualizar_estado.return_value = solicitud

    pago_mock = _make_pago_service_mock()
    with patch("services.pago_service.PagoService", return_value=pago_mock):
        await svc.cambiar_estado(
            solicitud_id=solicitud_id,
            nuevo_estado="cancelada",
            usuario_id=cliente_id,
            proveedor_id=None,
            motivo="Cambié de opinión",
        )

    pago_mock.cancelar_pago_de_solicitud.assert_awaited_once_with(solicitud_id)
    svc.solicitud_repository.actualizar_estado.assert_called_once_with(solicitud_id, "cancelada", "Cambié de opinión")


@pytest.mark.asyncio
async def test_proveedor_puede_cancelar_solicitud_aceptada(cliente_id, proveedor_perfil_id, solicitud_id, servicio_id):
    """aceptada → cancelada: ambos pueden — proveedor lo intenta correctamente."""
    svc = _make_service()
    solicitud = _make_solicitud("aceptada", cliente_id, servicio_id, id=solicitud_id)
    servicio = _make_servicio(proveedor_perfil_id, servicio_id)

    svc.solicitud_repository.get_by_id.return_value = solicitud
    svc.servicio_repository.get_by_id.return_value = servicio
    svc.solicitud_repository.actualizar_estado.return_value = solicitud

    pago_mock = _make_pago_service_mock()
    with patch("services.pago_service.PagoService", return_value=pago_mock):
        await svc.cambiar_estado(
            solicitud_id=solicitud_id,
            nuevo_estado="cancelada",
            usuario_id=uuid4(),
            proveedor_id=proveedor_perfil_id,
            motivo="Imprevisto",
        )

    pago_mock.reembolsar_pago_de_solicitud.assert_awaited_once_with(solicitud_id)


@pytest.mark.asyncio
async def test_cliente_puede_cancelar_solicitud_aceptada(cliente_id, proveedor_perfil_id, solicitud_id, servicio_id):
    """aceptada → cancelada: ambos pueden — cliente lo intenta correctamente."""
    svc = _make_service()
    solicitud = _make_solicitud("aceptada", cliente_id, servicio_id, id=solicitud_id)
    servicio = _make_servicio(proveedor_perfil_id, servicio_id)

    svc.solicitud_repository.get_by_id.return_value = solicitud
    svc.servicio_repository.get_by_id.return_value = servicio
    svc.solicitud_repository.actualizar_estado.return_value = solicitud

    pago_mock = _make_pago_service_mock()
    with patch("services.pago_service.PagoService", return_value=pago_mock):
        await svc.cambiar_estado(
            solicitud_id=solicitud_id,
            nuevo_estado="cancelada",
            usuario_id=cliente_id,
            proveedor_id=None,
            motivo="No voy a necesitarlo",
        )

    pago_mock.reembolsar_pago_de_solicitud.assert_awaited_once_with(solicitud_id)


# ── Transiciones inválidas ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_transicion_desde_estado_terminal_falla(cliente_id, proveedor_perfil_id, solicitud_id, servicio_id):
    """completada → aceptada: estado terminal, ninguna transición es válida → 400."""
    svc = _make_service()
    solicitud = _make_solicitud("completada", cliente_id, servicio_id, id=solicitud_id)
    servicio = _make_servicio(proveedor_perfil_id, servicio_id)

    svc.solicitud_repository.get_by_id.return_value = solicitud
    svc.servicio_repository.get_by_id.return_value = servicio

    with pytest.raises(HTTPException) as exc_info:
        await svc.cambiar_estado(
            solicitud_id=solicitud_id,
            nuevo_estado="aceptada",
            usuario_id=uuid4(),
            proveedor_id=proveedor_perfil_id,
        )
    assert exc_info.value.status_code == 400
    assert "completada" in exc_info.value.detail


@pytest.mark.asyncio
async def test_solo_proveedor_puede_aceptar_pendiente(cliente_id, proveedor_perfil_id, solicitud_id, servicio_id):
    """pendiente → aceptada: si el usuario no es proveedor → 403."""
    svc = _make_service()
    solicitud = _make_solicitud("pendiente", cliente_id, servicio_id, id=solicitud_id)
    servicio = _make_servicio(proveedor_perfil_id, servicio_id)

    svc.solicitud_repository.get_by_id.return_value = solicitud
    svc.servicio_repository.get_by_id.return_value = servicio

    with pytest.raises(HTTPException) as exc_info:
        await svc.cambiar_estado(
            solicitud_id=solicitud_id,
            nuevo_estado="aceptada",
            usuario_id=cliente_id,   # cliente intentando aceptar
            proveedor_id=None,
        )
    assert exc_info.value.status_code == 403
    assert "proveedor" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_solo_cliente_puede_cancelar_pendiente(cliente_id, proveedor_perfil_id, solicitud_id, servicio_id):
    """pendiente → cancelada: QUIEN_PUEDE dice 'cliente'; si el proveedor lo intenta → 403."""
    svc = _make_service()
    solicitud = _make_solicitud("pendiente", cliente_id, servicio_id, id=solicitud_id)
    servicio = _make_servicio(proveedor_perfil_id, servicio_id)

    svc.solicitud_repository.get_by_id.return_value = solicitud
    svc.servicio_repository.get_by_id.return_value = servicio

    with pytest.raises(HTTPException) as exc_info:
        await svc.cambiar_estado(
            solicitud_id=solicitud_id,
            nuevo_estado="cancelada",
            usuario_id=uuid4(),          # no es el cliente
            proveedor_id=proveedor_perfil_id,
            motivo="Prueba",
        )
    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_cancelar_sin_motivo_falla(cliente_id, proveedor_perfil_id, solicitud_id, servicio_id):
    """Cancelar sin especificar motivo → 400."""
    svc = _make_service()
    solicitud = _make_solicitud("pendiente", cliente_id, servicio_id, id=solicitud_id)
    servicio = _make_servicio(proveedor_perfil_id, servicio_id)

    svc.solicitud_repository.get_by_id.return_value = solicitud
    svc.servicio_repository.get_by_id.return_value = servicio

    with pytest.raises(HTTPException) as exc_info:
        await svc.cambiar_estado(
            solicitud_id=solicitud_id,
            nuevo_estado="cancelada",
            usuario_id=cliente_id,
            proveedor_id=None,
            motivo=None,              # sin motivo
        )
    assert exc_info.value.status_code == 400
    assert "motivo" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_solicitud_no_encontrada_falla(solicitud_id):
    """Si el repositorio devuelve None → 404."""
    svc = _make_service()
    svc.solicitud_repository.get_by_id.return_value = None

    with pytest.raises(HTTPException) as exc_info:
        await svc.cambiar_estado(
            solicitud_id=solicitud_id,
            nuevo_estado="aceptada",
            usuario_id=uuid4(),
        )
    assert exc_info.value.status_code == 404
