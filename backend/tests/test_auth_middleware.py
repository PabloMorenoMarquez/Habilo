"""
Tests de get_current_user (auth_middleware).

Estrategia: montamos una mini-app FastAPI con un endpoint protegido y la
probamos con TestClient. UserRepository se parchea para no tocar la BD.

Tokens JWT se generan con python-jose usando la misma clave de test que
está en conftest.py / os.environ para que Config los valide correctamente.
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch
from uuid import uuid4

from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient
from jose import jwt


# ── Constantes de test ────────────────────────────────────────────────────────
JWT_SECRET = "test-secret-key-at-least-32-chars-long!"
JWT_ALGO = "HS256"


def _make_token(user_id: str, exp_delta: timedelta = timedelta(hours=1)) -> str:
    payload = {
        "user_id": user_id,
        "email": "test@test.com",
        "name": "Test User",
        "exp": datetime.utcnow() + exp_delta,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def _make_usuario(baneado: bool = False, cuenta_eliminada: bool = False):
    u = MagicMock()
    u.baneado = baneado
    u.cuenta_eliminada = cuenta_eliminada
    u.es_admin = False
    return u


def _build_app():
    """Construye una mini-app con el endpoint protegido."""
    from utils.auth_middleware import get_current_user
    app = FastAPI()

    @app.get("/protegido")
    def protegido(user=Depends(get_current_user)):
        return {"user_id": user["user_id"]}

    return app


# ── Tests ──────────────────────────────────────────────────────────────────────

def test_token_invalido_rechazado():
    """Token malformado → 401."""
    app = _build_app()
    client = TestClient(app, raise_server_exceptions=False)

    response = client.get("/protegido", headers={"Authorization": "Bearer token.invalido.xyz"})
    assert response.status_code == 401


def test_token_ausente_rechazado():
    """Sin header Authorization → 401 (OAuth2PasswordBearer devuelve 401)."""
    app = _build_app()
    client = TestClient(app, raise_server_exceptions=False)

    response = client.get("/protegido")
    assert response.status_code == 401


def test_usuario_baneado_rechazado():
    """Token válido pero usuario baneado → 403 con mensaje 'suspendida'."""
    user_id = str(uuid4())
    token = _make_token(user_id)
    usuario_baneado = _make_usuario(baneado=True)

    app = _build_app()
    client = TestClient(app, raise_server_exceptions=False)

    with patch("repositories.user_repository.UserRepository.get_by_id", return_value=usuario_baneado):
        response = client.get(
            "/protegido",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 403
    assert "suspendida" in response.json()["detail"].lower()


def test_cuenta_eliminada_rechazada():
    """Token válido pero cuenta eliminada → 403 con mensaje 'eliminada'."""
    user_id = str(uuid4())
    token = _make_token(user_id)
    usuario_eliminado = _make_usuario(cuenta_eliminada=True)

    app = _build_app()
    client = TestClient(app, raise_server_exceptions=False)

    with patch("repositories.user_repository.UserRepository.get_by_id", return_value=usuario_eliminado):
        response = client.get(
            "/protegido",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 403
    assert "eliminada" in response.json()["detail"].lower()


def test_usuario_valido_pasa():
    """Token válido y usuario normal → 200 con user_id en respuesta."""
    user_id = str(uuid4())
    token = _make_token(user_id)
    usuario_ok = _make_usuario()

    app = _build_app()
    client = TestClient(app, raise_server_exceptions=False)

    with patch("repositories.user_repository.UserRepository.get_by_id", return_value=usuario_ok):
        response = client.get(
            "/protegido",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 200
    assert response.json()["user_id"] == user_id


def test_usuario_no_encontrado_rechazado():
    """Token válido pero el usuario ya no existe en BD → 403."""
    user_id = str(uuid4())
    token = _make_token(user_id)

    app = _build_app()
    client = TestClient(app, raise_server_exceptions=False)

    with patch("repositories.user_repository.UserRepository.get_by_id", return_value=None):
        response = client.get(
            "/protegido",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 403
