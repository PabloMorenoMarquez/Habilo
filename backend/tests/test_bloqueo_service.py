"""
Tests unitarios de BloqueoService.

Cubre:
  - Bloquear cancela todas las solicitudes activas entre los dos usuarios
  - No puedes bloquearte a ti mismo
  - Bloquear cuando no hay solicitudes activas funciona sin errores
"""
import pytest
from unittest.mock import MagicMock, AsyncMock
from uuid import uuid4
from fastapi import HTTPException


def _make_service():
    from services.bloqueo_service import BloqueoService
    svc = BloqueoService.__new__(BloqueoService)
    svc.bloqueo_repository = MagicMock()
    svc.solicitud_repository = MagicMock()
    svc.solicitud_service = MagicMock()
    # cancelar_por_sistema es async
    svc.solicitud_service.cancelar_por_sistema = AsyncMock()
    return svc


@pytest.mark.asyncio
async def test_bloquear_cancela_solicitudes_activas():
    """Al bloquear, todas las solicitudes activas entre los dos usuarios se cancelan."""
    svc = _make_service()
    bloqueador_id = uuid4()
    bloqueado_id = uuid4()

    solicitud_1 = MagicMock(id=uuid4())
    solicitud_2 = MagicMock(id=uuid4())
    svc.solicitud_repository.buscar_activas_entre_usuarios.return_value = [solicitud_1, solicitud_2]
    svc.bloqueo_repository.crear.return_value = MagicMock()

    await svc.bloquear(bloqueador_id=bloqueador_id, bloqueado_id=bloqueado_id)

    # Debe haberse llamado una vez por solicitud activa
    assert svc.solicitud_service.cancelar_por_sistema.await_count == 2
    svc.solicitud_service.cancelar_por_sistema.assert_any_await(solicitud_1.id, "bloqueo")
    svc.solicitud_service.cancelar_por_sistema.assert_any_await(solicitud_2.id, "bloqueo")


@pytest.mark.asyncio
async def test_no_puedes_bloquearte_a_ti_mismo():
    """bloqueador_id == bloqueado_id → 400."""
    svc = _make_service()
    mismo_id = uuid4()

    with pytest.raises(HTTPException) as exc_info:
        await svc.bloquear(bloqueador_id=mismo_id, bloqueado_id=mismo_id)

    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_bloquear_sin_solicitudes_activas():
    """Si no hay solicitudes activas, solo se crea el bloqueo sin llamar a cancelar."""
    svc = _make_service()
    bloqueador_id = uuid4()
    bloqueado_id = uuid4()

    svc.solicitud_repository.buscar_activas_entre_usuarios.return_value = []
    svc.bloqueo_repository.crear.return_value = MagicMock()

    await svc.bloquear(bloqueador_id=bloqueador_id, bloqueado_id=bloqueado_id)

    svc.solicitud_service.cancelar_por_sistema.assert_not_awaited()
    svc.bloqueo_repository.crear.assert_called_once_with(bloqueador_id, bloqueado_id)
