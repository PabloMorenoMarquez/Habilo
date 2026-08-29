"""
conftest.py — fixtures compartidos para los tests unitarios.

IMPORTANTE: los os.environ.setdefault de la zona de arranque se ejecutan
antes de que cualquier módulo de la app se importe, lo que evita que
SQLAlchemy intente conectarse a una BD real y que Config lea None de las vars.
"""
import os

# ── Variables de entorno mínimas requeridas por Config y database.engine ──────
# Deben estar antes de cualquier `from services/models/...` en los tests.
os.environ.setdefault("DATABASE_URL", "postgresql://fake:fake@localhost/fake_test")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-at-least-32-chars-long!")
os.environ.setdefault("JWT_ALGORITH", "HS256")
os.environ.setdefault("JWT_EXPIRATION_HOURS", "24")
os.environ.setdefault("STRIPE_COMISION_PORCENTAJE", "10")
os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test_fake_key")
os.environ.setdefault("STRIPE_PUBLISHABLE_KEY", "pk_test_fake_key")
os.environ.setdefault("STRIPE_WEBHOOK_SECRET", "whsec_fake")
os.environ.setdefault("VAPID_PUBLIC_KEY", "fake_vapid_public")
os.environ.setdefault("VAPID_PRIVATE_KEY", "fake_vapid_private")
os.environ.setdefault("VAPID_CONTACT_EMAIL", "test@test.com")
os.environ.setdefault("RESEND_API_KEY", "re_fake")
os.environ.setdefault("EMAIL_FROM", "noreply@test.com")
os.environ.setdefault("SUPABASE_URL", "https://fake.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "fake_service_key")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")
os.environ.setdefault("BACKEND_URL", "http://localhost:8000")
os.environ.setdefault("CORS_ALLOWED_ORIGINS", "http://localhost:3000")

import pytest
from uuid import uuid4


# ── Fixtures de IDs reutilizables ─────────────────────────────────────────────

@pytest.fixture
def cliente_id():
    return uuid4()


@pytest.fixture
def proveedor_usuario_id():
    return uuid4()


@pytest.fixture
def proveedor_perfil_id():
    return uuid4()


@pytest.fixture
def servicio_id():
    return uuid4()


@pytest.fixture
def solicitud_id():
    return uuid4()


@pytest.fixture
def oferta_id():
    return uuid4()
