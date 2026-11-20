# Reseñas de alumnos por enlace — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cada profesor tiene un enlace `habilo.es/opina/<código>` con el que sus alumnos dejan una reseña sin cuenta; se publica en su ficha solo tras aprobación manual.

**Architecture:** Tabla nueva `resenas_alumnos` (separada de `valoraciones`) y columna `codigo_resenas` en `perfiles_proveedor`. Router público `/resenas`, unión de las dos fuentes en `GET /proveedor/{id}`, media recalculada por trigger SQL. Frontend: página cliente `/opina/[codigo]`, etiquetas en la ficha y tarjeta en el panel.

**Tech Stack:** FastAPI + SQLAlchemy + pytest (backend/.venv); Supabase Postgres; Next.js 16 App Router + Playwright.

**Spec:** `docs/superpowers/specs/2026-11-20-resenas-alumnos-design.md`

## Global Constraints

- Nada se publica sin `estado = 'aprobada'`. Pendientes y rechazadas no salen ni cuentan en la media.
- `contacto` no aparece en ningún esquema de respuesta, ni en el asunto del email, ni en logs/Sentry.
- No tocar `valoraciones`, `solicitudes` ni pagos.
- Valores fijos: puntuación 1–5; comentario 20–1000; `autor_nombre` ≤ 40; `contacto` ≤ 120; `relacion` ∈ {`alumno`, `padre_madre`}; `antiguedad` ∈ {`menos_3_meses`, `3_12_meses`, `mas_1_ano`}; rate limit `5/hour` en el POST; borrado de contacto a los 90 días de `fecha_moderacion`.
- Etiqueta en ficha: «Alumno/a de {nombre de pila} antes de Habilo · revisada por Habilo». Frase bajo «Reseñas»: «Las reseñas las escriben alumnos y familias del profesor. Habilo revisa cada una antes de publicarla y comprueba algunas con quien la escribió».
- Mensaje tras enviar: «Gracias. Revisaremos tu opinión y la publicaremos en el perfil de {nombre} en unos días».
- La migración SQL la ejecuta el usuario en Supabase **antes** de subir el backend a `main` (el código lee la columna nueva). No subir a `main` sin OK del usuario.
- Frontend: leer `frontend/node_modules/next/dist/docs/` antes de escribir páginas (Next 16).
- Tests backend: `cd backend && .venv/Scripts/python -m pytest -q --ignore=tests/integration`. Base actual: 71 passed, 5 fallos preexistentes en `test_solicitud_service.py`.

## Review Focus

1. Contacto con mayúsculas o espacios distintos (`Ana@X.com ` vs `ana@x.com`) → se trata como duplicado (409). Test en Task 2.
2. `GET /proveedor/me/codigo-resenas` declarado después de `GET /proveedor/{perfil_id}` → FastAPI intenta parsear `me` como UUID (422). Test en Task 4.
3. Comentario con HTML (`<script>`) → se guarda tal cual, se escapa en el email (`html.escape`) y React lo pinta como texto. Test del email en Task 2.
4. Reseña `pendiente` o `rechazada` de un perfil público → no sale en `GET /proveedor/{id}`. Test en Task 3.
5. Fallo de Resend al avisar → el POST responde 201 igual. Test en Task 2.

---

### Task 1: Base de datos y modelo

**Files:**
- Create: `backend/migrations/2026-11-20_resenas_alumnos.sql`
- Create: `backend/models/resena_alumno.py`
- Modify: `backend/models/__init__.py`, `backend/models/perfil_proveedor.py`, `backend/repositories/proveedor_repository.py` (alta de perfil, junto a `_generar_codigo_referido`)
- Test: `backend/tests/test_resenas_alumnos.py`

**Interfaces:**
- Produces: modelo `ResenaAlumno` (tabla `resenas_alumnos`, columnas del spec); `Perfil_Proveedor.codigo_resenas: str | None`; `ProveedorRepository._generar_codigo_resenas(session) -> str` (`secrets.token_urlsafe(6)`, reintenta si existe); función SQL `recalcular_valoracion(perfil uuid)`.

- [ ] **Step 1: Test que falla** — `test_crear_perfil_asigna_codigo_resenas`: con `SessionLocal` parcheado (patrón de `test_avatar_publico.py`), `ProveedorRepository().crear(...)` añade un `Perfil_Proveedor` cuyo `codigo_resenas` es str de 8 caracteres.
- [ ] **Step 2:** Ejecutar y ver FAIL (atributo inexistente).
- [ ] **Step 3: Modelo + columna + generación.** `ResenaAlumno` con los tipos del spec; `codigo_resenas = Column(Text, unique=True, nullable=True)`.
- [ ] **Step 4: Migración SQL** (en una transacción):
  - `ALTER TABLE perfiles_proveedor ADD COLUMN IF NOT EXISTS codigo_resenas text UNIQUE;` y backfill con `substr(md5(random()::text || id::text), 1, 8)` donde sea NULL (sin depender de `pgcrypto`).
  - `CREATE TABLE resenas_alumnos (...)` con los CHECK del spec, incluido `CHECK (estado <> 'pendiente' OR contacto IS NOT NULL)` y `CHECK (consentimiento)`.
  - `CREATE UNIQUE INDEX ... ON resenas_alumnos (perfil_id, lower(btrim(contacto))) WHERE contacto IS NOT NULL;`
  - Función y trigger (cuerpo fijado por el spec):

```sql
CREATE OR REPLACE FUNCTION recalcular_valoracion(p_perfil uuid) RETURNS void AS $$
  WITH notas AS (
    SELECT v.puntuacion FROM valoraciones v
      JOIN perfiles_proveedor p ON p.usuario_id = v.destinatario_id
     WHERE p.id = p_perfil
    UNION ALL
    SELECT r.puntuacion FROM resenas_alumnos r
     WHERE r.perfil_id = p_perfil AND r.estado = 'aprobada'
  )
  UPDATE perfiles_proveedor
     SET num_valoraciones = (SELECT count(*) FROM notas),
         valoracion_media = COALESCE((SELECT round(avg(puntuacion)::numeric, 2) FROM notas), 0)
   WHERE id = p_perfil;
$$ LANGUAGE sql;
```
  Trigger `AFTER INSERT OR UPDATE OR DELETE ON resenas_alumnos FOR EACH ROW` que llama a `recalcular_valoracion(COALESCE(NEW.perfil_id, OLD.perfil_id))`.
  - Al final del archivo, comentado, la consulta para comprobar si ya hay un trigger en `valoraciones`: `SELECT tgname, pg_get_triggerdef(oid) FROM pg_trigger WHERE tgrelid = 'valoraciones'::regclass AND NOT tgisinternal;`. Si devuelve uno que calcula la media solo con `valoraciones`, sustituirlo por un trigger que llame a `recalcular_valoracion` del perfil del destinatario.
- [ ] **Step 5:** Tests en verde + suite completa sin fallos nuevos.
- [ ] **Step 6: Commit** `feat(reviews): add student reviews table and per-teacher code`.

### Task 2: Servicio de reseñas (crear y leer formulario)

**Files:**
- Create: `backend/schemas/resena_alumno_schema.py`, `backend/repositories/resena_alumno_repository.py`, `backend/services/resena_alumno_service.py`
- Test: `backend/tests/test_resenas_alumnos.py`

**Interfaces:**
- Consumes: `ResenaAlumno`, `ProveedorRepository.get_by_codigo_resenas(codigo) -> Perfil_Proveedor | None` (añadir junto a `get_by_codigo_referido`).
- Produces:
  - `CrearResenaAlumno(BaseModel)`: `puntuacion: int (1–5)`, `comentario: str (20–1000, strip)`, `autor_nombre: str (1–40, strip)`, `relacion: Literal["alumno","padre_madre"]`, `antiguedad: Literal["menos_3_meses","3_12_meses","mas_1_ano"]`, `contacto: str (3–120, strip)`, `consentimiento: Literal[True]`, `website: str = ""` (honeypot).
  - `FormularioResenaOut`: `nombre_profesor: str`.
  - `ResenaAlumnoRepository.crear(perfil_id, datos: dict) -> ResenaAlumno`; `existe(perfil_id, contacto) -> bool` (compara `lower(trim)`); `listar_aprobadas(perfil_id) -> list[dict]`; `borrar_contactos_caducados(dias: int = 90) -> int`.
  - `ResenaAlumnoService.formulario(codigo) -> dict | None`; `crear(codigo, datos: CrearResenaAlumno) -> ResenaAlumno` (lanza `HTTPException` 404 si el código no existe, 409 «Ya has dejado una opinión para este profesor. ¡Gracias!» si duplicado).
  - `nombre_profesor`: nombre completo si `perfil_publico`, si no la primera palabra.

- [ ] **Step 1: Tests que fallan:** `test_formulario_codigo_inexistente_none`, `test_formulario_perfil_privado_solo_nombre_de_pila`, `test_crear_guarda_pendiente`, `test_crear_duplicado_409` (contacto `" Ana@X.com"` frente a existente `ana@x.com`: el servicio normaliza antes de `existe`), `test_crear_avisa_a_soporte_sin_contacto_en_asunto` (el asunto no contiene el contacto; el cuerpo escapa `<script>`), `test_crear_no_falla_si_resend_falla` (el mock de email lanza; `crear` devuelve la reseña), `test_schema_rechaza_comentario_corto` y `test_schema_rechaza_puntuacion_6`.
- [ ] **Step 2:** Ver FAIL.
- [ ] **Step 3: Implementar** schema, repositorio y servicio. El email va a `soporte@habilo.es` con `NotificacionEmailService.enviar_a_email` dentro de `try/except Exception` y `logger.warning` sin datos personales. Asunto: `Nueva reseña para {nombre}: {puntuacion}★`. El cuerpo incluye el comentario escapado, el contacto (el fundador lo necesita para verificar) y los dos SQL listos: `UPDATE resenas_alumnos SET estado='aprobada', fecha_moderacion=now() WHERE id='{id}';` y lo mismo con `'rechazada'`.
- [ ] **Step 4:** Verde + suite.
- [ ] **Step 5: Commit** `feat(reviews): student review service`.

### Task 3: Router público y unión en la ficha

**Files:**
- Create: `backend/routers/resenas.py`
- Modify: `backend/main.py` (`include_router`), `backend/schemas/proveedor_schema.py` (`ResenaPublicaOut`), `backend/services/proveedor_service.py` (`_listar_resenas_publicas`; recibe `perfil` para tener `perfil.id` y el nombre)
- Test: `backend/tests/test_resenas_alumnos.py`

**Interfaces:**
- Consumes: `ResenaAlumnoService`, `ResenaAlumnoRepository.listar_aprobadas`.
- Produces: `GET /resenas/{codigo}` → `FormularioResenaOut` o 404; `POST /resenas/{codigo}` → 201 `{"ok": true}` (`@limiter.limit("5/hour")`; si `website` no está vacío, 201 sin guardar). `ResenaPublicaOut` gana `origen: Literal["habilo","alumno"] = "habilo"`, `relacion: str | None`, `antiguedad: str | None`. Sin campo `contacto`.

- [ ] **Step 1: Tests que fallan** (TestClient, patrón de `test_lead_router.py`): `test_get_formulario_404`, `test_post_honeypot_no_guarda`, `test_post_ok_201`, `test_ficha_une_resenas_ordenadas_por_fecha_desc` (una de `valoraciones` y otra de alumno; la más reciente primero; la de alumno con `origen="alumno"`), `test_ficha_no_expone_contacto` (`"contacto"` no aparece en el JSON serializado con `PerfilProveedorPublicoOut`), `test_ficha_no_muestra_pendientes` (el repositorio solo se consulta con `listar_aprobadas`; si devuelve vacío, no hay reseña de alumno).
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: Implementar.** `ProveedorService` gana `self.resena_alumno_repository`; añadirlo también al `_make_service()` de `tests/test_perfil_publico.py` y `tests/test_avatar_publico.py` (crean el servicio con `__new__`).
- [ ] **Step 4:** Verde + suite.
- [ ] **Step 5: Commit** `feat(reviews): public review endpoints and profile merge`.

### Task 4: Enlace del profesor y borrado de contactos

**Files:**
- Modify: `backend/routers/proveedores.py`, `backend/utils/scheduler.py`
- Test: `backend/tests/test_resenas_alumnos.py`

**Interfaces:**
- Produces: `GET /proveedor/me/codigo-resenas` (autenticado) → `{"codigo": str}`; genera y guarda el código si el perfil no tenía. 404 si el usuario no es profesor. Job diario `borrar_contactos_resenas` → `ResenaAlumnoRepository().borrar_contactos_caducados(90)`.

- [ ] **Step 1: Tests que fallan:** `test_me_codigo_resenas_no_choca_con_perfil_id` (con `get_current_user` sobrescrito por `dependency_overrides`, `GET /proveedor/me/codigo-resenas` → 200, no 422), `test_me_codigo_resenas_404_sin_perfil`, `test_borrar_contactos_caducados_filtra_por_fecha_moderacion` (la sentencia compilada contiene `fecha_moderacion` y `estado != 'pendiente'`).
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: Implementar.** La ruta se declara antes de `/{perfil_id}`. Job con `"interval", hours=24, id="borrar_contactos_resenas"`.
- [ ] **Step 4:** Verde + suite.
- [ ] **Step 5: Commit** `feat(reviews): teacher review link and contact retention`.

### Task 5: Página `/opina/[codigo]`

**Files:**
- Create: `frontend/app/opina/[codigo]/page.tsx` (metadata `robots: { index: false, follow: false }`), `frontend/app/opina/[codigo]/opina-form.tsx` (cliente)
- Modify: `frontend/lib/api.ts`
- Test: `frontend/e2e/opina.spec.ts`

**Interfaces:**
- Produces en `lib/api.ts`: `getFormularioResena(codigo: string): Promise<{ nombre_profesor: string }>`, `crearResenaAlumno(codigo: string, datos: CrearResenaAlumnoInput): Promise<{ ok: true }>`, tipo `CrearResenaAlumnoInput` con los campos de `CrearResenaAlumno`.

El formulario carga los datos en el navegador (no en el servidor), para poder simular la API en Playwright con `page.route`.

- [ ] **Step 1: Tests que fallan** (`page.route` sobre `**/resenas/abc12345`):
  - `muestra el nombre del profesor y envía la opinión`: GET devuelve `{nombre_profesor: "Julia Sánchez Navarro"}`; se ve «¿Qué tal las clases con Julia Sánchez Navarro?»; se rellena (5 estrellas, comentario de 20+ caracteres, «Marta G.», madre/padre, 3–12 meses, contacto, consentimiento); el POST recibe esos valores y `consentimiento: true`; se ve «Gracias. Revisaremos tu opinión y la publicaremos en el perfil de Julia Sánchez Navarro en unos días».
  - `código inexistente`: GET 404 → «Este enlace no es válido».
  - `duplicado`: POST 409 → se ve el mensaje de la API.
  - `no envía sin consentimiento`: el botón no dispara el POST y se marca el campo.
  - `la página no es indexable`: hay `meta[name="robots"][content*="noindex"]`.
- [ ] **Step 2:** `npx playwright test e2e/opina.spec.ts` → FAIL.
- [ ] **Step 3: Implementar** con los componentes de `components/ui` (los mismos de `select-role`); estrellas como 5 botones `aria-label="{n} estrellas"`; enlace a `/legal/privacidad`.
- [ ] **Step 4:** Verde. Revisar a ojo en móvil (390×844) con Playwright y captura.
- [ ] **Step 5: Commit** `feat(reviews): student review form page`.

### Task 6: Reseñas de alumno en la ficha y enlace en el panel

**Files:**
- Modify: `frontend/lib/api.ts` (`ResenaPublica` gana `origen`, `relacion`, `antiguedad`; `getMiCodigoResenas(): Promise<{ codigo: string }>`), `frontend/app/profesores/[id]/page.tsx` (sección «Reseñas», ~líneas 348–375), `frontend/app/dashboard/page.tsx` (tarjeta tras `PerfilPublicoForm`, ~línea 690)
- Create: `frontend/components/pedir-resenas-card.tsx`
- Test: `frontend/e2e/opina.spec.ts` (solo lo que se puede simular)

- [ ] **Step 1: Implementar la ficha:** frase del spec bajo «Reseñas»; para `origen === "alumno"`, línea «{autor_nombre} · {madre/padre de alumno | alumno/a} · {menos de 3 meses | de 3 a 12 meses | más de 1 año}» y etiqueta «Alumno/a de {nombre de pila} antes de Habilo · revisada por Habilo».
- [ ] **Step 2: Implementar la tarjeta** «Pide opiniones a tus alumnos»: enlace `https://habilo.es/opina/{codigo}`, botón «Copiar» (`navigator.clipboard`) y «Enviar por WhatsApp» → `https://wa.me/?text=` + `encodeURIComponent("Hola, estoy en Habilo, una web de profesores de Talavera. Si te están sirviendo mis clases, ¿me dejas una opinión? Son dos minutos: https://habilo.es/opina/{codigo}")`.
- [ ] **Step 3: Verificar:** `npx tsc --noEmit -p .` sin errores nuevos en los archivos tocados y `npm run build` correcto. La ficha y el panel cargan datos en el servidor o con sesión, así que la comprobación visual se hace tras desplegar (Task 7), con una reseña aprobada de prueba.
- [ ] **Step 4: Commit** `feat(reviews): show student reviews and teacher link card`.

### Task 7: Privacidad, moderación y despliegue

**Files:**
- Modify: `frontend/app/legal/privacidad/page.tsx`
- Create (local, ignorado por git): `docs/growth/captacion/moderar-resenas.sql`
- Modify: `HANDOFF.md`

- [ ] **Step 1: Privacidad:** apartado nuevo «Opiniones sobre profesores»: datos (opinión, nombre mostrado, relación, antigüedad, email o teléfono), finalidad (publicar la opinión y comprobar que es real), base (consentimiento), conservación (el contacto se borra 90 días después de revisarla; la opinión, mientras esté publicada), derecho a pedir su retirada en `soporte@habilo.es`.
- [ ] **Step 2: SQL de moderación:** pendientes (`SELECT r.id, p.id AS perfil, u.nombre, r.puntuacion, r.comentario, r.autor_nombre, r.contacto, r.fecha FROM resenas_alumnos r JOIN perfiles_proveedor p ON p.id = r.perfil_id JOIN usuarios u ON u.id = p.usuario_id WHERE r.estado = 'pendiente' ORDER BY r.fecha;`), aprobar y rechazar.
- [ ] **Step 3: Commit** `docs(privacy): explain student review data` y push a `dev`.
- [ ] **Step 4: Despliegue (con el usuario):** (a) el usuario ejecuta la migración en Supabase y la consulta de triggers; (b) con su OK, push `dev:main`; (c) esperar al deploy y comprobar en prod: `GET /resenas/{código de prueba}` 200, `/opina/{código}` 200 con noindex; (d) el usuario deja una reseña de prueba desde su móvil, la aprueba con SQL, se comprueba la ficha (etiqueta, media, recuento) y después se borra (`DELETE`) y se comprueba que la media vuelve a su valor.
- [ ] **Step 5:** Actualizar `HANDOFF.md` y el correo-plantilla para mandar el enlace a los 5 profesores públicos.
