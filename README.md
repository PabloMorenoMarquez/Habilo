# Habilo

Marketplace de servicios de proximidad que conecta a personas que buscan contratar un servicio local (clases particulares, fontanería, electricidad, paseo de perros, montaje de muebles, etc.) con profesionales que los ofrecen cerca de ellas.

---

## Tabla de contenidos

- [Qué es Habilo](#qué-es-habilo)
- [Qué problema resuelve](#qué-problema-resuelve)
- [Estado actual del proyecto](#estado-actual-del-proyecto)
- [Funcionalidades principales](#funcionalidades-principales)
- [Arquitectura general](#arquitectura-general)
- [Tecnologías utilizadas](#tecnologías-utilizadas)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Puesta en marcha en local](#puesta-en-marcha-en-local)
- [Roadmap](#roadmap)
- [Licencia](#licencia)

---

## Qué es Habilo

Habilo es una plataforma web (con soporte PWA en desarrollo) tipo "Wallapop de servicios": cualquier persona puede publicar un servicio que ofrece o buscar y contratar uno cerca de su ubicación. El proyecto nació como trabajo académico de 2º de DAM y se está profesionalizando con el objetivo de lanzarse como producto real al mercado, empezando con un piloto centrado en clases particulares en Talavera de la Reina, manteniendo abierto el catálogo completo de categorías de servicio.

## Qué problema resuelve

Muchos profesionales de servicios locales (oficios, clases particulares, cuidado de mascotas, servicios personales) no tienen visibilidad digital ni una forma sencilla de que clientes cercanos los encuentren, negocien un precio y paguen de forma segura. Habilo resuelve esto ofreciendo:

- Búsqueda de servicios por proximidad geográfica real.
- Negociación estructurada (ofertas, precio libre o por horas) antes de comprometer ningún pago.
- Pago protegido: el importe queda retenido hasta que el cliente confirma que el servicio se ha prestado correctamente.
- Verificación de identidad de los profesionales.
- Sistema de reputación (valoraciones), bloqueos y reportes para mantener un entorno seguro.

## Estado actual del proyecto

**Fase:** desarrollo activo, sin desplegar en producción, sin usuarios reales todavía.

| Área | Estado |
|---|---|
| Backend | Funcional en local, cubre todo el ciclo (auth, búsqueda, solicitudes, ofertas, pagos, chat, valoraciones, moderación) |
| Frontend | Funcional en local, PWA en desarrollo |
| Pagos | Stripe Connect implementado y probado en modo test |
| Verificación de identidad | Stripe Identity implementado y probado en modo test |
| Legal | Documentos en borrador, pendientes de revisión por abogado y de constitución de la entidad |
| Despliegue | No realizado — es el próximo paso, backend corre en local por ahora |

## Funcionalidades principales

- **Autenticación**: OAuth2 con Google y Facebook (Facebook pendiente de revisión de Meta para producción) + JWT.
- **Perfiles de proveedor**: descripción, experiencia, radio de acción, horario de disponibilidad, verificación de identidad (manual vía documento + admin, y automática vía Stripe Identity).
- **Publicación de servicios**: precio fijo o por horas, galería de hasta 10 imágenes, ubicación geográfica.
- **Búsqueda por proximidad**: basada en PostGIS, sin exponer coordenadas exactas en las respuestas públicas.
- **Solicitudes y ofertas**: flujo de negociación con máquina de estados explícita, incluyendo propuesta de fecha/hora.
- **Pagos**: Stripe Connect (modelo Express), autorización → captura → retención → transferencia al proveedor descontando comisión.
- **Chat en tiempo real**: mensajería vía WebSocket por solicitud.
- **Valoraciones**: puntuación y comentario tras la finalización de un servicio.
- **Favoritos**: de servicios y de proveedores.
- **Moderación**: bloqueos entre usuarios, reportes, panel de administración.
- **Notificaciones**: push web (PWA) y email transaccional en eventos clave.

## Arquitectura general

Arquitectura cliente-servidor clásica de dos capas, sin microservicios:

```
┌─────────────────┐        REST + WebSocket        ┌──────────────────┐
│  Frontend         │ ──────────────────────────────▶│  Backend           │
│  Next.js 15        │◀────────────────────────────── │  FastAPI            │
│  (App Router)      │                                 │                     │
└─────────────────┘                                 └────────┬───────────┘
                                                               │
                              ┌────────────────────────────────┼────────────────────────────┐
                              ▼                                ▼                             ▼
                    ┌──────────────────┐            ┌──────────────────┐          ┌──────────────────┐
                    │ Supabase           │            │ Stripe             │          │ Resend              │
                    │ (PostgreSQL +      │            │ (Connect + Identity)│          │ (email transaccional)│
                    │  PostGIS + Storage) │           └──────────────────┘          └──────────────────┘
                    └──────────────────┘
                              ▲
                              │
                    ┌──────────────────┐
                    │ APScheduler         │
                    │ (jobs periódicos:   │
                    │ auto-cancelación,   │
                    │ auto-liberación     │
                    │ de pagos)           │
                    └──────────────────┘
```

El backend sigue separación por capas: **routers** (FastAPI) → **services** (lógica de negocio y orquestación de llamadas externas) → **repositories** (persistencia "tonta", sin lógica de negocio). El ORM (SQLAlchemy 2.0) se usa sin `relationship()`, con joins manuales explícitos.

## Tecnologías utilizadas

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend | FastAPI (Python), SQLAlchemy 2.0 |
| Base de datos | PostgreSQL (Supabase) + PostGIS |
| Auth | OAuth2 (Google, Facebook) + JWT |
| Storage | Supabase Storage |
| Pagos | Stripe Connect (Express) |
| Verificación de identidad | Stripe Identity |
| Email transaccional | Resend |
| Notificaciones push | Web Push (VAPID) |
| Tareas programadas | APScheduler |
| Geocodificación | Nominatim / OpenStreetMap + Geolocation API del navegador |

## Estructura del repositorio

Repositorio único (monorepo) con backend y frontend:

```
backend/
├── main.py, config.py
├── database/       # conexión y sesión (base.py, engine.py, session.py)
├── models/         # modelos SQLAlchemy, sin relationship()
├── repositories/    # persistencia (try/commit/rollback/close)
├── services/         # lógica de negocio, autorización, integraciones externas
├── schemas/           # esquemas Pydantic
├── routers/            # endpoints FastAPI
└── utils/               # oauth, jwt, auth_middleware, storage, ws_manager, stripe_client

frontend/
├── app/                 # rutas Next.js App Router
├── context/             # contexto de autenticación
├── lib/                 # api.ts, geocode.ts, storage.ts
└── components/           # componentes reutilizables
```

## Puesta en marcha en local

**Requisitos:**
- Python 3.12.3
- Node.js v22.13.1

> El despliegue a producción todavía no se ha hecho — es el siguiente paso del roadmap técnico. En cuanto exista un flujo de despliegue definido, esta sección se ampliará con las variables de entorno necesarias y los comandos exactos de arranque.

## Roadmap

**Antes de manejar dinero real:**
- [ ] Constituir la entidad legal.
- [ ] Revisión por abogado de los documentos legales.
- [ ] Desplegar el backend a producción.

**A continuación:**
- [ ] Configurar dominio `habilo.es` y correo profesional.
- [ ] Activar Stripe Identity en modo producción.
- [ ] Revisión de Meta para login con Facebook en producción.

## Licencia

Proyecto de código propietario. Todos los derechos reservados. No está disponible para descarga, uso o distribución por terceros.
