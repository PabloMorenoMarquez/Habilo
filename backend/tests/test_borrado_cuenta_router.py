"""Endpoints del borrado de cuenta: el propio usuario y el admin usan BorradoCuentaService."""
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient


def _app(router):
    from utils.rate_limiter import limiter
    app = FastAPI()
    app.state.limiter = limiter
    app.include_router(router)
    return app


def test_delete_me_borra_al_usuario_del_token():
    from routers.usuarios import router
    from utils.auth_middleware import get_current_user
    uid = str(uuid4())
    app = _app(router)
    app.dependency_overrides[get_current_user] = lambda: {"user_id": uid, "es_admin": False}

    with patch("routers.usuarios.BorradoCuentaService") as service:
        service.return_value.borrar = AsyncMock(return_value="borrada")
        response = TestClient(app).delete("/usuarios/me")

    assert response.status_code == 200
    assert response.json() == {"resultado": "borrada"}
    service.return_value.borrar.assert_awaited_once_with(uid)


def test_admin_eliminar_usa_el_servicio_nuevo():
    from routers.admin import router
    from utils.auth_middleware import get_current_admin
    admin_id, objetivo = str(uuid4()), uuid4()
    app = _app(router)
    app.dependency_overrides[get_current_admin] = lambda: {"user_id": admin_id, "es_admin": True}

    with patch("routers.admin.BorradoCuentaService") as service:
        service.return_value.borrar = AsyncMock(return_value="anonimizada")
        response = TestClient(app).patch(f"/admin/usuarios/{objetivo}/eliminar")

    assert response.status_code == 200
    assert response.json() == {"resultado": "anonimizada"}
    service.return_value.borrar.assert_awaited_once_with(objetivo, admin_id=admin_id)
