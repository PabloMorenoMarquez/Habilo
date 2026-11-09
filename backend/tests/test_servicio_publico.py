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
