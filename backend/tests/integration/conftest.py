"""
conftest.py para tests de integración geoespacial.

Requiere una instancia real de PostgreSQL+PostGIS.
Usa la variable de entorno TEST_DATABASE_URL (por defecto la del docker-compose.test.yml).

Uso:
    # 1. Arrancar el contenedor
    docker compose -f docker-compose.test.yml up -d

    # 2. Esperar a que esté healthy y ejecutar:
    TEST_DATABASE_URL=postgresql://test:test@localhost:5433/serviclick_test \
        python -m pytest tests/integration/ -v

    # 3. Parar el contenedor al terminar
    docker compose -f docker-compose.test.yml down
"""
import os
import sys
import pytest

# Variables de entorno para módulos de la app que se cargan como side-effect
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

TEST_DB_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql://test:test@localhost:5433/serviclick_test",
)
# Sobrescribimos DATABASE_URL para que el engine de la app apunte al contenedor de test
os.environ["DATABASE_URL"] = TEST_DB_URL


from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from decimal import Decimal
import uuid


@pytest.fixture(scope="session")
def pg_engine():
    """
    Engine de SQLAlchemy apuntando al PostGIS de test.
    Se crea una vez por sesión de pytest.
    """
    engine = create_engine(TEST_DB_URL, echo=False)
    
    # Activar extensión PostGIS si no está ya
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        conn.commit()
    
    # Crear todas las tablas del modelo
    from database.base import base
    import models  # noqa: F401 — importa todos los modelos para que Base los conozca
    base.metadata.create_all(engine)
    
    yield engine
    
    # Limpieza al final de la sesión
    base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture(scope="session")
def Session(pg_engine):
    return sessionmaker(bind=pg_engine)


@pytest.fixture
def db(Session):
    """Sesión de BD por test — hace rollback al terminar para aislar los tests."""
    session = Session()
    yield session
    session.rollback()
    session.close()


@pytest.fixture(scope="session")
def seed_data(Session):
    """
    Inserta datos de referencia una vez por sesión:
    - 2 usuarios (proveedor_a y proveedor_b)
    - 2 perfiles de proveedor
    - 3 servicios con ubicaciones:
        · Madrid centro      (40.4168° N, -3.7038° W)
        · Madrid periferia   (40.5560° N, -3.6851° W) ≈ 15 km al norte
        · Barcelona          (41.3851° N,  2.1734° E) ≈ 505 km
    """
    from models.usuario import Usuario
    from models.perfil_proveedor import Perfil_Proveedor
    from models.categoria import Categoria
    from models.servicio import Servicio
    from geoalchemy2.functions import ST_SetSRID, ST_MakePoint

    session = Session()

    try:
        # Categorías
        cat_fontaneria = Categoria(id=uuid.uuid4(), nombre="Fontanería")
        cat_pintura = Categoria(id=uuid.uuid4(), nombre="Pintura")
        session.add_all([cat_fontaneria, cat_pintura])
        session.flush()

        # Usuarios
        u_a = Usuario(id=uuid.uuid4(), email="proveedor_a@test.com", nombre="Proveedor A")
        u_b = Usuario(id=uuid.uuid4(), email="proveedor_b@test.com", nombre="Proveedor B")
        session.add_all([u_a, u_b])
        session.flush()

        # Perfiles de proveedor
        p_a = Perfil_Proveedor(id=uuid.uuid4(), usuario_id=u_a.id, radio_km_disponible=50)
        p_b = Perfil_Proveedor(id=uuid.uuid4(), usuario_id=u_b.id, radio_km_disponible=50)
        session.add_all([p_a, p_b])
        session.flush()

        # Servicios con ubicaciones reales
        def punto(lat, lng):
            return ST_SetSRID(ST_MakePoint(lng, lat), 4326)

        s_madrid_centro = Servicio(
            id=uuid.uuid4(),
            proveedor_id=p_a.id,
            categoria_id=cat_fontaneria.id,
            titulo="Fontanería Madrid Centro",
            descripcion="Servicio de fontanería",
            precio=Decimal("50.00"),
            tipo_precio="fijo",
            ubicacion=punto(40.4168, -3.7038),
            activo=True,
        )
        s_madrid_periferia = Servicio(
            id=uuid.uuid4(),
            proveedor_id=p_a.id,
            categoria_id=cat_fontaneria.id,
            titulo="Fontanería Madrid Periferia",
            descripcion="Servicio de fontanería en periferia",
            precio=Decimal("40.00"),
            tipo_precio="fijo",
            ubicacion=punto(40.5560, -3.6851),   # ≈ 15.6 km del centro
            activo=True,
        )
        s_barcelona = Servicio(
            id=uuid.uuid4(),
            proveedor_id=p_b.id,
            categoria_id=cat_pintura.id,
            titulo="Pintura Barcelona",
            descripcion="Servicio de pintura",
            precio=Decimal("60.00"),
            tipo_precio="hora",
            ubicacion=punto(41.3851, 2.1734),    # ≈ 505 km
            activo=True,
        )

        session.add_all([s_madrid_centro, s_madrid_periferia, s_barcelona])
        session.commit()

        yield {
            "cat_fontaneria_id": cat_fontaneria.id,
            "cat_pintura_id": cat_pintura.id,
            "proveedor_a_id": p_a.id,
            "proveedor_b_id": p_b.id,
            "s_madrid_centro_id": s_madrid_centro.id,
            "s_madrid_periferia_id": s_madrid_periferia.id,
            "s_barcelona_id": s_barcelona.id,
        }
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
