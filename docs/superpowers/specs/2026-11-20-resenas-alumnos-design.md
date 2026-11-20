# Reseñas de alumnos por enlace — diseño

Fecha: 2026-11-20. Estado: pendiente de aprobación.

## Por qué

Una familia que llega a la ficha de un profesor no tiene ninguna señal de confianza: «0 valoraciones». Las reseñas sirven, por orden:

1. Que la visita se convierta en contacto (hoy 0 contactos).
2. Estrellas en la ficha y, si Google las acepta, en los resultados (la ficha ya emite `AggregateRating` cuando hay valoraciones).
3. Requisito propio para abrir publicidad: 20 profesores y 10 reseñas reales (`2026-11-02-habilo-growth-design.md`).
4. Que el profesor comparta Habilo con sus alumnos.

Hoy no se puede crear ninguna reseña: `valoraciones` exige una `solicitud` completada dentro de Habilo y el piloto funciona con contacto y pago directos, así que ese flujo no se usa. El plan de crecimiento ya aprobó la idea («enlace único tras la clase, confirmación del admin, no inventar»), pero no se construyó.

## Decisión del usuario

- **Quién reseña:** alumnos actuales (o sus padres) del profesor, aunque las clases no empezaran por Habilo. Opción A, elegida el 2026-11-20.
- **Flujo:** enlace propio por profesor → el profesor lo manda por WhatsApp → formulario sin cuenta, con email o teléfono privado → la reseña queda pendiente → el fundador la aprueba → se publica en la ficha con una etiqueta que explica su origen.
- **Construcción:** tabla nueva, separada de `valoraciones` (opción 2, elegida el 2026-11-20).

## Objetivos

- Que cada profesor tenga un enlace estable para pedir opiniones.
- Formulario corto, móvil primero, sin registro, en español.
- Nada se publica sin aprobación manual.
- La ficha muestra estas reseñas y la media combina las aprobadas de las dos fuentes.
- Cumplir el deber de informar de cómo se comprueban las reseñas (normativa de consumo, transposición de la Directiva Ómnibus): cada reseña dice que es de un alumno del profesor, no de una clase reservada en Habilo, y que la ha revisado Habilo.

## Fuera de alcance (v1)

- Panel de moderación en `/admin`: v1 se modera con SQL en Supabase (el acceso de Claude a la base de producción está bloqueado; el usuario ejecuta el SQL).
- Respuesta del profesor a una reseña.
- Editar o borrar una reseña desde el formulario.
- Reseñas con foto.
- Importar opiniones de otras webs (prohibido por el plan).

## Anti-objetivos (sería un fracaso aunque funcione)

- Reseñas falsas o escritas por el propio profesor publicadas sin control.
- Publicar el email o teléfono de quien reseña, o dejarlo accesible desde la API pública.
- Presentar estas reseñas como si vinieran de clases reservadas en Habilo.
- Romper el flujo de solicitudes, pagos o valoraciones existente.

## Restricciones

- Backend FastAPI + SQLAlchemy; base Supabase Postgres. Migraciones como SQL en `backend/migrations/` que ejecuta el usuario.
- Frontend Next.js 16 (App Router). Leer `node_modules/next/dist/docs/` antes de escribir código (ver `frontend/AGENTS.md`).
- Despliegue: backend al hacer push a `main` (GitHub Actions); frontend en Vercel. No subir a `main` sin OK del usuario.
- Rate limiting con `limiter` (patrón de `routers/lead*.py`: `5/hour`).
- Emails con Resend desde `soporte@habilo.es`.
- Sin datos personales en el repositorio (es público).

## Enfoques considerados

1. **Ampliar `valoraciones`** con origen, estado, nombre mostrado y contacto, y hacer opcionales `solicitud_id` y `autor_id`. Reutiliza la lectura de la ficha, pero relaja restricciones de las que depende el flujo de reservas y pagos, y mezcla contacto privado con datos públicos.
2. **Tabla nueva `resenas_alumnos`** (elegida). No toca el flujo existente, aísla el contacto privado (fácil de proteger y borrar) y la ficha une las dos fuentes. Coste: algo más de código al unir y al calcular la media.

## Diseño

### Datos

`perfiles_proveedor`:
- `codigo_resenas text UNIQUE`: código aleatorio, URL-safe, 8–10 caracteres (`secrets.token_urlsafe`). La migración lo rellena para todos los perfiles existentes; los perfiles nuevos lo reciben al crearse o la primera vez que se pide. Se puede regenerar a mano si se filtra.

`resenas_alumnos` (nueva):

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid PK | |
| `perfil_id` | uuid FK `perfiles_proveedor(id)` NOT NULL | |
| `puntuacion` | int NOT NULL, CHECK 1–5 | |
| `comentario` | text NOT NULL, 20–1000 caracteres | |
| `autor_nombre` | text NOT NULL, ≤ 40 | Se publica tal cual («Marta G.»). |
| `relacion` | text NOT NULL, CHECK in (`alumno`, `padre_madre`) | |
| `antiguedad` | text NOT NULL, CHECK in (`menos_3_meses`, `3_12_meses`, `mas_1_ano`) | |
| `contacto` | text NULL, ≤ 120, CHECK (`estado <> 'pendiente' OR contacto IS NOT NULL`) | Email o teléfono. **Privado.** Obligatorio al enviar (lo exige la API); se borra (NULL) 90 días después de moderar. |
| `consentimiento` | boolean NOT NULL, CHECK true | Acepta que se publique la opinión. |
| `estado` | text NOT NULL DEFAULT `pendiente`, CHECK in (`pendiente`, `aprobada`, `rechazada`) | |
| `fecha` | timestamptz NOT NULL DEFAULT now() | |
| `fecha_moderacion` | timestamptz NULL | |

Índice único parcial para frenar duplicados: `(perfil_id, lower(contacto))`.

### Media de valoraciones

`perfiles_proveedor.valoracion_media` y `num_valoraciones` alimentan la ficha, las tarjetas de búsqueda y el detalle de servicio. Al aprobar o rechazar una reseña de alumno hay que recalcularlos con las valoraciones existentes más las reseñas de alumnos `aprobada`. Se hace con una función SQL `recalcular_valoracion(perfil_id)` y un trigger en `resenas_alumnos` (INSERT/UPDATE/DELETE), para que funcione igual al moderar con SQL que con un panel futuro.

**Para el builder:** en el repositorio no hay ningún código que escriba `valoracion_media`. Comprobar en Supabase si existe un trigger sobre `valoraciones`; si existe, la función nueva debe sustituirlo o convivir con él sin pisar el cálculo.

### Backend

- `GET /resenas/{codigo}` (público): devuelve lo mínimo para pintar el formulario: nombre público del profesor (nombre si `perfil_publico`, si no solo el nombre de pila) y su `perfil_id`. 404 si el código no existe.
- `POST /resenas/{codigo}` (público, `limiter` `5/hour` por IP): valida, guarda con estado `pendiente`, campo trampa (honeypot) que descarta envíos de bots sin dar error. Duplicado (`perfil_id` + contacto) → 409 con mensaje amable. Tras guardar, email a `soporte@habilo.es` con el nombre del profesor, la puntuación, el comentario y el SQL para aprobar o rechazar (sin el contacto en el asunto).
- `GET /proveedor/{id}` (existente): `resenas` une valoraciones existentes y reseñas de alumnos aprobadas, ordenadas por fecha. `ResenaPublicaOut` gana `origen` (`habilo` | `alumno`), `relacion` y `antiguedad` opcionales. `contacto` nunca sale en ningún esquema público.
- `GET /proveedor/me/codigo-resenas` (autenticado, profesor): devuelve su enlace.

### Frontend

- Página `/opina/[codigo]`: formulario de la maqueta (estrellas, opinión, nombre como se publica, relación, antigüedad, email o teléfono, casilla de consentimiento). `noindex`. Tras enviar: «Gracias. Revisaremos tu opinión y la publicaremos en el perfil de {nombre} en unos días». Enlace a la política de privacidad.
- Ficha `/profesores/[id]`: cada reseña de alumno muestra «{autor_nombre} · {madre/padre de alumno | alumno/a} · {antigüedad}» y la línea «Alumno/a de {nombre de pila} antes de Habilo · revisada por Habilo». Bajo el título «Reseñas», una frase: «Las reseñas las escriben alumnos y familias del profesor. Habilo revisa cada una antes de publicarla y comprueba algunas con quien la escribió».
- Panel del profesor (`/dashboard`): tarjeta «Pide opiniones a tus alumnos» con el enlace, botón copiar y botón «Enviar por WhatsApp» (`wa.me` con texto ya escrito).

### Moderación (v1, SQL)

Snippets en `docs/growth/captacion/` (local, no en el repo): listar pendientes, aprobar, rechazar. Antes de aprobar, el fundador comprueba al azar alguna reseña escribiendo al contacto («¿Dejaste tú esta opinión sobre X?»); obligatorio para las primeras de cada profesor.

### Privacidad

- Política de privacidad: añadir el tratamiento (opinión y contacto de quien reseña; finalidad: publicar la opinión y verificar que es real; base: consentimiento; conservación del contacto: se borra 90 días después de moderar).
- Borrado del contacto a los 90 días de `fecha_moderacion`: tarea programada (`utils/scheduler.py`) que pone `contacto = NULL`. El índice único parcial solo cubre filas con `contacto IS NOT NULL`.
- Logs y Sentry: no registrar el contacto.

### Pruebas

- Backend (pytest, mocks como el resto): validación, honeypot, duplicado 409, código inexistente 404, que `contacto` no aparece en `GET /proveedor/{id}`, que solo salen las `aprobada`, unión y orden de las dos fuentes.
- SQL: la función de recálculo con las dos fuentes (test de integración PostGIS si Docker está disponible; si no, comprobación manual en Supabase documentada).
- E2E (Playwright): el formulario envía y muestra el agradecimiento; la ficha muestra una reseña de alumno con su etiqueta.

## Decisiones tomadas por Claude (revisar)

- Se aceptan reseñas aunque el perfil del profesor no sea público; solo se muestran cuando lo es.
- El email al fundador es best-effort: si Resend falla, la reseña se guarda igual y se registra el error (sin el contacto).
- El profesor no recibe aviso cuando se publica una reseña (v1).
- La media y el número de valoraciones combinan las dos fuentes, también en tarjetas de búsqueda, detalle de servicio y `AggregateRating`.
- «Nombre de pila» = primera palabra del nombre público.
- Una sola puntuación global (1–5), sin desglose por criterios.

## Qué queda al builder

- Nombres de archivos, componentes y funciones; estructura del router.
- Texto exacto del mensaje de WhatsApp y del email al fundador.
- Diseño visual del formulario dentro del estilo actual de la web.
