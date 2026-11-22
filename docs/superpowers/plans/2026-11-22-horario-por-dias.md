# Horario por días y con tramos: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cada profesor ponga un horario distinto por día de la semana, con 1 a 3 tramos, y que se vea agrupado en la ficha y en el anuncio.

**Architecture:** Una columna nueva `perfiles_proveedor.horario` (JSONB) validada con Pydantic, y una migración SQL que convierte los horarios antiguos. En el frontend, `lib/horario.ts` (funciones puras: formato, validación y edición) lo usan el editor nuevo del panel y las dos páginas públicas.

**Tech Stack:** FastAPI + Pydantic v2 + SQLAlchemy (JSONB), PostgreSQL/Supabase, Next.js + shadcn/ui, Playwright (también como runner de tests de funciones puras).

**Spec:** `docs/superpowers/specs/2026-11-22-horario-por-dias-design.md`

## Global Constraints

- Rama `feat/horario-por-dias`, creada desde `dev`. No hacer push a `main` ni aplicar SQL en Supabase sin el OK explícito del usuario.
- Formato exacto: `{"1": [{"inicio": "09:00", "fin": "13:00"}], …}`. Las claves van de `"1"` (lunes) a `"7"` (domingo) y solo aparecen los días disponibles. `{}` se guarda como `NULL`.
- Reglas: horas `HH:MM` (de 00:00 a 23:59), `inicio < fin`, de 1 a 3 tramos por día, sin solapes y ordenados por `inicio`.
- Letras de los días: `L M X J V S D`. Rangos con raya «–» (U+2013) y tramos unidos con « y ».
- Se dejan de usar `dias_disponibles`, `hora_inicio` y `hora_fin`, pero **no se borran** las columnas.
- Tests del backend: `backend/.venv/Scripts/python -m pytest …` desde `backend/`. Los de integración necesitan `docker compose -f docker-compose.test.yml up -d` y `TEST_DATABASE_URL=postgresql://test:test@localhost:5433/serviclick_test`.
- Si se arranca `next start`, al final se cierra **por PID**, porque `TaskStop` deja vivo el proceso `node`.

## Review Focus

1. **Perfiles sin horario** (`horario` nulo): la ficha y el anuncio no muestran la sección, y el editor empieza con todos los días apagados. → `test_formatear_horario_vacio` (Task 3) y la aserción inicial del e2e del editor (Task 4).
2. **Un tramo que acaba antes de empezar, o dos que se solapan**: el panel no deja guardar y la API devuelve 422 si llega igualmente. → `test_tramo_al_reves_es_invalido` / `test_tramos_solapados_son_invalidos` (Task 1) y `erroresHorario` (Task 3).
3. **Tramos que se tocan** (13:00–15:00 y 15:00–20:00): son válidos, porque no se solapan. → `test_tramos_contiguos_son_validos` (Task 1) y el caso equivalente en Task 3.
4. **Migración aplicada dos veces, o sobre perfiles sin días u horas**: no rompe nada ni pisa un `horario` ya relleno. → `test_migracion_es_idempotente_y_respeta_vacios` (Task 2).
5. **Días repartidos con el mismo horario** (L, X, V): se agrupan en una sola entrada sin que parezca un rango. → `test_formatear_dias_no_consecutivos` (Task 3).

---

### Task 1: Validación del horario (Pydantic)

**Files:**
- Create: `backend/schemas/horario_schema.py`
- Test: `backend/tests/test_horario_schema.py`

**Interfaces:**
- Produces:
  - `class Tramo(BaseModel)` con `inicio: str` y `fin: str` (patrón `^([01]\d|2[0-3]):[0-5]\d$`);
  - `DiaSemana = Literal["1","2","3","4","5","6","7"]`;
  - `HorarioEntrada = dict[DiaSemana, list[Tramo]]`;
  - `def normalizar_horario(h: HorarioEntrada | None) -> dict | None`. Devuelve `dict` plano (`{"1": [{"inicio","fin"}…]}`) con los tramos ordenados, o `None` si `h` es `None` o `{}`. Lanza `ValueError` con estos mensajes exactos: `"La hora de fin debe ser posterior a la de inicio"`, `"Los tramos se solapan"`, `"Como mucho 3 tramos por día"` y `"Un día disponible necesita al menos un tramo"`.

- [ ] **Step 1: Escribir los tests que fallan:**
  - `test_horario_valido_se_ordena`: `{"2": [{"inicio": "15:00", "fin": "20:00"}, {"inicio": "09:00", "fin": "13:00"}]}` da los tramos ordenados (09:00 primero).
  - `test_horario_vacio_es_none`: `{}` y `None` dan `None`.
  - `test_tramo_al_reves_es_invalido`: 14:00–10:00 lanza `ValueError` con el mensaje de fin.
  - `test_tramos_solapados_son_invalidos`: 09:00–13:00 y 12:00–15:00 lanzan «Los tramos se solapan».
  - `test_tramos_contiguos_son_validos`: 09:00–13:00 y 13:00–15:00 son válidos.
  - `test_cuatro_tramos_es_invalido` y `test_dia_sin_tramos_es_invalido`.
  - `test_hora_mal_formada_es_invalida`: con `"25:00"` o `"9:00"`, `pydantic.ValidationError` al construir `TypeAdapter(HorarioEntrada)`.
  - `test_dia_fuera_de_rango_es_invalido`: la clave `"8"` da `ValidationError`.
- [ ] **Step 2: Ejecutarlos y ver que fallan.** Ejecutar `.venv/Scripts/python -m pytest tests/test_horario_schema.py -q`. Debe dar `ModuleNotFoundError`.
- [ ] **Step 3: Implementar** `backend/schemas/horario_schema.py`.
- [ ] **Step 4: Ejecutarlos y ver que pasan.** Con el mismo comando, deben pasar todos.
- [ ] **Step 5: Commit** `feat(schedule): validate per-day schedule with time slots`.

---

### Task 2: Columna, migración y API

**Files:**
- Modify: `backend/models/perfil_proveedor.py`: añadir `horario = Column(JSONB, nullable=True)`, con `from sqlalchemy.dialects.postgresql import JSONB`.
- Create: `backend/migrations/2026-11-22_horario_por_dias.sql`
- Modify: `backend/schemas/proveedor_schema.py`.
  - `CrearPerfilProveedor` (líneas 12-14): quitar los tres campos viejos, porque `create_or_update` no los usa.
  - `PerfilProveedorPublico` (líneas 34-36) y `PerfilProveedorPublicoOut` (líneas 96-98): cambiar los tres campos por `horario: Optional[dict] = None`.
  - `ActualizarPerfilProveedor` (líneas 126-128): cambiarlos por `horario: Optional[HorarioEntrada] = None`, con un `field_validator("horario")` que llame a `normalizar_horario`.
- Modify: `backend/services/proveedor_service.py:102-104`: devolver `"horario": perfil.horario`.
- Modify: `backend/repositories/borrado_cuenta_repository.py`: en `anonimizar`, añadir `horario=None` junto a `dias_disponibles=None`.
- Test: `backend/tests/test_proveedor_actualizar.py` (añadir) y `backend/tests/integration/test_horario_migracion.py`.

**Interfaces:**
- Consumes: `HorarioEntrada` y `normalizar_horario` (Task 1).
- Produces: el JSON de `GET /proveedor/me`, de la ficha pública y del perfil dentro del detalle del anuncio lleva `horario: {…} | null`. Ya no lleva `dias_disponibles`, `hora_inicio` ni `hora_fin`. `PATCH /proveedor/me` acepta `{"horario": {...} | null}`.

SQL de la migración, que es idempotente:

```sql
alter table perfiles_proveedor add column if not exists horario jsonb;

update perfiles_proveedor p
   set horario = (
     select jsonb_object_agg(d, jsonb_build_array(jsonb_build_object('inicio', p.hora_inicio, 'fin', p.hora_fin)))
       from unnest(string_to_array(p.dias_disponibles, ',')) as d
      where trim(d) ~ '^[1-7]$')
 where p.horario is null
   and coalesce(p.dias_disponibles, '') <> ''
   and coalesce(p.hora_inicio, '') <> ''
   and coalesce(p.hora_fin, '') <> '';
```

(Recortar `d` con `trim` también en la clave.)

- [ ] **Step 1: Escribir los tests que fallan.**
  - En `test_proveedor_actualizar.py`:
    - `test_actualizar_acepta_horario_y_lo_normaliza`: `ActualizarPerfilProveedor(horario={"1": [...dos tramos desordenados...]}).model_dump(exclude_unset=True)["horario"]` sale ordenado.
    - `test_actualizar_rechaza_horario_solapado`: lanza `ValidationError`.
    - `test_actualizar_horario_vacio_borra`: `{}` da `{"horario": None}`.
    - `test_campos_viejos_ya_no_se_aceptan_en_salida`: `PerfilProveedorPublicoOut.model_fields` no tiene `dias_disponibles` y sí tiene `horario`.
  - En `tests/integration/test_horario_migracion.py`, con el patrón de `tests/integration/test_borrado_cuenta.py` (crea su usuario y su perfil con `codigo_referido` y ejecuta el SQL del archivo con `text()`):
    - `test_migracion_convierte_horario_antiguo`: un perfil con `"2,3"` y 17:00–21:00 sale con `{"2": [{"inicio":"17:00","fin":"21:00"}], "3": [...]}`.
    - `test_migracion_es_idempotente_y_respeta_vacios`: con un perfil sin horas, otro con `horario` ya relleno y el SQL ejecutado dos veces, el primero queda `NULL` y el segundo no cambia.
- [ ] **Step 2: Ejecutarlos y ver que fallan.** Ejecutar `.venv/Scripts/python -m pytest tests/test_proveedor_actualizar.py -q` y, con Docker y `TEST_DATABASE_URL`, `tests/integration/test_horario_migracion.py`. Deben fallar porque falta `horario`, falta el archivo SQL, o ambas cosas.
- [ ] **Step 3: Implementar** el modelo, la migración, los esquemas, el servicio y el borrado.
- [ ] **Step 4: Ejecutar los tests y ver que pasan.** Ejecutar la suite unitaria completa (`tests --ignore=tests/integration`) y los de integración (`tests/integration/test_borrado_cuenta.py tests/integration/test_horario_migracion.py`). Todo debe pasar. Comprobar con `grep -rn "dias_disponibles\|hora_inicio\|hora_fin" backend --include=*.py` (excluyendo `.venv`) que solo quedan el modelo y el borrado de cuenta.
- [ ] **Step 5: Commit** `feat(schedule): horario column, migration and API`.

---

### Task 3: `lib/horario.ts` (formato, validación y edición)

**Files:**
- Create: `frontend/lib/horario.ts`: solo funciones puras y **sin importaciones `@/`**, para que Playwright la pueda importar en un spec.
- Test: `frontend/e2e/horario_formato.spec.ts` (tests de funciones, sin `page`).

**Interfaces:**
- Produces:

```ts
export type Dia = "1" | "2" | "3" | "4" | "5" | "6" | "7"
export type Tramo = { inicio: string; fin: string }
export type Horario = Partial<Record<Dia, Tramo[]>>
export const DIAS: { dia: Dia; letra: string; nombre: string }[]   // L Lunes … D Domingo
export const MAX_TRAMOS = 3
export const TRAMO_POR_DEFECTO: Tramo  // { inicio: "17:00", fin: "21:00" }
export function formatearHorario(h: Horario | null | undefined): string   // "" si no hay
export function erroresHorario(h: Horario): Partial<Record<Dia, string>>
export function activarDia(h: Horario, dia: Dia): Horario      // copia del último día disponible anterior, o el tramo por defecto
export function copiarADemas(h: Horario, dia: Dia): Horario     // copia sus tramos a los demás días disponibles
export function limpiarHorario(h: Horario): Horario | null      // tramos ordenados; null si no queda ningún día
```

Algoritmo de `formatearHorario`, que la firma no determina:
1. Agrupar los días con tramos idénticos. Los grupos se ordenan por su primer día.
2. Dentro de cada grupo, comprimir las rachas de 3 o más días seguidos como `L–V`. El resto de días se lista y todo se une con `", "`.
3. Escribir cada grupo como `«días»: «tramos»`, con los tramos unidos con `" y "` y cada uno como `09:00–13:00`.
4. Unir los grupos con `" · "`.

Mensajes de `erroresHorario`: `"Rellena las dos horas"`, `"La hora de fin debe ser posterior a la de inicio"` y `"Los tramos se solapan"`. Por día, solo el primero que se encuentre.

- [ ] **Step 1: Escribir los tests que fallan,** con `import { … } from "../lib/horario"`:
  - `test_formatear_horario_vacio`: con `null` y con `{}` da `""`.
  - `test_formatear_agrupa_rango`: L–V con 17:00–21:00 y S con 10:00–13:00 dan `"L–V: 17:00–21:00 · S: 10:00–13:00"`.
  - `test_formatear_varios_tramos`: `{"2": [09–13, 15–20]}` da `"M: 09:00–13:00 y 15:00–20:00"`.
  - `test_formatear_dias_no_consecutivos`: L, X y V iguales dan `"L, X, V: 17:00–21:00"`.
  - `test_formatear_dos_seguidos`: S y D iguales dan `"S, D: 10:00–14:00"`.
  - `erroresHorario`: los tres mensajes y el caso contiguo (13–15 + 15–20) sin error.
  - `activarDia`: con el lunes 9–13 y activando el miércoles, el miércoles queda 9–13. Sin ningún día, queda 17:00–21:00.
  - `copiarADemas`: con L, M y X activos y copiando desde L, M y X quedan iguales que L, y J sigue sin aparecer.
  - `limpiarHorario`: ordena los tramos y devuelve `null` para `{}`.
- [ ] **Step 2: Ejecutarlos y ver que fallan.** Desde `frontend/`, ejecutar `npx playwright test e2e/horario_formato.spec.ts`. Debe fallar al importar el módulo.
- [ ] **Step 3: Implementar** `frontend/lib/horario.ts`.
- [ ] **Step 4: Ejecutarlos y ver que pasan.** Con el mismo comando, deben pasar todos.
- [ ] **Step 5: Commit** `feat(web): schedule formatting and editing helpers`.

---

### Task 4: Editor en el panel

**Files:**
- Modify: `frontend/components/horario-disponibilidad.tsx`: se reescribe con las props `horarioInicial: Horario | null` y `onGuardado?: (h: Horario | null) => void`.
- Modify: `frontend/app/dashboard/page.tsx:670-673`: pasarle `perfilProveedor.horario`.
- Modify: `frontend/lib/api.ts:755-757, 778-780, 797-799`: cambiar los tres campos por `horario: Horario | null` en los tipos y por `horario?: Horario | null` en `actualizarPerfilProveedor`. Importar `Horario` de `./horario`.
- Test: `frontend/e2e/horario_editor.spec.ts`

**Interfaces:**
- Consumes: todo lo de `lib/horario.ts` (Task 3) y `PATCH /proveedor/me` con `{"horario": …}` (Task 2).

Comportamiento, según la spec:
- Una fila por día con `Switch` (`@/components/ui/switch`, `aria-label` igual al nombre del día).
- Cada tramo tiene dos `input type="time"` (con `aria-label` «Inicio» y «Fin»), un botón «Quitar tramo» y «+ Añadir tramo» (este se oculta al llegar a 3).
- «Copiar a los demás días» aparece en los días disponibles cuando hay más de uno.
- Los errores de `erroresHorario` aparecen bajo cada día y desactivan «Guardar horario».
- Se guarda `limpiarHorario(h)`.
- Se mantiene el texto «Esto es solo informativo para tus clientes — no bloquea ni reserva ningún hueco automáticamente.».

- [ ] **Step 1: Escribir el e2e que falla.** Usa la sesión simulada de `e2e/borrar_cuenta.spec.ts` con el rol `profesional`. Con `page.route`:
  - `**/proveedor/me`: GET da un perfil mínimo con `horario: null`; PATCH guarda el cuerpo y da 200 con el perfil.
  - El resto de llamadas a la API que haga el panel, con respuestas vacías (`[]` o `{}`) según su tipo.

  Tests:
  - `empieza sin días y guarda lunes con dos tramos`: activar el lunes (sale 17:00–21:00), cambiarlo a 09:00–13:00, añadir un tramo 15:00–20:00 y guardar. El cuerpo del PATCH es `{"horario":{"1":[{"inicio":"09:00","fin":"13:00"},{"inicio":"15:00","fin":"20:00"}]}}` y se ve «Guardado».
  - `copiar a los demás días`: con lunes y martes activos, «Copiar a los demás días» en el lunes hace que el martes muestre los tramos del lunes.
  - `un tramo al revés no deja guardar`: con 14:00–10:00 se ve el mensaje y el botón está desactivado.
- [ ] **Step 2: Ejecutarlo y ver que falla.** Ejecutar `npx playwright test e2e/horario_editor.spec.ts`. Debe fallar porque no encuentra el interruptor.
- [ ] **Step 3: Implementar** el componente, el panel y los tipos.
- [ ] **Step 4: Comprobar.** Ejecutar `npx playwright test e2e/horario_editor.spec.ts e2e/horario_formato.spec.ts` (todos deben pasar) y `npx tsc --noEmit -p .`. En TypeScript solo pueden quedar los errores de las páginas públicas (Task 5) y de los specs sin versionar.
- [ ] **Step 5: Commit** `feat(web): per-day schedule editor in the dashboard`.

---

### Task 5: Ficha pública y detalle del anuncio

**Files:**
- Modify: `frontend/app/profesores/[id]/page.tsx`: quitar `formatearDiasDisponibles` (línea 52). En la línea 146, `const horario = formatearHorario(perfil.horario)` y `tieneHorario = Boolean(horario)`. En el bloque de la línea 328, mostrar `{horario}`.
- Modify: `frontend/app/home/service/[id]/service-detail-client.tsx`: quitar `formatearDiasDisponibles` (línea 40) y los círculos de días (líneas 460-485). Mostrar «Horario habitual» con el texto de `formatearHorario(perfilProveedor.horario)`, solo si no está vacío.
- Modify: `frontend/lib/server-api.ts`, si tipa esos campos.

**Interfaces:**
- Consumes: `formatearHorario` (Task 3) y el `horario` de las respuestas públicas (Task 2).

- [ ] **Step 1: Comprobar que TypeScript falla.** Con `npx tsc --noEmit -p .`, debe haber errores de tipos en las dos páginas por `dias_disponibles`, que ya no existe.
- [ ] **Step 2: Implementar.** Este es el test que falla de esta tarea: las páginas dependen del SSR contra el backend, que en local no hay; el formato ya lo cubre Task 3.
- [ ] **Step 3: Comprobar.**
  - `npx tsc --noEmit -p .` sin errores (salvo los specs sin versionar).
  - `npx next build` correcto.
  - `npx playwright test e2e/horario_formato.spec.ts e2e/horario_editor.spec.ts e2e/borrar_cuenta.spec.ts`: todos deben pasar.
- [ ] **Step 4: Commit** `feat(web): show per-day schedule on profile and listing`.

---

## Después del plan (con el OK del usuario en cada paso)

1. Revisión final de la rama y merge a `dev`.
2. Aplicar `backend/migrations/2026-11-22_horario_por_dias.sql` en Supabase **antes** del push a `main`: el código nuevo lee `horario`. Después, comprobar en solo lectura que los 4 perfiles con horario lo tienen convertido.
3. Push a `main` y lanzar a mano el despliegue del backend (se detiene porque el push incluye `backend/migrations`).
4. Comprobar en producción que `/profesores/<id>` de los profesores con horario muestra el texto nuevo.
5. Mandar a la profesora que lo pidió el aviso de una línea (ver HANDOFF).
