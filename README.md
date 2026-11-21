# Habilo

Marketplace de servicios de proximidad que conecta a personas que buscan un servicio local con profesionales que lo ofrecen cerca de ellas. El piloto empieza por las **clases particulares en Talavera de la Reina** ([habilo.es](https://habilo.es)), con el catálogo completo de categorías de servicio abierto en el modelo.

---

## Tabla de contenidos

- [Qué es Habilo](#qué-es-habilo)
- [Estado actual del proyecto](#estado-actual-del-proyecto)
- [Funcionalidades](#funcionalidades)
- [Arquitectura](#arquitectura)
- [Tecnologías](#tecnologías)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Puesta en marcha en local](#puesta-en-marcha-en-local)
- [Pruebas](#pruebas)
- [Despliegue](#despliegue)
- [Roadmap](#roadmap)
- [Licencia](#licencia)

---

## Qué es Habilo

Una plataforma web (PWA) donde los profesionales publican sus servicios y las familias o clientes los encuentran por materia, nivel y zona, ven el precio antes de escribir y contactan sin crear cuenta. Nació como trabajo académico de 2º de DAM y se está lanzando como producto real.

## Estado actual del proyecto

**Fase:** piloto en producción desde noviembre de 2026, con los primeros profesores de Talavera.

| Área | Estado |
|---|---|
| Web | En producción en [habilo.es](https://habilo.es) |
| API | En producción en `api.habilo.es` |
| Pagos online | Implementados (Stripe Connect) pero **desactivados** en el piloto (`PAGOS_HABILITADOS=false`): profesor y familia acuerdan el pago entre ellos |
| Login | Google. Facebook está implementado pero oculto hasta que la app de Meta esté publicada |
| Legal | Aviso legal, privacidad y condiciones publicados. Entidad legal pendiente de constituir |

## Funcionalidades

- **Autenticación:** OAuth2 con Google (Facebook preparado, oculto) y JWT.
- **Alta de profesionales:** perfil con ciudad, zona, materias y niveles; perfil público solo con consentimiento expreso.
- **Anuncios de servicio:** precio fijo o por horas, imágenes y ubicación aproximada.
- **Búsqueda:** por texto, categoría, ciudad y proximidad (PostGIS), sin exponer coordenadas exactas. Los perfiles destacados aparecen primero.
- **Contacto sin cuenta:** las familias escriben al profesional desde su anuncio (formulario con consentimiento).
- **Fichas públicas de profesor** (`/profesores/[id]`), indexables y con datos estructurados.
- **Reseñas de alumnos por enlace** (`/opina/[código]`): cada profesor tiene un enlace para que sus alumnos actuales opinen sin crear cuenta. Las opiniones se moderan antes de publicarse.
- **Invitaciones entre profesionales:** enlace con código; por cada invitado que publica, quien invita gana 15 días de «Destacado».
- **Solicitudes, ofertas, chat (WebSocket) y valoraciones** para el flujo con pago online.
- **Favoritos, bloqueos, reportes y panel de administración.**
- **Notificaciones:** push web (PWA) y correo transaccional.
- **Contenido:** blog (`/blog`) y página para profesores (`/da-clases`).
- **Medición:** PostHog solo con consentimiento de cookies; errores en Sentry.

## Arquitectura

Cliente-servidor de dos capas, sin microservicios:

```
┌──────────────────┐     REST + WebSocket     ┌──────────────────┐
│ Frontend          │ ───────────────────────▶ │ Backend           │
│ Next.js (Vercel)  │ ◀─────────────────────── │ FastAPI (Docker)  │
└──────────────────┘                           └─────────┬────────┘
                                                         │
              ┌────────────────────┬─────────────────────┼─────────────────────┐
              ▼                    ▼                     ▼                     ▼
   Supabase (PostgreSQL     Stripe (Connect +      Resend (correo        APScheduler
   + PostGIS + Storage)     Identity, inactivo)    transaccional)        (tareas periódicas)
```

El backend sigue capas: **routers** (FastAPI) → **services** (lógica de negocio e integraciones) → **repositories** (persistencia). SQLAlchemy 2.0 sin `relationship()`, con joins explícitos. Los cambios de esquema son SQL en `backend/migrations/`, que se aplican a mano en Supabase.

## Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| Backend | FastAPI (Python 3.12), SQLAlchemy 2.0 |
| Base de datos | PostgreSQL + PostGIS (Supabase) |
| Storage | Supabase Storage |
| Auth | OAuth2 (Google, Facebook) + JWT |
| Pagos | Stripe Connect (Express) y Stripe Identity |
| Correo | Resend |
| Push | Web Push (VAPID) |
| Analítica y errores | PostHog (con consentimiento), Sentry |
| Pruebas | pytest (backend), Playwright (end-to-end), `node:test` (service worker) |

## Estructura del repositorio

```
backend/
├── main.py, config.py
├── database/       # engine y sesión
├── models/         # modelos SQLAlchemy
├── repositories/   # persistencia
├── services/       # lógica de negocio e integraciones
├── schemas/        # esquemas Pydantic
├── routers/        # endpoints
├── utils/          # oauth, jwt, storage, websockets, stripe…
├── migrations/     # SQL que se aplica a mano en Supabase
└── tests/          # pytest (tests/integration necesita Docker + PostGIS)

frontend/
├── app/            # rutas (App Router)
├── components/     # componentes
├── context/        # autenticación
├── lib/            # cliente de la API, analítica, utilidades
├── content/blog/   # artículos del blog en Markdown
├── e2e/            # pruebas Playwright
└── tests/          # pruebas del service worker

docs/               # especificaciones, planes y documentación de crecimiento
```

## Puesta en marcha en local

**Requisitos:** Python 3.12 y Node.js 22.

```bash
# Backend (copia backend/.env.example a backend/.env y rellénalo)
cd backend
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt   # Linux/macOS: .venv/bin/python
.venv/Scripts/python -m uvicorn main:app --reload --port 8000

# Frontend (copia frontend/.env.example a frontend/.env)
cd frontend
npm install
npm run dev        # http://localhost:3000
```

## Pruebas

```bash
# Backend (sin las de integración, que necesitan Docker)
cd backend && .venv/Scripts/python -m pytest -q --ignore=tests/integration

# End-to-end (arranca `npm run dev` si no está en marcha)
cd frontend && npx playwright test

# Service worker
cd frontend && node --test tests/
```

Los cambios que afecten al inicio de sesión o a la hidratación hay que probarlos también con una versión de producción (`npx next build && npx next start`): hay fallos que en `npm run dev` no se ven.

## Despliegue

- **Frontend:** Vercel publica automáticamente cada push a `main`.
- **Backend:** GitHub Actions (`.github/workflows/deploy-backend.yml`) despliega en el servidor por AWS Systems Manager cada push a `main` que toque `backend/**`. Si el push incluye `backend/migrations`, se detiene: primero se aplica el SQL en Supabase y después se lanza el workflow a mano.
- Se trabaja en la rama `dev` y se lleva a `main` para publicar.

## Roadmap

- [ ] Llegar a 20 profesores y 10 reseñas en Talavera antes de invertir en publicidad.
- [ ] Constituir la entidad legal (necesaria para activar los pagos online y publicar el login con Facebook en Meta).
- [ ] Revisión por abogado de los documentos legales.
- [ ] Activar los pagos online (Stripe en modo producción).
- [ ] Ampliar a otras ciudades y categorías.

## Licencia

Proyecto de código propietario. Todos los derechos reservados. No está disponible para descarga, uso o distribución por terceros.
