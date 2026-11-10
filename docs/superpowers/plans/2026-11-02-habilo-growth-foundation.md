# Habilo Growth Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Convertir Habilo en un escaparate público indexable y medible, con perfiles de profesor con consentimiento y contacto sin cuenta, antes de escalar contenido o publicidad.

**Architecture:** Se mantiene el frontend Next.js App Router y el backend FastAPI. Las páginas públicas pasan a tener datos iniciales renderizados en servidor; el backend añade campos estructurados, perfiles públicos anonimizados por defecto, leads anónimos y un resumen público. La analítica queda bloqueada hasta consentimiento explícito. Los cambios de esquema se aplican con SQL manual en Supabase porque el proyecto no usa Alembic.

**Tech Stack:** Next.js 16, React 19, Tailwind 4, FastAPI, SQLAlchemy 2, PostgreSQL/PostGIS, PostHog, pytest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-02-habilo-growth-design.md`

## Scope

Este plan implementa la primera entrega: medición, landing pública, login movido, SSR del catálogo, perfiles públicos, campos estructurados, contacto sin cuenta y CMP.

Quedan fuera de este plan, y se planificarán por separado:

- Flujo completo de reseñas manuales y moderación.
- Páginas ciudad × materia, blog y waitlist.
- Slugs legibles y páginas de categoría: el sitemap deja de incluir categorías y esas URLs se sustituirán por ciudad × materia.
- Motor de vídeo, guiones, TTS, publicación y calendario editorial.
- Panel `/admin/growth`, informes automáticos y campañas pagadas.

## Global Constraints

- No hay Alembic ni migraciones automáticas: todo cambio de esquema se entrega como SQL y se aplica manualmente en Supabase.
- `perfil_publico` y `consentimiento_marketing` nacen en `false`; nunca se ponen en `true` sin consentimiento escrito del profesor.
- Si `perfil_publico` es `false`, la API pública no devuelve nombre real, foto, ciudad ni zona del profesor.
- Los perfiles no públicos responden con `robots: noindex, follow`.
- Ningún lead se guarda sin `consentimiento=True`; el checkbox empieza desmarcado.
- El formulario de lead no exige cuenta y tiene rate limit de `5/hour` y honeypot.
- No se inicializa session replay. PostHog se inicializa opt-out y sin persistencia hasta consentimiento.
- Ningún evento ni `posthog.identify` se ejecutan antes del consentimiento. El opt-out de Task 12 se aplica antes de instrumentar eventos en Task 6.
- `/home` no pide geolocalización automáticamente: solo usa una ubicación guardada o una acción explícita del usuario.
- No se usa el texto “miles de profesionales” ni “verificados” si `verificado` no es `true`.
- Todo el copy visible va en español.
- Las páginas SSR no pueden fallar si la API devuelve error o lista vacía: deben renderizar un estado vacío honesto. Solo un `404` real usa `notFound()`.
- Los tests usan `base.metadata.create_all`; la migración SQL no se ejecuta en tests.
- Añadir solo los archivos indicados en cada commit. No usar `git add -A`.
- Hay cambios locales previos del usuario. Antes de editar un archivo modificado, revisar `git diff -- <archivo>` y preservar esos cambios.

## Review Focus

1. Profesor sin opt-in aparece con nombre o foto real en catálogo, servicio o perfil. Test en Task 3.
2. Lead guardado sin consentimiento o bot evita el honeypot. Tests en Task 4.
3. PostHog captura o persiste identificadores antes de aceptar analítica. Test en Task 12.
4. Login OAuth y redirecciones internas siguen apuntando a `/` y rompen el flujo. Tests en Task 5.
5. Metadatos y HTML SSR siguen genéricos porque `params` o `searchParams` no se esperan como Promise. Tests en Tasks 7 y 9.

---

## File Structure

### Backend nuevo

- `backend/models/lead.py`: modelo `Lead`.
- `backend/schemas/lead_schema.py`: validación y consentimiento del lead.
- `backend/repositories/lead_repository.py`: persistencia de leads.
- `backend/services/lead_service.py`: resolución de servicio/profesor y notificación.
- `backend/routers/leads.py`: endpoint público `POST /leads/`.
- `backend/migrations/2026-11-02_growth_foundation.sql`: esquema nuevo.
- `backend/migrations/2026-11-02_data_backfill.sql`: categoría de clases y datos iniciales.
- `backend/tests/test_growth_schema.py`: contrato de modelos y schemas.
- `backend/tests/test_servicio_publico.py`: catálogo y resumen.
- `backend/tests/test_perfil_publico.py`: privacidad y perfil público.
- `backend/tests/test_lead_service.py`: reglas del lead.
- `backend/tests/test_lead_router.py`: honeypot y validación HTTP.
- `backend/tests/test_auth_redirect.py`: destino del token OAuth.

### Backend modificado

- `backend/models/perfil_proveedor.py`, `backend/models/servicio.py`, `backend/models/__init__.py`.
- `backend/schemas/proveedor_schema.py`, `backend/schemas/servicio_schema.py`.
- `backend/repositories/servicio_repository.py`, `backend/repositories/proveedor_repository.py`, `backend/repositories/valoracion_repository.py`.
- `backend/services/servicio_service.py`, `backend/services/proveedor_service.py`, `backend/services/notificacion_email_service.py`.
- `backend/routers/servicios.py`, `backend/routers/proveedores.py`, `backend/routers/auth.py`, `backend/main.py`, `backend/seed_categories.py`.

### Frontend nuevo

- `frontend/lib/server-api.ts`: fetch público para Server Components.
- `frontend/lib/service-mapper.ts`: conversión de `ServicioBackend` a tarjeta.
- `frontend/lib/utm.ts`: captura de UTM y `ref`.
- `frontend/components/landing/landing-search.tsx`: buscador y CTA de landing.
- `frontend/components/landing/landing-teacher-cta.tsx`: CTA “Soy profesor” con evento.
- `frontend/components/landing/landing-tracker.tsx`: `referral_visit`.
- `frontend/components/lead-contact-dialog.tsx`: formulario de contacto anónimo.
- `frontend/components/perfil-publico-form.tsx`: opt-in y datos del profesor.
- `frontend/components/public-profile-contact.tsx`: CTA de perfil público.
- `frontend/context/consent-context.tsx`: estado de consentimiento.
- `frontend/components/consent-banner.tsx`: banner CMP.
- `frontend/components/consent-settings-button.tsx`: reabrir preferencias.
- `frontend/app/login/page.tsx`, `frontend/app/login/login-client.tsx`.
- `frontend/app/home/home-client.tsx`.
- `frontend/app/profesores/[id]/page.tsx`.
- `frontend/e2e/login_route.spec.ts`, `landing.spec.ts`, `home_ssr.spec.ts`, `service_contact.spec.ts`, `service_detail.spec.ts`, `public_profile.spec.ts`, `provider_settings.spec.ts`, `consent.spec.ts`.

### Frontend modificado

- `frontend/app/page.tsx`, `frontend/app/layout.tsx`, `frontend/app/manifest.ts`, `frontend/app/sitemap.ts`, `frontend/app/robots.ts`.
- `frontend/app/home/page.tsx`, `frontend/app/home/service/[id]/page.tsx`, `frontend/app/home/service/[id]/service-detail-client.tsx`.
- `frontend/app/dashboard/page.tsx`, `frontend/app/chats/page.tsx`, `frontend/app/favoritos/page.tsx`, `frontend/app/profile/page.tsx`, `frontend/app/select-role/page.tsx`, `frontend/app/admin/layout.tsx`.
- `frontend/components/navbar.tsx`, `frontend/components/auth-required-dialog.tsx`.
- `frontend/lib/api.ts`, `frontend/hooks/use-paginacion.ts`, `frontend/e2e/helpers/auth.ts`, `frontend/context/auth-context.tsx`.
- `frontend/app/legal/privacidad/page.tsx`, `frontend/instrumentation-client.ts`.

### Docs

- `docs/growth/measurement-runbook.md`.

---

### Task 1: Esquema de crecimiento y modelo de lead

**Files:**
- Create: `backend/models/lead.py`
- Create: `backend/schemas/lead_schema.py`
- Create: `backend/migrations/2026-11-02_growth_foundation.sql`
- Modify: `backend/models/perfil_proveedor.py`
- Modify: `backend/models/servicio.py`
- Modify: `backend/models/__init__.py`
- Modify: `backend/schemas/proveedor_schema.py`
- Modify: `backend/schemas/servicio_schema.py`
- Modify: `backend/repositories/proveedor_repository.py`
- Modify: `backend/repositories/servicio_repository.py`
- Modify: `backend/services/proveedor_service.py`
- Modify: `backend/services/servicio_service.py`
- Modify: `backend/routers/proveedores.py`
- Modify: `backend/routers/servicios.py`
- Test: `backend/tests/test_growth_schema.py`

**Interfaces:**
- Consumes: nada.
- Produces:
  - Columnas `Perfil_Proveedor.ciudad`, `zona`, `materias: list[str]`, `niveles: list[str]`, `perfil_publico: bool`, `consentimiento_marketing: bool`.
  - Columnas `Servicio.ciudad`, `zona`, `materias`, `niveles`.
  - Modelo `Lead` con `id`, `servicio_id`, `perfil_id`, `proveedor_id`, `nombre`, `contacto`, `canal_contacto`, `mensaje`, `consentimiento`, `ref`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `pagina_origen`, `estado`, `fecha_creacion`.
  - `CrearLead` con `servicio_id: UUID | None`, `perfil_id: UUID | None`, `nombre`, `contacto`, `canal_contacto`, `mensaje`, `consentimiento`, `website`, `ref`, UTM opcionales y `pagina_origen`.

- [x] **Step 1: Escribir tests de contrato**

```python
import pytest
from pydantic import ValidationError
from uuid import uuid4

from schemas.lead_schema import CrearLead


def test_lead_exige_consentimiento():
    with pytest.raises(ValidationError):
        CrearLead(
            servicio_id=uuid4(), nombre="Ana", contacto="+34600111222",
            canal_contacto="whatsapp", mensaje="Necesito un profesor de matemáticas",
            consentimiento=False,
        )


def test_lead_exige_servicio_o_perfil():
    with pytest.raises(ValidationError):
        CrearLead(
            nombre="Ana", contacto="ana@example.com", canal_contacto="email",
            mensaje="Necesito un profesor de matemáticas", consentimiento=True,
        )


def test_lead_acepta_whatsapp_y_utm():
    lead = CrearLead(
        servicio_id=uuid4(), nombre="Ana", contacto="+34600111222",
        canal_contacto="whatsapp", mensaje="Necesito un profesor de matemáticas",
        consentimiento=True, utm_source="tiktok", utm_campaign="talavera-clases",
        ref="PROFE123",
    )
    assert lead.canal_contacto == "whatsapp"
    assert lead.utm_source == "tiktok"
    assert lead.ref == "PROFE123"


def test_modelos_tienen_columnas_nuevas():
    from models.perfil_proveedor import Perfil_Proveedor
    from models.servicio import Servicio
    from models.lead import Lead

    assert "perfil_publico" in Perfil_Proveedor.__table__.columns
    assert "consentimiento_marketing" in Perfil_Proveedor.__table__.columns
    assert "materias" in Servicio.__table__.columns
    assert "proveedor_id" in Lead.__table__.columns
    assert "ref" in Lead.__table__.columns
```

- [x] **Step 2: Ejecutar y verificar fallo**

Run: `python -m pytest tests/test_growth_schema.py -v`

Expected: FAIL con `ModuleNotFoundError: No module named 'schemas.lead_schema'`.

- [x] **Step 3: Implementar modelos y schemas**

En `Perfil_Proveedor` añadir, importando `text` desde `sqlalchemy` y `ARRAY` desde `sqlalchemy.dialects.postgresql`:

```python
ciudad = Column(Text, nullable=True)
zona = Column(Text, nullable=True)
materias = Column(ARRAY(Text), nullable=False, default=list, server_default=text("'{}'::text[]"))
niveles = Column(ARRAY(Text), nullable=False, default=list, server_default=text("'{}'::text[]"))
perfil_publico = Column(Boolean, nullable=False, default=False, server_default=text("false"))
consentimiento_marketing = Column(Boolean, nullable=False, default=False, server_default=text("false"))
```

En `Servicio` añadir los mismos cuatro campos de ciudad, zona, materias y niveles.

`Lead` usa `__tablename__ = "leads"`, `UUID` de PostgreSQL, `Text`, `Boolean` y `DateTime(timezone=True)`; `id` con `default=uuid.uuid4`; `consentimiento` no nulo; `ref` opcional con máximo 20; `estado` con `default="nuevo"` y `server_default=text("'nuevo'")`; `fecha_creacion` con `datetime.now(timezone.utc)`. Exportarlo en `models/__init__.py`.

Persistencia de los campos nuevos:

- `ProveedorRepository.crear_perfil` y `ProveedorService.create_or_update` añaden `ciudad`, `zona`, `materias`, `niveles`, `perfil_publico` y `consentimiento_marketing` al final de la firma, con defaults `None`, `None`, `[]`, `[]`, `False` y `False`. El router `POST /proveedor/` los pasa con argumentos nombrados para no desplazar `codigo_referido`.
- `ServicioRepository.crear` y `ServicioService.crear` añaden `ciudad`, `zona`, `materias` y `niveles` al final, con defaults `None`, `None`, `[]` y `[]`. El router `POST /servicio/` los pasa con argumentos nombrados.
- `PATCH` ya propaga los campos mediante `**datos.model_dump(exclude_none=True)`.
- Normalizar en lectura: `materias` y `niveles` se devuelven como `perfil.materias or []` y `perfil.niveles or []`.

`CrearLead` valida:

- `nombre`: 2-80 caracteres.
- `contacto`: 5-120 caracteres.
- `mensaje`: 10-1000 caracteres.
- `canal_contacto`: `Literal["whatsapp", "email"]`.
- `consentimiento`: debe ser `True`.
- Exactamente uno de `servicio_id` o `perfil_id`.
- `website`: cadena vacía por defecto, máximo 200.
- `ref`: máximo 20.
- UTM: máximo 100 caracteres cada uno.
- `pagina_origen`: máximo 500.

`ActualizarPerfilProveedor` y `CrearPerfilProveedor` aceptan `ciudad`, `zona`, `materias`, `niveles`, `perfil_publico`, `consentimiento_marketing`. `CrearServicio` y `ActualizarServicio` aceptan `ciudad`, `zona`, `materias`, `niveles`.

Añadir los campos nuevos a `PerfilProveedorOut` (`ciudad`, `zona`, `materias`, `niveles`, `perfil_publico`, `consentimiento_marketing`) para que `GET /proveedor/me` los devuelva. No añadirlos a `PerfilProveedorPublico` (el schema antiguo se sustituye por `PerfilProveedorPublicoOut` en Task 3).

Añadir `ciudad`, `zona`, `materias` y `niveles` a `ServicioBase` para que `ServicioOut` y `ServicioBusquedaOut` los incluyan. En `PerfilProveedorPublicoOut`, `materias` y `niveles` usan `Field(default_factory=list)`.

- [x] **Step 4: Crear la migración SQL**

`backend/migrations/2026-11-02_growth_foundation.sql` debe contener, dentro de `BEGIN;`/`COMMIT;`:

```sql
ALTER TABLE perfiles_proveedor
  ADD COLUMN IF NOT EXISTS ciudad text,
  ADD COLUMN IF NOT EXISTS zona text,
  ADD COLUMN IF NOT EXISTS materias text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS niveles text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS perfil_publico boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consentimiento_marketing boolean NOT NULL DEFAULT false;

ALTER TABLE servicios
  ADD COLUMN IF NOT EXISTS ciudad text,
  ADD COLUMN IF NOT EXISTS zona text,
  ADD COLUMN IF NOT EXISTS materias text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS niveles text[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY,
  servicio_id uuid REFERENCES servicios(id),
  perfil_id uuid REFERENCES perfiles_proveedor(id),
  proveedor_id uuid NOT NULL REFERENCES perfiles_proveedor(id),
  nombre text NOT NULL,
  contacto text NOT NULL,
  canal_contacto text NOT NULL,
  mensaje text NOT NULL,
  consentimiento boolean NOT NULL,
  ref text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  pagina_origen text,
  estado text NOT NULL DEFAULT 'nuevo',
  fecha_creacion timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_proveedor_fecha
  ON leads (proveedor_id, fecha_creacion DESC);
```

- [x] **Step 5: Ejecutar tests**

Run: `python -m pytest tests/test_growth_schema.py -v`

Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add backend/models/lead.py backend/models/perfil_proveedor.py backend/models/servicio.py backend/models/__init__.py backend/schemas/lead_schema.py backend/schemas/proveedor_schema.py backend/schemas/servicio_schema.py backend/repositories/proveedor_repository.py backend/repositories/servicio_repository.py backend/services/proveedor_service.py backend/services/servicio_service.py backend/routers/proveedores.py backend/routers/servicios.py backend/migrations/2026-11-02_growth_foundation.sql backend/tests/test_growth_schema.py
git commit -m "feat(backend): add growth fields and lead model"
```

---

### Task 2: Catálogo público sin coordenadas y resumen real

**Files:**
- Modify: `backend/repositories/servicio_repository.py`
- Modify: `backend/services/servicio_service.py`
- Modify: `backend/routers/servicios.py`
- Modify: `backend/schemas/servicio_schema.py`
- Test: `backend/tests/test_servicio_publico.py`
- Test: `backend/tests/integration/test_busqueda_proximidad.py`

**Interfaces:**
- Consumes: columnas de Task 1.
- Produces:
  - `ServicioRepository.buscar_por_proximidad(lat: float | None, lng: float | None, radio_km: float, categoria_id=None, texto=None, ciudad=None, usuario_id=None, limit=20, offset=0) -> list[dict]`.
  - `ServicioRepository.resumen() -> dict`.
  - `ServicioService.buscar(lat, lng, radio_km, categoria_id=None, texto=None, ciudad=None, usuario_id=None, limit=20, offset=0) -> tuple[list[dict], bool]`.
  - `ServicioService.resumen() -> dict`.
  - `GET /servicio/` acepta `lat` y `lng` opcionales.
  - `GET /servicio/resumen` devuelve `ResumenPublicoOut`.

- [x] **Step 1: Escribir tests unitarios**

```python
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
```

- [x] **Step 2: Ejecutar y verificar fallo**

Run: `python -m pytest tests/test_servicio_publico.py -v`

Expected: FAIL porque `buscar` no acepta `ciudad` o `resumen` no existe.

- [x] **Step 3: Implementar el repositorio**

Reglas de `buscar_por_proximidad`:

- Filtrar con `Servicio.activo.isnot(False)`.
- Si `lat` y `lng` existen, aplicar `ST_DWithin` y ordenar por `ST_Distance`; devolver `distancia_km`.
- Si no existen, no aplicar filtro geoespacial; devolver `distancia_km=None` y ordenar por `Servicio.fecha_creacion.desc()`.
- Si solo llega una coordenada, el router responde `422` con `detail="lat y lng deben enviarse juntos"`.
- `texto` busca en `Servicio.titulo` y `Servicio.descripcion` con `ilike`.
- `ciudad` busca en `coalesce(Servicio.ciudad, case when Perfil_Proveedor.perfil_publico then Perfil_Proveedor.ciudad end, case when Perfil_Proveedor.perfil_publico then Usuario.ciudad end)` con `ilike`. No usar ciudad del perfil si `perfil_publico` es `false`.
- `listar_para_sitemap` usa `Servicio.activo.isnot(False)`.
- `ServicioService.buscar` llama al repositorio con argumentos nombrados.

`ServicioRepository.resumen()` ejecuta una consulta agregada con `select_from(Servicio)` y `where(Servicio.activo.isnot(False))`:

```python
select(
    func.count(Servicio.id).label("servicios_activos"),
    func.count(func.distinct(Servicio.proveedor_id)).label("profesores_activos"),
).select_from(Servicio).where(Servicio.activo.isnot(False))
```

`resenas` se cuenta en una consulta separada: `select(func.count(Valoracion.id))`.

- [x] **Step 4: Implementar router y schema**

`ResumenPublicoOut` tiene `servicios_activos: int`, `profesores_activos: int`, `resenas: int`.

Declarar `GET /servicio/resumen` antes de `GET /servicio/{servicio_id}`. El router de búsqueda usa `lat: Optional[float] = Query(None)`, `lng: Optional[float] = Query(None)` y `radio_km: float = Query(50.0, gt=0, le=200)`. Si llega solo una coordenada, responder `422`. Llamar `service.buscar(...)` con argumentos nombrados para no desplazar `usuario_id` a `ciudad`.

- [x] **Step 5: Añadir test de integración**

En `backend/tests/integration/test_busqueda_proximidad.py`:

```python
def test_busqueda_sin_coordenadas_devuelve_todos_los_activos(seed_data):
    from repositories.servicio_repository import ServicioRepository

    resultados = ServicioRepository().buscar_por_proximidad(None, None, 50)
    ids = [str(r["id"]) for r in resultados]
    assert str(seed_data["s_madrid_centro_id"]) in ids
    assert str(seed_data["s_madrid_periferia_id"]) in ids
    assert str(seed_data["s_barcelona_id"]) in ids
    assert all(r["distancia_km"] is None for r in resultados)
```

- [x] **Step 6: Ejecutar tests unitarios y de integración**

Run: `python -m pytest tests/test_servicio_publico.py -v`

Expected: PASS.

Run: `docker compose -f docker-compose.test.yml up -d`

Run: `$env:TEST_DATABASE_URL="postgresql://test:test@localhost:5433/serviclick_test"; python -m pytest tests/integration/ -m integration -v`

Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add backend/repositories/servicio_repository.py backend/services/servicio_service.py backend/routers/servicios.py backend/schemas/servicio_schema.py backend/tests/test_servicio_publico.py backend/tests/integration/test_busqueda_proximidad.py
git commit -m "feat(backend): expose public catalog and summary"
```

---

### Task 3: Perfil público con consentimiento y servicio anonimizado

**Files:**
- Modify: `backend/repositories/proveedor_repository.py`
- Modify: `backend/repositories/valoracion_repository.py`
- Modify: `backend/repositories/servicio_repository.py`
- Modify: `backend/services/proveedor_service.py`
- Modify: `backend/schemas/proveedor_schema.py`
- Modify: `backend/schemas/servicio_schema.py`
- Modify: `backend/routers/proveedores.py`
- Test: `backend/tests/test_perfil_publico.py`

**Interfaces:**
- Consumes: Task 1 y Task 2.
- Produces:
  - `ProveedorService.obtener_perfil_publico(perfil_id: UUID) -> dict | None`.
  - `ProveedorService.listar_para_sitemap() -> list[dict]`.
  - `GET /proveedor/{perfil_id}` cambia a `PerfilProveedorPublicoOut`; no se añade otra ruta pública.
  - `GET /proveedor/sitemap`.
  - `ServicioBusquedaOut.proveedor_perfil_publico: bool` y `proveedor_ciudad: str | None`.

- [x] **Step 1: Escribir tests de privacidad**

```python
from unittest.mock import MagicMock
from uuid import uuid4


def _make_service():
    from services.proveedor_service import ProveedorService
    svc = ProveedorService.__new__(ProveedorService)
    svc.proveedor_repository = MagicMock()
    svc.servicio_repository = MagicMock()
    svc.valoracion_repository = MagicMock()
    return svc


def _perfil(publico: bool):
    perfil = MagicMock()
    perfil.id = uuid4()
    perfil.usuario_id = uuid4()
    perfil.descripcion = "Profesora de matemáticas"
    perfil.experiencia_años = 5
    perfil.radio_km_disponible = 20
    perfil.valoracion_media = 0
    perfil.num_valoraciones = 0
    perfil.verificado = False
    perfil.dias_disponibles = "1,3"
    perfil.hora_inicio = "17:00"
    perfil.hora_fin = "20:00"
    perfil.ciudad = "Talavera de la Reina"
    perfil.zona = "Centro"
    perfil.materias = ["matemáticas"]
    perfil.niveles = ["ESO"]
    perfil.perfil_publico = publico
    return perfil


def test_perfil_no_publico_anonimiza_nombre_foto_y_ciudad():
    svc = _make_service()
    svc.proveedor_repository.get_publico.return_value = {
        "perfil": _perfil(False),
        "usuario_nombre": "Ana García",
        "usuario_avatar": "https://img/ana.jpg",
        "fecha_creacion": None,
    }
    svc.servicio_repository.listar_por_proveedor_publico.return_value = []
    svc.valoracion_repository.listar_publicas_por_destinatario.return_value = []

    resultado = svc.obtener_perfil_publico(uuid4())

    assert resultado["nombre_publico"] == "Profesional de Habilo"
    assert resultado["avatar_publico"] is None
    assert resultado["ciudad"] is None
    assert resultado["perfil_publico"] is False
    assert resultado["servicios"] == []
    assert resultado["resenas"] == []
    assert "usuario_id" not in resultado
    assert "email" not in resultado
    assert "telefono" not in resultado


def test_perfil_publico_muestra_nombre_real():
    svc = _make_service()
    svc.proveedor_repository.get_publico.return_value = {
        "perfil": _perfil(True),
        "usuario_nombre": "Ana García",
        "usuario_avatar": "https://img/ana.jpg",
        "fecha_creacion": None,
    }
    svc.servicio_repository.listar_por_proveedor_publico.return_value = []
    svc.valoracion_repository.listar_publicas_por_destinatario.return_value = []

    resultado = svc.obtener_perfil_publico(uuid4())

    assert resultado["nombre_publico"] == "Ana García"
    assert resultado["avatar_publico"] == "https://img/ana.jpg"
    assert resultado["ciudad"] == "Talavera de la Reina"
```

- [x] **Step 2: Ejecutar y verificar fallo**

Run: `python -m pytest tests/test_perfil_publico.py -v`

Expected: FAIL porque `obtener_perfil_publico` no existe.

- [x] **Step 3: Implementar consultas**

`ProveedorRepository.get_publico(perfil_id)` devuelve un diccionario con `perfil`, `usuario_nombre`, `usuario_avatar`, `fecha_creacion`. No incluye email ni teléfono.

`ServicioRepository.listar_por_proveedor_publico(proveedor_id)` devuelve servicios con `activo.isnot(False)`, ordenados por `fecha_creacion.desc()`, con `categoria_nombre`.

`ValoracionRepository.listar_publicas_por_destinatario(destinatario_id, limit=10)` devuelve `puntuacion`, `comentario`, `fecha` y `autor_nombre` (nombre del autor). `destinatario_id` es `perfil.usuario_id`, no el id del perfil. El servicio reduce `autor_nombre` al primer nombre.

- [x] **Step 4: Implementar el schema y el servicio**

`PerfilProveedorPublicoOut` debe contener solo:

```text
id, nombre_publico, avatar_publico, descripcion, experiencia_años,
radio_km_disponible, ciudad, zona, materias, niveles,
valoracion_media, num_valoraciones, verificado,
dias_disponibles, hora_inicio, hora_fin, perfil_publico,
servicios, resenas
```

Sin `usuario_id`, email ni teléfono.

Define también `ServicioResumenOut` (`id`, `titulo`, `descripcion`, `precio`, `tipo_precio`, `imagen_url`, `categoria_nombre`) y `ResenaPublicaOut` (`puntuacion`, `comentario`, `fecha`, `autor_nombre`) para tipar `servicios` y `resenas`. En `PerfilProveedorPublicoOut`, `materias` y `niveles` usan `Field(default_factory=list)`.

En `ProveedorService.__init__`, añadir `self.servicio_repository = ServicioRepository()` y `self.valoracion_repository = ValoracionRepository()`; importa ambas clases en `services/proveedor_service.py`.

`obtener_perfil_publico` no usa `_perfil_publico_cache`. En `actualizar_perfil`, invalidar la entrada de `_perfil_publico_cache` del perfil actualizado (`_perfil_publico_cache.pop(str(perfil_id), None)`) para que un cambio de `perfil_publico` se aplique de inmediato.

Regla de anonimización:

- Si `perfil_publico is False`: `nombre_publico="Profesional de Habilo"`, `avatar_publico=None`, `descripcion=None`, `ciudad=None`, `zona=None`, `servicios=[]`, `resenas=[]`.
- Si `perfil_publico is True`: nombre, avatar, descripción, ciudad, servicios y reseñas reales.
- Siempre normalizar `materias` y `niveles` con `perfil.materias or []` y `perfil.niveles or []`.

`ServicioRepository.buscar_por_proximidad` y `obtener_detalle_publico` añaden `Perfil_Proveedor.perfil_publico` y `Perfil_Proveedor.ciudad` al `select`. Si es `False`, devuelven `proveedor_nombre="Profesional de Habilo"`, `proveedor_avatar=None`, `proveedor_ciudad=None` y `proveedor_perfil_publico=False`. `obtener_detalle_publico` filtra `Servicio.activo.isnot(False)`.

- [x] **Step 5: Implementar rutas**

En `backend/routers/proveedores.py`, declarar en este orden:

```text
GET /proveedor/sitemap
GET /proveedor/me
GET /proveedor/documento
GET /proveedor/{perfil_id}
```

La ruta `GET /proveedor/{perfil_id}` cambia su `response_model` a `PerfilProveedorPublicoOut` y usa `obtener_perfil_publico`. `/sitemap` solo devuelve perfiles con `perfil_publico=True`.

- [x] **Step 6: Ejecutar tests**

Run: `python -m pytest tests/test_perfil_publico.py -v`

Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add backend/repositories/proveedor_repository.py backend/repositories/valoracion_repository.py backend/repositories/servicio_repository.py backend/services/proveedor_service.py backend/schemas/proveedor_schema.py backend/schemas/servicio_schema.py backend/routers/proveedores.py backend/tests/test_perfil_publico.py
git commit -m "feat(backend): add consent-aware public provider profiles"
```

---

### Task 4: Captura de leads sin cuenta

**Files:**
- Create: `backend/repositories/lead_repository.py`
- Create: `backend/services/lead_service.py`
- Create: `backend/routers/leads.py`
- Modify: `backend/services/notificacion_email_service.py`
- Modify: `backend/main.py`
- Test: `backend/tests/test_lead_service.py`
- Test: `backend/tests/test_lead_router.py`

**Interfaces:**
- Consumes: `Lead`, `CrearLead`, `ServicioRepository`, `ProveedorRepository`, `UserRepository`.
- Produces:
  - `LeadService.crear(datos: CrearLead, pagina_origen: str | None = None) -> Lead`.
  - `NotificacionEmailService.enviar_a_email(destinatario: str, asunto: str, cuerpo_html: str) -> None`.
  - `POST /leads/` con rate limit `5/hour`.

- [x] **Step 1: Escribir tests del servicio**

```python
from unittest.mock import MagicMock, patch
from uuid import uuid4
from fastapi import HTTPException
import pytest


def _make_service():
    from services.lead_service import LeadService
    svc = LeadService.__new__(LeadService)
    svc.lead_repository = MagicMock()
    svc.servicio_repository = MagicMock()
    svc.proveedor_repository = MagicMock()
    svc.user_repository = MagicMock()
    svc.notificacion_email_service = MagicMock()
    return svc


def _datos(servicio_id=None, perfil_id=None):
    from schemas.lead_schema import CrearLead
    return CrearLead(
        servicio_id=servicio_id, perfil_id=perfil_id,
        nombre="Ana", contacto="+34600111222", canal_contacto="whatsapp",
        mensaje="Necesito un profesor de matemáticas", consentimiento=True,
        utm_source="tiktok",
    )


def test_lead_de_servicio_activo_guarda_y_notifica():
    svc = _make_service()
    servicio = MagicMock()
    servicio.proveedor_id = uuid4()
    servicio.activo = True
    servicio.titulo = "Clases de matemáticas"
    svc.servicio_repository.get_by_id.return_value = servicio
    perfil = MagicMock()
    perfil.usuario_id = uuid4()
    svc.proveedor_repository.get_by_id.return_value = perfil
    usuario = MagicMock()
    usuario.email = "profe@example.com"
    svc.user_repository.get_by_id.return_value = usuario
    svc.lead_repository.crear.return_value = MagicMock(id=uuid4())

    svc.crear(_datos(servicio_id=uuid4()))

    svc.lead_repository.crear.assert_called_once()
    svc.notificacion_email_service.enviar_a_email.assert_called_once()


def test_lead_de_servicio_inactivo_devuelve_400():
    svc = _make_service()
    servicio = MagicMock()
    servicio.activo = False
    svc.servicio_repository.get_by_id.return_value = servicio

    with pytest.raises(HTTPException) as exc:
        svc.crear(_datos(servicio_id=uuid4()))

    assert exc.value.status_code == 400
```

- [x] **Step 2: Escribir test del honeypot**

```python
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
```

- [x] **Step 3: Ejecutar y verificar fallo**

Run: `python -m pytest tests/test_lead_service.py tests/test_lead_router.py -v`

Expected: FAIL con `ModuleNotFoundError`.

- [x] **Step 4: Implementar persistencia y notificación**

`LeadRepository.crear(datos: dict) -> Lead` abre sesión, elimina `website` del diccionario, crea, hace commit y devuelve el lead.

`LeadService.__init__` instancia `LeadRepository()`, `ServicioRepository()`, `ProveedorRepository()`, `UserRepository()` y `NotificacionEmailService()`.

`LeadService.crear`:

- Si llega `servicio_id`, carga el servicio; si no existe, `404`; si `servicio.activo is False`, `400`; `proveedor_id = servicio.proveedor_id`.
- Si llega `perfil_id`, carga el perfil; si no existe, `404`; `proveedor_id = perfil.id`.
- Guarda `pagina_origen` del payload o el argumento.
- Persiste `ref` si viene.
- Resuelve el usuario del perfil y envía email de aviso.
- No guarda IP.
- No crea usuario ni solicitud.

Email:

- Asunto: `Nuevo contacto para {titulo}` o `Nuevo contacto en Habilo`.
- HTML con nombre, contacto, canal, mensaje, UTM, `ref` y enlace de respuesta.
- WhatsApp: `https://wa.me/{digitos}`.
- Email: `mailto:{contacto}`.
- Escapar HTML con `html.escape`.

`NotificacionEmailService.enviar_a_email` usa `ejecutar_en_segundo_plano` y `_enviar_resend`, con `from=Config.EMAIL_FROM`.

- [x] **Step 5: Implementar router**

`POST /leads/` con `status_code=201`, `@limiter.limit("5/hour")`.

Si `datos.website.strip()` no está vacío: devolver `{"ok": True}` sin llamar al servicio.

Si no: `LeadService().crear(datos, pagina_origen=datos.pagina_origen)` y devolver `{"ok": True}`.

Incluir `leads_router` en `backend/main.py`.

- [x] **Step 6: Ejecutar tests**

Run: `python -m pytest tests/test_lead_service.py tests/test_lead_router.py -v`

Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add backend/repositories/lead_repository.py backend/services/lead_service.py backend/routers/leads.py backend/services/notificacion_email_service.py backend/main.py backend/tests/test_lead_service.py backend/tests/test_lead_router.py
git commit -m "feat(backend): capture anonymous leads"
```

---

### Task 5: Mover login a `/login` y corregir redirecciones

**Files:**
- Create: `frontend/app/login/page.tsx`
- Create: `frontend/app/login/login-client.tsx`
- Modify: `frontend/app/page.tsx`
- Modify: `frontend/components/auth-required-dialog.tsx`
- Modify: `frontend/components/navbar.tsx`
- Modify: `frontend/app/dashboard/page.tsx`
- Modify: `frontend/app/chats/page.tsx`
- Modify: `frontend/app/favoritos/page.tsx`
- Modify: `frontend/app/profile/page.tsx`
- Modify: `frontend/app/select-role/page.tsx`
- Modify: `frontend/app/admin/layout.tsx`
- Modify: `backend/routers/auth.py`
- Test: `backend/tests/test_auth_redirect.py`
- Test: `frontend/e2e/login_route.spec.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `/login` con el login OAuth actual.
  - `/` redirige temporalmente a `/home` o a `/login?token=` si hay token.
  - Callback OAuth redirige a `{FRONTEND_URL}/login?token=...`.
  - Navbar anónimo muestra “Iniciar sesión” y “Soy profesor”.

- [x] **Step 1: Escribir test del redirect OAuth**

```python
def test_url_redirect_token_usa_login():
    from routers.auth import _url_redirect_token
    assert _url_redirect_token("abc123") == "http://localhost:3000/login?token=abc123"
```

- [x] **Step 2: Escribir test E2E de rutas**

```ts
import { test, expect } from "@playwright/test"

test("login vive en /login", async ({ page }) => {
  await page.goto("/login")
  await expect(page.getByRole("heading", { name: /bienvenido de nuevo/i })).toBeVisible()
})

test("/ con token redirige a /login", async ({ page }) => {
  await page.goto("/?token=abc123")
  await expect(page).toHaveURL(/\/login\?token=abc123/)
})

test("home anónimo muestra iniciar sesión", async ({ page }) => {
  await page.goto("/home")
  await expect(page.getByRole("link", { name: "Iniciar sesión" })).toBeVisible()
})
```

- [x] **Step 3: Ejecutar y verificar fallo**

Run: `python -m pytest tests/test_auth_redirect.py -v`

Expected: FAIL porque `_url_redirect_token` no existe.

Run: `npx playwright test e2e/login_route.spec.ts --project=chromium`

Expected: FAIL porque `/login` no existe.

- [x] **Step 4: Mover el login**

Copiar el contenido actual de `frontend/app/page.tsx` a `frontend/app/login/login-client.tsx` con el mismo `LoginPageInner` y `Suspense`.

`frontend/app/login/page.tsx` es un Server Component con:

```tsx
export const metadata = {
  title: "Iniciar sesión | Habilo",
  robots: { index: false, follow: true },
}

export default function LoginPage() {
  return <LoginPageClient />
}
```

Mantener el parámetro `token`, `ref` y la redirección por rol.

- [x] **Step 5: Redirección temporal de `/`**

`frontend/app/page.tsx`:

```tsx
import { redirect } from "next/navigation"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  redirect(token ? `/login?token=${encodeURIComponent(token)}` : "/home")
}
```

- [x] **Step 6: Corregir backend y frontend**

En `backend/routers/auth.py`, añadir:

```python
def _url_redirect_token(token: str) -> str:
    return f"{Config.FRONTEND_URL.rstrip('/')}/login?token={token}"
```

Usarla en los dos callbacks que hoy hacen `RedirectResponse(f"{Config.FRONTEND_URL}?token={jwt_token}")`.

Cambiar `router.replace("/")` por `router.replace("/login")` en dashboard, chats, favoritos, profile, select-role y admin layout. Cambiar el botón de `auth-required-dialog.tsx` a `/login`.

En `login-client.tsx`, capturar `signup_started` con `{ provider: "google" | "facebook" }` al pulsar cada botón OAuth. PostHog lo descarta hasta que haya consentimiento.

En `navbar.tsx`:

- Si `!isAuthenticated`, mostrar enlaces “Iniciar sesión” y “Soy profesor” a `/login`; ocultar badge de rol, mensajes, campana y avatar.
- El logo enlaza a `/home` para anónimos.
- `handleLogout` sigue llevando a `/`.

- [x] **Step 7: Ejecutar tests**

Run: `python -m pytest tests/test_auth_redirect.py -v`

Expected: PASS.

Run: `npx playwright test e2e/login_route.spec.ts --project=chromium`

Expected: PASS.

- [x] **Step 8: Commit**

```bash
git add frontend/app/login/page.tsx frontend/app/login/login-client.tsx frontend/app/page.tsx frontend/components/auth-required-dialog.tsx frontend/components/navbar.tsx frontend/app/dashboard/page.tsx frontend/app/chats/page.tsx frontend/app/favoritos/page.tsx frontend/app/profile/page.tsx frontend/app/select-role/page.tsx frontend/app/admin/layout.tsx backend/routers/auth.py backend/tests/test_auth_redirect.py frontend/e2e/login_route.spec.ts
git commit -m "feat(auth): move login to /login"
```

---

### Task 6: Landing pública con servicios reales

**Files:**
- Create: `frontend/lib/server-api.ts`
- Create: `frontend/lib/service-mapper.ts`
- Create: `frontend/lib/utm.ts`
- Create: `frontend/components/landing/landing-search.tsx`
- Create: `frontend/components/landing/landing-teacher-cta.tsx`
- Create: `frontend/components/landing/landing-tracker.tsx`
- Modify: `frontend/app/page.tsx`
- Modify: `frontend/app/layout.tsx`
- Modify: `frontend/app/manifest.ts`
- Test: `frontend/e2e/landing.spec.ts`

**Interfaces:**
- Consumes: `GET /servicio/`, `GET /servicio/resumen`, `GET /categorias/`.
- Produces:
  - `fetchPublic<T>(path: string, revalidate = 300): Promise<T | null>`.
  - `fetchPublicResponse<T>(path: string, revalidate = 300): Promise<{ status: number; data: T | null }>`.
  - `storeUtmFromUrl(search: string): void` y `getUtm(): UtmData`.
  - Landing en `/` con H1 exacto, buscador y hasta 6 servicios reales.
  - `mapServicioParaTarjeta(s: ServicioBackend)`.

- [x] **Step 0: Desactivar captura no esencial antes de instrumentar**

Antes de añadir cualquier evento, aplicar el Step 3 de Task 12:

- `opt_out_capturing_by_default: true`, `cookieless_mode: "on_reject"`, `person_profiles: "identified_only"`, `respect_dnt: true`, `disable_session_recording: true`.
- Eliminar `Sentry.replayIntegration()` y las opciones de replay.

Sin este paso, los eventos de landing y el `identify` de usuarios autenticados podrían ejecutarse antes del consentimiento.

- [x] **Step 1: Escribir test E2E**

```ts
import { test, expect } from "@playwright/test"

test("la portada es pública y muestra la propuesta de valor", async ({ page }) => {
  await page.goto("/")
  await expect(
    page.getByRole("heading", {
      name: "Clases particulares en Talavera de la Reina, con profesores reales",
    })
  ).toBeVisible()
  await expect(page.getByRole("button", { name: "Buscar profesor" })).toBeVisible()
  await expect(page.getByText("Bienvenido de nuevo")).toHaveCount(0)
})

test("el token en portada se manda a /login", async ({ page }) => {
  await page.goto("/?token=abc123")
  await expect(page).toHaveURL(/\/login\?token=abc123/)
})

test("el manifest usa los iconos existentes", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest")
  const body = await response.text()
  expect(body).not.toContain("/icons/")
})
```

- [x] **Step 2: Ejecutar y verificar fallo**

Run: `npx playwright test e2e/landing.spec.ts --project=chromium`

Expected: FAIL porque `/` redirige a `/home`.

- [x] **Step 3: Implementar server-api y mapper**

`frontend/lib/server-api.ts`:

```ts
const API_URL =
  process.env.API_URL_INTERNAL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000"

export async function fetchPublic<T>(path: string, revalidate = 300): Promise<T | null> {
  const { status, data } = await fetchPublicResponse<T>(path, revalidate)
  return status >= 200 && status < 300 ? data : null
}

export async function fetchPublicResponse<T>(
  path: string,
  revalidate = 300
): Promise<{ status: number; data: T | null }> {
  try {
    const response = await fetch(`${API_URL}${path}`, { next: { revalidate } })
    const data = response.ok ? ((await response.json()) as T) : null
    return { status: response.status, data }
  } catch {
    return { status: 0, data: null }
  }
}
```

`service-mapper.ts` mueve la función `mapServicioParaTarjeta` que hoy vive en `app/home/page.tsx`, sin cambiar el formato de la tarjeta.

`frontend/lib/utm.ts`:

```ts
export interface UtmData {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  ref?: string
}

const UTM_KEY = "habilo_utm_v1"
const CAMPOS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref"] as const

export function storeUtmFromUrl(search: string) {
  const params = new URLSearchParams(search)
  const datos: UtmData = {}
  for (const campo of CAMPOS) {
    const valor = params.get(campo)
    if (valor) datos[campo] = valor.slice(0, 100)
  }
  if (Object.keys(datos).length > 0) {
    sessionStorage.setItem(UTM_KEY, JSON.stringify(datos))
  }
}

export function getUtm(): UtmData {
  try {
    return JSON.parse(sessionStorage.getItem(UTM_KEY) || "{}") as UtmData
  } catch {
    return {}
  }
}
```

- [x] **Step 4: Implementar landing**

`app/page.tsx` es Server Component:

- `export const revalidate = 300`.
- `searchParams: Promise<{ token?: string }>`; si hay token, `redirect('/login?token=...')`.
- Fetch en paralelo: `/servicio/resumen`, `/servicio/?limit=6`, `/categorias/`.
- Metadata: título `Clases particulares en Talavera de la Reina | Habilo`, descripción honesta, canonical `/`.

Secciones:

1. Navbar.
2. Hero con H1 exacto, párrafo y `<LandingSearch />`.
3. Prueba social honesta: contadores reales de `resumen`; si `servicios_activos === 0`, mostrar “Estamos incorporando los primeros profesores” y no inventar cifras.
4. Grid `#servicios` con hasta 6 `ServiceCard`; si está vacío, estado vacío con CTA “Soy profesor”.
5. “Cómo funciona” en 3 pasos.
6. CTA de profesor a `/login` con `<LandingTeacherCta />`.
7. Footer con enlaces legales.

No usar “miles de profesionales” ni “verificados”.

`LandingSearch` es cliente: captura `landing_cta_clicked` con `{ cta: "search" }` y navega a `/home?q=...`.

`LandingTeacherCta` es cliente: captura `landing_cta_clicked` con `{ cta: "teacher" }` y navega a `/login`.

`LandingTracker` es cliente: llama `storeUtmFromUrl(window.location.search)` y captura `referral_visit` si hay `ref`; el evento incluye `{ code }`.

- [x] **Step 5: Corregir manifest y metadata global**

En `manifest.ts`, cambiar las rutas de iconos a `/icon-192.png`, `/icon-512.png` y `/icon-maskable-512.png`.

En `layout.tsx`, actualizar `metadata.description` y `keywords` para clases particulares en Talavera. Eliminar `alternates: { canonical: '/' }` del metadata global: cada página define su canonical. Añadir `<LandingTracker />` dentro del árbol de providers.

- [x] **Step 6: Ejecutar verificación**

Run: `npx tsc --noEmit`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

Run: `npx playwright test e2e/landing.spec.ts --project=chromium`

Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add frontend/lib/server-api.ts frontend/lib/service-mapper.ts frontend/lib/utm.ts frontend/components/landing/landing-search.tsx frontend/components/landing/landing-teacher-cta.tsx frontend/components/landing/landing-tracker.tsx frontend/app/page.tsx frontend/app/layout.tsx frontend/app/manifest.ts frontend/e2e/landing.spec.ts
git commit -m "feat(frontend): add public landing page"
```

---

### Task 7: SSR del catálogo y búsqueda por URL

**Files:**
- Create: `frontend/app/home/home-client.tsx`
- Modify: `frontend/app/home/page.tsx`
- Modify: `frontend/hooks/use-paginacion.ts`
- Modify: `frontend/lib/api.ts`
- Test: `frontend/e2e/home_ssr.spec.ts`

**Interfaces:**
- Consumes: `GET /servicio/` con `lat`/`lng` opcionales y `ciudad`; `fetchPublic`; `mapServicioParaTarjeta`.
- Produces:
  - `usePaginacion<T>(fetcher, limit = 20, initial?: { items: T[]; hasMore: boolean })`.
  - `buscarServicios` acepta `lat?`, `lng?`, `radio_km?`, `ciudad?`.
  - `/home?q=...&ciudad=...` renderiza datos iniciales en servidor.

- [x] **Step 1: Escribir test E2E**

```ts
import { test, expect } from "@playwright/test"

test("el HTML inicial de /home contiene servicios", async ({ request }) => {
  const api = await request.get("http://localhost:8000/servicio/?limit=1")
  const data = await api.json()
  test.skip(data.items.length === 0, "Backend sin servicios de prueba")

  const html = await (await request.get("/home")).text()
  expect(html).toContain(data.items[0].titulo)
  expect(html).not.toContain("Necesitamos tu ubicación")
})

test("la búsqueda por URL llega al cliente", async ({ page }) => {
  await page.goto("/home?q=matemáticas")
  await expect(page.getByPlaceholder(/busca un servicio/i)).toHaveValue("matemáticas")
})
```

- [x] **Step 2: Ejecutar y verificar fallo**

Run: `npx playwright test e2e/home_ssr.spec.ts --project=chromium`

Expected: FAIL porque `/home` sigue siendo Client Component sin datos iniciales.

- [x] **Step 3: Ampliar tipos y hook**

En `lib/api.ts`, `buscarServicios` acepta:

```ts
lat?: number
lng?: number
radio_km?: number
ciudad?: string
```

Solo añade `lat`, `lng` y `radio_km` a `URLSearchParams` si `lat` y `lng` existen. Añade `ciudad` siempre que venga.

`claveBusqueda` debe aceptar `lat?: number`, `lng?: number` y `ciudad?: string`; usa `lat?.toFixed(4) ?? null` y `lng?.toFixed(4) ?? null`, e incluye `ciudad` en la clave.

`usePaginacion` acepta `initial` y arranca con `initial.items`, `offset = initial.items.length`, `hasMore = initial.hasMore`.

En `HomeClient`:

- Inicializar `categorias` con `initialCategorias` y no llamar a `getCategorias()` en el primer render.
- No pedir geolocalización automáticamente. Leer solo una ubicación guardada en `localStorage`; `getBrowserLocation()` se ejecuta únicamente desde “Usar mi ubicación”.
- No disparar `cargarServicios(true)` en el primer render si `coords === null`, `search === initialQuery`, `activeCategoriaId === null` y no hay `initialCiudad`: la lista ya viene del servidor. Usar un `useRef` para saltar ese primer efecto.

- [x] **Step 4: Separar servidor y cliente**

`app/home/page.tsx`:

```tsx
export const revalidate = 300
export const metadata = {
  title: "Clases particulares en Talavera de la Reina | Habilo",
  description: "Encuentra profesores de matemáticas, inglés, lengua y más en Talavera de la Reina.",
  alternates: { canonical: "/home" },
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; ciudad?: string }>
}) {
  const { q = "", ciudad = "" } = await searchParams
  const params = new URLSearchParams({ limit: "20" })
  if (q) params.set("texto", q)
  if (ciudad) params.set("ciudad", ciudad)

  const [servicios, categorias] = await Promise.all([
    fetchPublic<{ items: ServicioBackend[]; has_more: boolean }>(`/servicio/?${params}`),
    fetchPublic<Categoria[]>("/categorias/"),
  ])
  return (
    <HomeClient
      initialServicios={servicios?.items ?? []}
      initialHasMore={servicios?.has_more ?? false}
      initialCategorias={categorias ?? []}
      initialQuery={q}
      initialCiudad={ciudad}
    />
  )
}
```

`home-client.tsx` recibe esas props, conserva el estado actual de filtros y usa `usePaginacion` con `initial`.

- [x] **Step 5: Ajustar comportamiento**

- Quitar el bloque que obliga a “Necesitamos tu ubicación” antes de mostrar servicios.
- Mostrar siempre el grid; si no hay ubicación, indicar “Mostrando todos los servicios”.
- Si hay `coords`, seguir filtrando por radio de 50 km.
- Si hay `initialCiudad`, inicializar `ciudadLabel` y el filtro con ella.
- Mantener filtro de precio en cliente.
- Capturar `search_performed` con `{ query, city, category }` tras 500 ms de debounce.
- No mostrar “0 servicios encontrados” en el HTML inicial si el servidor trajo servicios.
- Cambiar el estado vacío a “No encontramos servicios con los filtros actuales.”

- [x] **Step 6: Ejecutar verificación**

Run: `npx tsc --noEmit`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

Run: `npx playwright test e2e/home_ssr.spec.ts --project=chromium`

Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add frontend/app/home/page.tsx frontend/app/home/home-client.tsx frontend/hooks/use-paginacion.ts frontend/lib/api.ts frontend/e2e/home_ssr.spec.ts
git commit -m "feat(frontend): server-render home catalog"
```

---

### Task 8: Contacto anónimo en la página de servicio

**Files:**
- Create: `frontend/components/lead-contact-dialog.tsx`
- Modify: `frontend/lib/api.ts`
- Modify: `frontend/app/home/service/[id]/service-detail-client.tsx`
- Test: `frontend/e2e/service_contact.spec.ts`

**Interfaces:**
- Consumes: `POST /leads/`, `getUtm()` de `lib/utm.ts`.
- Produces:
  - `CrearLeadInput`, `crearLead`, `PerfilPublicoCompleto`, `ResenaPublica`.
  - `LeadContactDialog({ open, onOpenChange, servicioId?, perfilId?, profesionalNombre })`.
  - CTA anónimo de servicio abre el diálogo sin login.

- [x] **Step 1: Implementar tipos y llamada API**

En `lib/api.ts`:

```ts
export interface CrearLeadInput {
  servicio_id?: string
  perfil_id?: string
  nombre: string
  contacto: string
  canal_contacto: "whatsapp" | "email"
  mensaje: string
  consentimiento: boolean
  website?: string
  ref?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  pagina_origen?: string
}

export function crearLead(datos: CrearLeadInput) {
  return apiFetch<{ ok: true }>("/leads/", {
    method: "POST",
    body: JSON.stringify(datos),
  })
}

export interface ResenaPublica {
  puntuacion: number
  comentario: string | null
  fecha: string | null
  autor_nombre: string
}

export interface ServicioResumen {
  id: string
  titulo: string
  descripcion: string | null
  precio: string
  tipo_precio: string
  imagen_url: string | null
  categoria_nombre: string | null
}

export interface PerfilPublicoCompleto {
  id: string
  nombre_publico: string
  avatar_publico: string | null
  descripcion: string | null
  experiencia_años: number | null
  radio_km_disponible: number
  ciudad: string | null
  zona: string | null
  materias: string[]
  niveles: string[]
  valoracion_media: string | null
  num_valoraciones: number
  verificado: boolean | null
  dias_disponibles: string | null
  hora_inicio: string | null
  hora_fin: string | null
  perfil_publico: boolean
  servicios: ServicioResumen[]
  resenas: ResenaPublica[]
}
```

- [x] **Step 2: Implementar diálogo**

`LeadContactDialog` usa los componentes `Dialog`, `Input`, `Label`, `Textarea`, `Checkbox` y `Button` existentes.

- Título: “Contactar con {profesionalNombre}”.
- Texto: “Cuéntale qué necesitas. No hace falta crear cuenta.”
- Campos con `Label htmlFor` exactos: “Nombre”, “WhatsApp o email”, “Mensaje”.
- Canal (WhatsApp/email) como selector; por defecto `whatsapp`; botón “Enviar mensaje”.
- Honeypot `website` oculto con `tabIndex={-1}` y `autoComplete="off"`.
- Checkbox de consentimiento empieza desmarcado, con etiqueta exacta “Acepto que el profesional reciba mis datos”.
- Mensajes de validación exactos:
  - “Escribe tu nombre.”
  - “Indica un WhatsApp o email válido.”
  - “Cuéntanos qué necesitas (mínimo 10 caracteres).”
  - “Debes aceptar que el profesional reciba tus datos.”
- Al enviar: `crearLead({ ...datos, ...getUtm(), pagina_origen: window.location.href })`.
- Éxito: “Mensaje enviado. El profesional te contactará por WhatsApp o email.”
- Error genérico: “No se pudo enviar. Inténtalo de nuevo.”
- Capturar `lead_submitted` con `{ service_id, perfil_id, channel }`.

- [x] **Step 3: Escribir test E2E**

```ts
import { test, expect } from "@playwright/test"

const servicioId = process.env.TEST_SERVICIO_ID

test("un visitante anónimo contacta sin crear cuenta", async ({ page }) => {
  test.skip(!servicioId, "TEST_SERVICIO_ID no configurado")

  await page.route("**/leads/", (route) =>
    route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true }) })
  )
  await page.goto(`/home/service/${servicioId}`)
  await page.getByRole("button", { name: /contactar profesional/i }).click()
  await page.getByLabel("Nombre").fill("Ana")
  await page.getByLabel("WhatsApp o email").fill("+34600111222")
  await page.getByLabel("Mensaje").fill("Necesito clases de matemáticas para ESO")
  await page.getByLabel(/acepto que el profesional reciba mis datos/i).check()
  await page.getByRole("button", { name: "Enviar mensaje" }).click()
  await expect(page.getByText(/mensaje enviado/i)).toBeVisible()
})
```

- [x] **Step 4: Ejecutar y verificar fallo**

Run: `npx playwright test e2e/service_contact.spec.ts --project=chromium`

Expected: FAIL porque el CTA exige login.

- [x] **Step 5: Conectar el CTA**

En `service-detail-client.tsx`:

- Añadir estado `leadOpen`.
- En `handleContactar`, si `!isAuthenticated`, abrir `LeadContactDialog` con `servicioId={servicio.id}` y `profesionalNombre={servicio.proveedor_nombre || "Profesional"}`; si autenticado, conservar `crearSolicitud`.
- Renderizar el diálogo junto a `AuthRequiredDialog`.
- Mantener el texto del botón “Contactar profesional”.

- [x] **Step 6: Ejecutar verificación**

Run: `npx tsc --noEmit`

Expected: PASS.

Run: `npx playwright test e2e/service_contact.spec.ts --project=chromium`

Expected: PASS si `TEST_SERVICIO_ID` está configurado; SKIP si no.

- [x] **Step 7: Commit**

```bash
git add frontend/components/lead-contact-dialog.tsx frontend/lib/api.ts frontend/app/home/service/[id]/service-detail-client.tsx frontend/e2e/service_contact.spec.ts
git commit -m "feat(frontend): add anonymous contact dialog"
```

---

### Task 9: Servicio público SSR y metadatos

**Files:**
- Modify: `frontend/app/home/service/[id]/page.tsx`
- Modify: `frontend/app/home/service/[id]/service-detail-client.tsx`
- Test: `frontend/e2e/service_detail.spec.ts`

**Interfaces:**
- Consumes: `fetchPublic`, `LeadContactDialog` de Task 8.
- Produces:
  - `ServiceDetailClient({ initialServicio }: { initialServicio: ServicioBackend | null })`.
  - HTML inicial con título, descripción, precio y profesional.
  - El CTA anónimo de Task 8 se mantiene sin volver a exigir login.

- [x] **Step 1: Escribir test E2E**

```ts
import { test, expect } from "@playwright/test"

const servicioId = process.env.TEST_SERVICIO_ID

test("el servicio se renderiza en servidor y permite contactar sin cuenta", async ({ page, request }) => {
  test.skip(!servicioId, "TEST_SERVICIO_ID no configurado")

  const html = await (await request.get(`/home/service/${servicioId}`)).text()
  const detalle = await (await request.get(`http://localhost:8000/servicio/${servicioId}`)).json()
  expect(html).toContain(detalle.titulo)
  if (detalle.descripcion) {
    expect(html).toContain(detalle.descripcion.slice(0, 40))
  }

  await page.route("**/leads/", (route) =>
    route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true }) })
  )
  await page.goto(`/home/service/${servicioId}`)
  await page.getByRole("button", { name: /contactar profesional/i }).click()
  await page.getByLabel("Nombre").fill("Ana")
  await page.getByLabel("WhatsApp o email").fill("+34600111222")
  await page.getByLabel("Mensaje").fill("Necesito clases de matemáticas para ESO")
  await page.getByLabel(/acepto que el profesional reciba mis datos/i).check()
  await page.getByRole("button", { name: "Enviar mensaje" }).click()
  await expect(page.getByText(/mensaje enviado/i)).toBeVisible()
})
```

- [x] **Step 2: Ejecutar y verificar fallo**

Run: `npx playwright test e2e/service_detail.spec.ts --project=chromium`

Expected: FAIL porque el HTML inicial del servicio se renderiza en cliente.

- [x] **Step 3: Arreglar params y SSR**

En `page.tsx`, tipar `params` como `Promise<{ id: string }>` y hacer `const { id } = await params` tanto en `generateMetadata` como en el componente.

Usar `fetchPublicResponse<ServicioBackend>("/servicio/{id}")` desde `lib/server-api.ts`:

- `status === 404`: llamar `notFound()`.
- `status === 0` o `status >= 500`: renderizar la página con `initialServicio={null}` y dejar que el cliente muestre el estado de error.
- `data` válido: pasarlo como `initialServicio`.

`generateMetadata`:

- Título: `{titulo} | Habilo`.
- Descripción: `descripcion` recortada a 155 caracteres o un texto genérico honesto.
- Canonical: `/home/service/{id}`.
- Si no hay datos, `robots: { index: false, follow: true }`.

Pasar `initialServicio` a `ServiceDetailClient`.

- [x] **Step 4: Ajustar cliente**

- Inicializar `servicio` con `initialServicio` y `cargando` en `!initialServicio`.
- Si `initialServicio` existe, no volver a llamar a `getServicioDetalle` en el primer render; solo cargar la galería y el perfil.
- Tipar `getPerfilProveedorPublico` como `PerfilPublicoCompleto` y ajustar el estado `perfilProveedor`.
- Añadir `proveedor_perfil_publico?: boolean` y `proveedor_ciudad?: string | null` a `ServicioBackend` en `lib/api.ts`.
- Mantener la recarga en cliente para favoritos y galería.
- Capturar `service_viewed` una vez con `{ service_id, category, city }`.
- Enlazar el nombre del profesional a `/profesores/{proveedor_id}`.
- Mostrar `ciudad`, `materias` y `niveles` si existen.
- Botón compartir: `navigator.share` si existe; si no, abrir `https://wa.me/?text=...`; capturar `share_clicked` con `{ channel: "whatsapp" | "native", service_id }`.
- Mantener `handleContactar` de Task 8 sin cambios.

- [x] **Step 5: Ajustar JSON-LD**

- `provider.name` usa el nombre ya anonimizado por la API.
- Añadir `areaServed` con la ciudad si existe.
- Mantener `offers` y `aggregateRating` solo cuando haya datos reales.

- [x] **Step 6: Ejecutar verificación**

Run: `npx tsc --noEmit`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

Run: `npx playwright test e2e/service_detail.spec.ts --project=chromium`

Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add frontend/app/home/service/[id]/page.tsx frontend/app/home/service/[id]/service-detail-client.tsx frontend/e2e/service_detail.spec.ts
git commit -m "feat(frontend): server-render service detail and anonymous contact"
```

---

### Task 10: Perfil público de profesor y sitemap limpio

**Files:**
- Create: `frontend/app/profesores/[id]/page.tsx`
- Create: `frontend/components/public-profile-contact.tsx`
- Modify: `frontend/app/sitemap.ts`
- Modify: `frontend/app/robots.ts`
- Modify: `frontend/lib/api.ts`
- Test: `frontend/e2e/public_profile.spec.ts`

**Interfaces:**
- Consumes: `GET /proveedor/{id}`, `GET /proveedor/sitemap`, `GET /servicio/sitemap`, tipos de Task 8.
- Produces:
  - `/profesores/[id]` SSR con `Person` + `Service` + `AggregateRating` cuando hay reseñas.
  - `robots: noindex, follow` si `perfil_publico === false`.
  - Sitemap sin URLs `?categoria=UUID`.

- [x] **Step 1: Escribir test E2E**

```ts
import { test, expect } from "@playwright/test"

const servicioId = process.env.TEST_SERVICIO_ID

test("el perfil público responde y no expone contacto privado", async ({ page, request }) => {
  test.skip(!servicioId, "TEST_SERVICIO_ID no configurado")

  const servicio = await (await request.get(`http://localhost:8000/servicio/${servicioId}`)).json()
  const response = await page.goto(`/profesores/${servicio.proveedor_id}`)
  expect(response?.status()).toBe(200)
  await expect(page.getByRole("button", { name: /contactar/i })).toBeVisible()
  await expect(page.locator("body")).not.toContainText("mailto:")
})

test("el sitemap no incluye filtros con UUID", async ({ request }) => {
  const servicios = await (await request.get("http://localhost:8000/servicio/sitemap")).json()
  test.skip(servicios.length === 0, "Backend sin servicios de prueba")

  const xml = await (await request.get("/sitemap.xml")).text()
  expect(xml).not.toContain("?categoria=")
  expect(xml).toContain("/home/service/")
})
```

- [x] **Step 2: Ejecutar y verificar fallo**

Run: `npx playwright test e2e/public_profile.spec.ts --project=chromium`

Expected: FAIL porque `/profesores/[id]` no existe.

- [x] **Step 3: Implementar página**

`app/profesores/[id]/page.tsx`:

- `params: Promise<{ id: string }>` y `await params`.
- `fetchPublicResponse<PerfilPublicoCompleto>("/proveedor/{id}")`.
- `status === 404`, `notFound()`.
- `status === 0` o `status >= 500`: renderizar un estado honesto “No se pudo cargar el perfil” con `robots: noindex`; no llamar `notFound()`.
- Metadata:
  - Título: `{nombre_publico} — Clases particulares en {ciudad ?? "Talavera de la Reina"} | Habilo`.
  - `robots: perfil_publico ? { index: true, follow: true } : { index: false, follow: true }`.
  - Canonical `/profesores/{id}`.
  - OpenGraph solo con `avatar_publico`.
- JSON-LD `Person` con `name`, `image`, `addressLocality`; `AggregateRating` solo si `num_valoraciones > 0`; `Service` por cada servicio.
- UI: cabecera, bio, chips de materias/niveles, horario, grid de servicios, reseñas, CTA.
- Si `perfil_publico === false`, mostrar aviso: “Este profesional aún no ha activado su perfil público.”

`PublicProfileContact` es cliente, renderiza un `Button` “Contactar” que abre `LeadContactDialog` con `perfilId` y `profesionalNombre`. Añade también un botón “Compartir por WhatsApp” que usa `navigator.share` si existe o `https://wa.me/?text=...`; captura `share_clicked` con `{ channel: "whatsapp" | "native", provider_id }`.

- [x] **Step 4: Limpiar sitemap y robots**

`sitemap.ts`:

- Estáticos: `/`, `/home`.
- Servicios desde `/servicio/sitemap`.
- Perfiles desde `/proveedor/sitemap`.
- Si `fetchPublic` devuelve `null`, usar `[]`.
- Eliminar la llamada a `getCategorias` y las URLs `?categoria=`.
- Usar `API_URL_INTERNAL` mediante `fetchPublic`.

`robots.ts`:

- `allow`: `/`, `/home`, `/home/service/`, `/profesores/`.
- `disallow`: `/dashboard`, `/admin`, `/chats`, `/profile`, `/favoritos`, `/select-role`, `/publish-service`, `/login`.

- [x] **Step 5: Ejecutar verificación**

Run: `npx tsc --noEmit`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

Run: `npx playwright test e2e/public_profile.spec.ts --project=chromium`

Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add frontend/app/profesores/[id]/page.tsx frontend/components/public-profile-contact.tsx frontend/app/sitemap.ts frontend/app/robots.ts frontend/lib/api.ts frontend/e2e/public_profile.spec.ts
git commit -m "feat(frontend): add public provider profile and clean sitemap"
```

---

### Task 11: Ajustes de perfil público en el dashboard

**Files:**
- Create: `frontend/components/perfil-publico-form.tsx`
- Modify: `frontend/app/dashboard/page.tsx`
- Modify: `frontend/lib/api.ts`
- Modify: `frontend/e2e/helpers/auth.ts`
- Test: `frontend/e2e/provider_settings.spec.ts`

**Interfaces:**
- Consumes: `PATCH /proveedor/`, `GET /proveedor/me`.
- Produces:
  - Formulario con `ciudad`, `zona`, `materias`, `niveles`, `perfil_publico`, `consentimiento_marketing`.
  - `actualizarPerfilProveedor` acepta los campos nuevos.

- [x] **Step 1: Corregir helper de test**

En `e2e/helpers/auth.ts`, usar la clave real del token:

```ts
localStorage.setItem("token", token)
localStorage.removeItem("serviclick_token")
```

En `logout`, borrar `token` y `serviclick_role`.

- [x] **Step 2: Escribir test E2E**

```ts
import { test, expect } from "@playwright/test"
import { loginAs } from "./helpers/auth"

test("el profesor ve los ajustes de perfil público", async ({ page }) => {
  test.skip(!process.env.PROVEEDOR_TOKEN, "PROVEEDOR_TOKEN no configurado")
  await loginAs(page, "proveedor", "/dashboard")
  await expect(page.getByText("Perfil público")).toBeVisible()
  await expect(
    page.getByLabel(/acepto publicar mi nombre, foto, ciudad y precio/i)
  ).toBeVisible()
})
```

- [x] **Step 3: Ejecutar y verificar fallo**

Run: `npx playwright test e2e/provider_settings.spec.ts --project=chromium`

Expected: FAIL porque no existe el formulario.

- [x] **Step 4: Implementar formulario**

`PerfilPublicoForm` recibe el perfil actual y muestra:

- Título “Perfil público”.
- Texto: “Publica tu nombre, foto, ciudad y precio en un perfil indexable. Sin tu permiso, tu perfil aparecerá anónimo y no se indexará.”
- `ciudad`, `zona`.
- `materias` y `niveles` como texto separado por comas; al guardar, `split(",").map(trim).filter(Boolean)`.
- Checkbox `perfil_publico` con etiqueta “Acepto publicar mi nombre, foto, ciudad y precio en mi perfil público.”
- Checkbox separado `consentimiento_marketing`: “Acepto que Habilo use mi imagen o voz en redes sociales.”
- Botón “Guardar perfil público”.
- Mensaje de éxito “Perfil público actualizado.”

Insertar la tarjeta en `dashboard/page.tsx` después de `HorarioDisponibilidad`.

- [x] **Step 5: Ampliar tipos API**

`actualizarPerfilProveedor` acepta `ciudad`, `zona`, `materias`, `niveles`, `perfil_publico`, `consentimiento_marketing`.

Añadir `MiPerfilProveedor extends PerfilProveedorPublico` con `ciudad`, `zona`, `materias`, `niveles`, `perfil_publico`, `consentimiento_marketing`, `url_documento` y `motivo_rechazo`. Tipar `getMiPerfilProveedor()` con esa interfaz. No añadir `consentimiento_marketing` a `PerfilPublicoCompleto` ni a `PerfilProveedorPublico`.

- [x] **Step 6: Ejecutar verificación**

Run: `npx tsc --noEmit`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

Run: `npx playwright test e2e/provider_settings.spec.ts --project=chromium`

Expected: PASS si `PROVEEDOR_TOKEN` está configurado; SKIP si no.

- [x] **Step 7: Commit**

```bash
git add frontend/components/perfil-publico-form.tsx frontend/app/dashboard/page.tsx frontend/lib/api.ts frontend/e2e/helpers/auth.ts frontend/e2e/provider_settings.spec.ts
git commit -m "feat(frontend): add provider public profile settings"
```

---

### Task 12: CMP, analítica con consentimiento y privacidad

**Files:**
- Create: `frontend/context/consent-context.tsx`
- Create: `frontend/components/consent-banner.tsx`
- Create: `frontend/components/consent-settings-button.tsx`
- Modify: `frontend/instrumentation-client.ts`
- Modify: `frontend/context/auth-context.tsx`
- Modify: `frontend/app/layout.tsx`
- Modify: `frontend/app/legal/privacidad/page.tsx`
- Test: `frontend/e2e/consent.spec.ts`

**Interfaces:**
- Consumes: `posthog-js` ya inicializado.
- Produces:
  - `ConsentProvider` con `analytics: boolean | null`, `decidir(analytics: boolean)`, `abrirBanner()`.
  - Banner con “Aceptar analítica” y “Solo esenciales”.
  - PostHog opt-out por defecto y sin persistencia hasta aceptar.

- [x] **Step 1: Escribir test E2E**

```ts
import { test, expect } from "@playwright/test"

test("rechazar analítica no deja cookies de PostHog", async ({ page, context }) => {
  await context.clearCookies()
  await page.goto("/")
  await page.evaluate(() => localStorage.clear())
  await page.reload()

  await expect(page.getByRole("dialog", { name: /cookies/i })).toBeVisible()
  await page.getByRole("button", { name: "Solo esenciales" }).click()
  await expect(page.getByRole("dialog", { name: /cookies/i })).toHaveCount(0)

  const cookies = await context.cookies()
  expect(cookies.some((cookie) => cookie.name.startsWith("ph_"))).toBe(false)
})

test("aceptar analítica guarda la decisión", async ({ page }) => {
  await page.goto("/")
  await page.evaluate(() => localStorage.clear())
  await page.reload()

  await page.getByRole("button", { name: "Aceptar analítica" }).click()
  const consent = await page.evaluate(() => localStorage.getItem("habilo_consent_v1"))
  expect(consent).toContain('"analytics":true')
})
```

- [x] **Step 2: Ejecutar y verificar fallo**

Run: `npx playwright test e2e/consent.spec.ts --project=chromium`

Expected: FAIL porque no hay banner.

- [x] **Step 3: Configurar PostHog opt-out**

En `instrumentation-client.ts`, mantener `posthog.init` con:

```ts
opt_out_capturing_by_default: true,
cookieless_mode: "on_reject",
person_profiles: "identified_only",
respect_dnt: true,
disable_session_recording: true,
```

Eliminar `Sentry.replayIntegration()` y las opciones `replaysSessionSampleRate`/`replaysOnErrorSampleRate`. No se activa session replay en esta fase.

- [x] **Step 4: Implementar consentimiento**

`ConsentProvider`:

- Clave `habilo_consent_v1`.
- Estado inicial `null`; leer `localStorage` en `useEffect`.
- Si no hay decisión, abrir banner.
- Guardar `isPostHogConfigured` y no llamar a PostHog si falta configuración.
- `decidir(true)`: guardar `{ analytics: true, ts: new Date().toISOString() }`, `posthog.reset()`, `posthog.opt_in_capturing()`, `posthog.capture("$pageview")`.
- `decidir(false)`: guardar `{ analytics: false, ts: ... }`, `posthog.opt_out_capturing()`, `posthog.reset()`.
- `abrirBanner()` vuelve a mostrar el banner.

En `auth-context.tsx`, `identifyUser` solo ejecuta `posthog.identify` si `posthog.has_opted_in_capturing()` es `true`. Los `posthog.capture` existentes quedan cubiertos por el opt-out global, pero no deben añadir identificadores propios.

En `app/layout.tsx`, envolver el árbol existente con `<ConsentProvider>` y renderizar `<ConsentBanner />` dentro de `AuthProvider`, después de `FeedbackButton`.

`ConsentBanner`:

- `role="dialog"`, `aria-label="Preferencias de cookies"`.
- Texto: “Usamos cookies técnicas para que Habilo funcione. Si aceptas, también usamos analítica para entender qué páginas ayudan a encontrar profesor.”
- Enlace a `/legal/privacidad`.
- Botones del mismo tamaño: “Solo esenciales” y “Aceptar analítica”.

`ConsentSettingsButton` usa `abrirBanner()` y se inserta en la política de privacidad.

- [x] **Step 5: Actualizar privacidad**

En `frontend/app/legal/privacidad/page.tsx`:

- 2.1: añadir datos de leads anónimos (nombre, contacto, mensaje, UTM y código de referido).
- 2.1: añadir datos de perfil público y consentimiento.
- 4: añadir PostHog, Sentry, Vercel Analytics y Resend.
- 5: indicar conservación de leads durante 12 meses.
- 9: explicar cookies técnicas y analítica opcional; cómo retirar el consentimiento; indicar que no se usa session replay.

- [x] **Step 6: Ejecutar verificación**

Run: `npx tsc --noEmit`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

Run: `npx playwright test e2e/consent.spec.ts --project=chromium`

Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add frontend/context/consent-context.tsx frontend/components/consent-banner.tsx frontend/components/consent-settings-button.tsx frontend/instrumentation-client.ts frontend/context/auth-context.tsx frontend/app/layout.tsx frontend/app/legal/privacidad/page.tsx frontend/e2e/consent.spec.ts
git commit -m "feat(frontend): add consent-gated analytics"
```

---

### Task 13: Runbook de medición, migración y lanzamiento

**Files:**
- Create: `backend/migrations/2026-11-02_data_backfill.sql`
- Create: `docs/growth/measurement-runbook.md`
- Modify: `backend/seed_categories.py`
- Modify: `docs/superpowers/plans/2026-11-02-habilo-growth-foundation.md` (marcar tareas completadas)

**Interfaces:**
- Consumes: todo lo anterior.
- Produces:
  - SQL de backfill de categoría.
  - Runbook operativo para Vercel Analytics, GSC, Bing, PostHog, UTMs y opt-in de profesores.

- [x] **Step 1: Crear SQL de backfill**

`backend/migrations/2026-11-02_data_backfill.sql`:

```sql
BEGIN;

INSERT INTO categorias (id, nombre, icono, descripcion)
SELECT gen_random_uuid(), 'clases_particulares', '📚',
       'Clases particulares de matemáticas, inglés, lengua, ciencias y apoyo escolar.'
WHERE NOT EXISTS (
  SELECT 1 FROM categorias WHERE nombre = 'clases_particulares'
);

-- Revisar el SELECT antes de ejecutar el UPDATE.
SELECT s.id, s.titulo, c.nombre AS categoria_actual
FROM servicios s
JOIN categorias c ON c.id = s.categoria_id
WHERE c.nombre = 'otros'
  AND (
    s.titulo ILIKE '%clase%' OR s.titulo ILIKE '%profesor%'
    OR s.titulo ILIKE '%matem%' OR s.titulo ILIKE '%ingl%'
    OR s.titulo ILIKE '%lengua%' OR s.titulo ILIKE '%física%'
    OR s.titulo ILIKE '%química%' OR s.titulo ILIKE '%apoyo%'
  );

UPDATE servicios s
SET categoria_id = (
  SELECT id FROM categorias WHERE nombre = 'clases_particulares' LIMIT 1
)
WHERE s.categoria_id = (
  SELECT id FROM categorias WHERE nombre = 'otros' LIMIT 1
)
AND (
  s.titulo ILIKE '%clase%' OR s.titulo ILIKE '%profesor%'
  OR s.titulo ILIKE '%matem%' OR s.titulo ILIKE '%ingl%'
  OR s.titulo ILIKE '%lengua%' OR s.titulo ILIKE '%física%'
  OR s.titulo ILIKE '%química%' OR s.titulo ILIKE '%apoyo%'
);

-- Rellenar ciudad desde el usuario, sin tocar perfiles ya rellenados.
UPDATE perfiles_proveedor p
SET ciudad = u.ciudad
FROM usuarios u
WHERE p.usuario_id = u.id
  AND p.ciudad IS NULL
  AND u.ciudad IS NOT NULL
  AND btrim(u.ciudad) <> '';

UPDATE servicios s
SET ciudad = COALESCE(p.ciudad, u.ciudad)
FROM perfiles_proveedor p
JOIN usuarios u ON u.id = p.usuario_id
WHERE s.proveedor_id = p.id
  AND s.ciudad IS NULL
  AND COALESCE(p.ciudad, u.ciudad) IS NOT NULL
  AND btrim(COALESCE(p.ciudad, u.ciudad)) <> '';

COMMIT;
```

Añadir `clases_particulares` a `backend/seed_categories.py` con el mismo icono y descripción, para que entornos locales nuevos tengan la categoría sin depender del SQL manual. No cambiar los IDs existentes.

- [x] **Step 2: Escribir runbook**

`docs/growth/measurement-runbook.md` debe incluir:

- Aplicar `2026-11-02_growth_foundation.sql` y `2026-11-02_data_backfill.sql` en Supabase, en ese orden y con copia de seguridad previa.
- Revisar el `SELECT` de servicios antes de ejecutar el `UPDATE` de categoría.
- Configurar en Vercel: `API_URL_INTERNAL=https://api.habilo.es`, `NEXT_PUBLIC_API_URL=https://api.habilo.es` y `NEXT_PUBLIC_SITE_URL=https://habilo.es`.
- Configurar en el backend: `RESEND_API_KEY` y `EMAIL_FROM`.
- Verificar:
  - `SELECT count(*) FROM servicios WHERE activo IS NOT FALSE;`
  - `SELECT count(*) FROM perfiles_proveedor WHERE perfil_publico;`
- Pedir opt-in a los 8 profesores con este mensaje:

```text
Hola [nombre], estoy preparando el perfil público de Habilo para que las familias de Talavera te encuentren. ¿Me autorizas a publicar tu nombre, foto, ciudad y precio en tu perfil? Sin tu permiso aparecerás como “Profesional de Habilo” y el perfil no se indexará. Responde SÍ o NO.
```

- Activar Vercel Analytics y verificar `https://habilo.es/_vercel/insights/script.js` con estado `200`.
- Configurar Google Search Console y Bing Webmaster Tools; enviar `https://habilo.es/sitemap.xml`.
- Crear el embudo de PostHog:
  - `$pageview`
  - `landing_cta_clicked`
  - `search_performed`
  - `service_viewed`
  - `referral_visit`
  - `signup_started`
  - `login_completed`
  - `service_request_created`
  - `lead_submitted`
  - `share_clicked`
  - `message_sent`
- Tabla UTM:
  - `utm_source`: `tiktok`, `instagram`, `youtube`, `x`, `teacher`, `ampa`, `school`, `pr`, `blog`, `google`
  - `utm_medium`: `social`, `referral`, `email`, `organic`, `cpc`
  - `utm_campaign`: `talavera-clases`, `profes-mates`, `shorts-01`
  - `?ref=CODIGO` se guarda en `leads.ref`, no se mezcla con UTM.
- Checklist semanal: visitas por fuente, top páginas, consultas GSC, leads, solicitudes, profesores nuevos, reseñas.
- Retención de leads: 12 meses; revisar y borrar manualmente los antiguos.
- Gate de ads: no activar hasta 20 profesores y 10 reseñas.

- [x] **Step 3: Verificar el runbook**

Run: `Test-Path docs/growth/measurement-runbook.md`

Expected: `True`.

Run: `Select-String -Path docs/growth/measurement-runbook.md -Pattern "utm_source|Search Console|perfil_publico"`

Expected: al menos 3 coincidencias.

- [x] **Step 4: Commit**

```bash
git add backend/migrations/2026-11-02_data_backfill.sql backend/seed_categories.py docs/growth/measurement-runbook.md docs/superpowers/plans/2026-11-02-habilo-growth-foundation.md
git commit -m "docs(growth): add measurement and launch runbook"
```

---

## Execution Handoff

Antes de la primera tarea:

1. Revisar `git diff` de los archivos locales del usuario.
2. Commitear el spec aprobado y este plan, sin incluir `.playwright-mcp/`, `service-live.png` ni cambios ajenos.
3. Aplicar la migración SQL en Supabase antes de desplegar backend.
4. Ejecutar la suite backend (`python -m pytest tests -m "not integration" -q`) y el build frontend (`npm run build`).

Al terminar, verificar:

- `/` es pública y muestra servicios reales.
- `/login` funciona con Google/Facebook.
- `/home` contiene servicios en el HTML inicial.
- Un profesor sin opt-in no expone nombre ni foto.
- Un visitante anónimo puede enviar un lead sin cuenta.
- El lead llega por email al profesor.
- El banner de cookies aparece y PostHog no captura antes de aceptar.
- El sitemap no contiene `?categoria=UUID`.
