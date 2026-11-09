from fastapi import FastAPI
from fastapi.testclient import TestClient
from unittest.mock import patch


def test_honeypot_no_guarda_lead():
    from routers.leads import router
    from utils.rate_limiter import limiter
    app = FastAPI()
    app.state.limiter = limiter
    app.include_router(router)

    with patch("routers.leads.LeadService") as service:
        client = TestClient(app)
        response = client.post("/leads/", json={
            "servicio_id": "00000000-0000-0000-0000-000000000001",
            "nombre": "Bot", "contacto": "bot@example.com",
            "canal_contacto": "email", "mensaje": "Compra barato aquí",
            "consentimiento": True, "website": "https://spam.example",
        })

    assert response.status_code == 201
    assert response.json() == {"ok": True}
    service.return_value.crear.assert_not_called()


def test_lead_sin_consentimiento_devuelve_422():
    from routers.leads import router
    from utils.rate_limiter import limiter
    app = FastAPI()
    app.state.limiter = limiter
    app.include_router(router)

    client = TestClient(app)
    response = client.post("/leads/", json={
        "servicio_id": "00000000-0000-0000-0000-000000000001",
        "nombre": "Ana", "contacto": "ana@example.com",
        "canal_contacto": "email", "mensaje": "Necesito un profesor",
        "consentimiento": False,
    })

    assert response.status_code == 422
