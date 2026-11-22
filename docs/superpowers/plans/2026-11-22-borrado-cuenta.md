# Borrado completo de cuenta: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un usuario pueda borrar su cuenta desde «Mi perfil», y que el admin la borre con el mismo proceso. El borrado es total si no hay historial con otras personas y, si lo hay, se anonimiza a fondo.

**Architecture:** Un repositorio (`BorradoCuentaRepository`) hace en una sola transacción el SQL de cada rama. Dos funciones nuevas de `utils/storage.py` listan y borran carpetas de Supabase Storage. Un servicio (`BorradoCuentaService`) decide la rama, borra los archivos antes de tocar la BD y lo usan los dos endpoints. En la web, una tarjeta en `/profile` con un `AlertDialog` y un aviso en la portada.

**Tech Stack:** FastAPI + SQLAlchemy 2 (`SessionLocal`), Supabase Storage (`supabase-py`), pytest (`asyncio_mode = auto`), Next.js (App Router) + shadcn/ui, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-22-borrado-cuenta-design.md`

## Global Constraints

- Rama de trabajo: `feat/borrado-cuenta`, creada desde `dev`. No hacer push a `main` sin el OK explícito del usuario.
- Nada de datos personales en commits: el repo es público.
- Correo anonimizado: `eliminado-<usuario_id>@habilo.invalid`; nombre anonimizado: `Usuario eliminado`.
- Buckets: `Config.STORAGE_BUCKET_SERVICIOS` (carpetas `{perfil_id}` y `avatares/{usuario_id}`) y `Config.STORAGE_BUCKET_DOCUMENTOS` (carpeta `{usuario_id}`).
- Los resultados posibles son exactamente `"borrada"` y `"anonimizada"`.
- Errores HTTP con `HTTPException` y `detail` en español, como en `services/user_service.py`.
- Tests del backend desde `backend/`: `.venv/Scripts/python -m pytest …`. Tests e2e desde `frontend/`: `npx playwright test …`.
- Todo cambio de la web se comprueba también con `npx next build && npx next start -p 3100` (regla del proyecto).

## Review Focus

1. **Usuario sin perfil de profesor** (solo familia): con `perfil_id=None` y `servicio_ids=[]`, no puede listar la carpeta `"None"` ni fallar con un `IN ()` vacío. → test `test_borrado_total_cliente_sin_perfil` (Task 2) y `test_sin_perfil_no_lista_carpeta_de_perfil` (Task 3).
2. **Storage vacío o carpetas que no existen**: `list` devuelve `[]` y no hay que llamar a `remove`, ni dar error. → `test_carpeta_vacia_no_llama_a_remove` (Task 1).
3. **Storage falla a mitad**: la BD no se toca, la respuesta es un 502 y se puede reintentar. → `test_si_storage_falla_no_toca_la_bd` (Task 3).
4. **Vuelve a entrar con Google tras borrarse**: no debe recuperar la cuenta vieja. En el borrado total la fila desaparece; en la anonimización el correo cambia. → aserción del correo en `test_anonimiza_con_historial` (Task 2).
5. **Historial solo por el lado del profesor** (una familia pidió una clase en su anuncio, pero él nunca escribió): tiene que anonimizar, no borrar, porque si no `solicitudes` se quedaría con filas huérfanas. → `test_solicitud_en_su_anuncio_cuenta_como_historial` (Task 2).

---

### Task 1: Listar y borrar carpetas de Storage

**Files:**
- Modify: `backend/utils/storage.py` (añadir al final)
- Test: `backend/tests/test_storage_borrado.py`

**Interfaces:**
- Produces:
  - `async def listar_archivos(bucket: str, prefijo: str) -> list[str]`: devuelve las rutas completas de los objetos bajo `prefijo/`, de forma recursiva. Un elemento con `id is None` es una carpeta y hay que entrar en ella. Pide `{"limit": 1000}`.
  - `async def eliminar_archivos(bucket: str, rutas: list[str]) -> None`: no hace nada si `rutas` está vacía. Si no, llama a `remove(rutas)` y **relanza** la excepción si falla (a diferencia de `eliminar_archivo`, que se la traga). Ambas usan `run_in_threadpool` y `_retry_storage`.

- [ ] **Step 1: Escribir los tests que fallan** con `patch("utils.storage.get_supabase")` y un `MagicMock` donde `client.storage.from_.return_value` es el bucket simulado:

```python
async def test_lista_recursiva_entra_en_subcarpetas():
    # bucket.list("p1") -> [{"name": "s1", "id": None}]; bucket.list("p1/s1") -> [{"name": "imagen", "id": "x"}]
    assert await listar_archivos("servicios", "p1") == ["p1/s1/imagen"]

async def test_carpeta_vacia_no_llama_a_remove():
    await eliminar_archivos("servicios", [])
    bucket.remove.assert_not_called()

async def test_eliminar_archivos_relanza_el_error():
    bucket.remove.side_effect = RuntimeError("caído")
    with pytest.raises(RuntimeError):
        await eliminar_archivos("servicios", ["p1/s1/imagen"])
```

Para que el tercer test sea rápido, `_retry_storage` reintenta 3 veces con una espera de 0,3 s como mucho; se acepta tal cual.

- [ ] **Step 2: Ejecutarlos y ver que fallan.** Ejecutar `.venv/Scripts/python -m pytest tests/test_storage_borrado.py`. Debe dar `ImportError` en `listar_archivos`.
- [ ] **Step 3: Implementar las dos funciones** en `backend/utils/storage.py`.
- [ ] **Step 4: Ejecutarlos y ver que pasan.** Con el mismo comando, deben pasar los 3.
- [ ] **Step 5: Commit** `feat(storage): list and delete whole folders for account deletion`.

---

### Task 2: Repositorio de borrado (SQL de las dos ramas)

**Files:**
- Create: `backend/repositories/borrado_cuenta_repository.py`
- Test: `backend/tests/integration/test_borrado_cuenta.py`

**Interfaces:**
- Produces:

```python
@dataclass(frozen=True)
class DatosCuenta:
    usuario_id: UUID
    es_admin: bool
    perfil_id: UUID | None
    servicio_ids: list[UUID]

class BorradoCuentaRepository:
    def datos(self, usuario_id: UUID) -> DatosCuenta | None
    def tiene_historial_compartido(self, d: DatosCuenta) -> bool
    def borrar_todo(self, d: DatosCuenta) -> None
    def anonimizar(self, d: DatosCuenta) -> None
```

- Cada método abre su propia `SessionLocal()`. `borrar_todo` y `anonimizar` hacen un único `commit` al final, hacen `rollback` si hay cualquier excepción y la relanzan (patrón de `repositories/user_repository.py`).
- Las condiciones sobre `perfil_id` y `servicio_ids` se saltan si son `None` o están vacías. Nunca se genera `IN ()`.
- `tiene_historial_compartido` sigue la definición de la spec, con un `exists()` por tabla.
- `borrar_todo` borra en el orden exacto de la spec. `anonimizar` aplica los valores exactos de la spec. El `codigo_referido` nuevo se genera como en `repositories/proveedor_repository.py:44`.

- [ ] **Step 1: Escribir los tests de integración que fallan.** Usan el fixture `Session` del `conftest.py` de integración, no `seed_data`, que está desfasado: no rellena `codigo_referido`, que es obligatorio. Cada test crea sus filas con correos únicos (`uuid4().hex`), hace `commit` y no depende de los demás.

```python
def test_borrado_total_profesor(Session):
    # usuario + perfil + 1 servicio + 1 imagen + 1 lead + 1 resena_alumno + 1 favorito de OTRO usuario a su servicio
    # + 1 referido en el que es referidor + 1 bloqueo hacia otro + 1 suscripcion_push + 1 feedback
    repo.borrar_todo(repo.datos(uid))
    # assert: 0 filas de cada tabla para esos ids; el OTRO usuario sigue existiendo

def test_borrado_total_cliente_sin_perfil(Session):
    d = repo.datos(uid_cliente)
    assert d.perfil_id is None and d.servicio_ids == []
    repo.borrar_todo(d)
    # assert: usuario desaparecido

def test_sin_historial_no_es_compartido(Session):
    assert repo.tiene_historial_compartido(repo.datos(uid)) is False

def test_solicitud_en_su_anuncio_cuenta_como_historial(Session):
    # OTRO usuario es cliente_id de una solicitud sobre el servicio del profesor
    assert repo.tiene_historial_compartido(repo.datos(uid_profesor)) is True

def test_anonimiza_con_historial(Session):
    repo.anonimizar(repo.datos(uid_profesor))
    # usuario: email == f"eliminado-{uid}@habilo.invalid", nombre == "Usuario eliminado", foto_url/telefono/ciudad None,
    #          cuenta_eliminada is True, fecha_eliminacion is not None
    # perfil: perfil_publico False, descripcion None, materias == [], codigo_resenas None, codigo_referido != el anterior
    # servicio: sigue existiendo, activo False, ubicacion None, imagen_url None
    # imagenes_servicio, leads, resenas_alumnos, favoritos: 0 filas; la solicitud sigue existiendo
```

- [ ] **Step 2: Arrancar PostGIS y ver que los tests fallan.** Desde `backend/`, ejecutar `docker compose -f docker-compose.test.yml up -d` y después `TEST_DATABASE_URL=postgresql://test:test@localhost:5433/serviclick_test .venv/Scripts/python -m pytest tests/integration/test_borrado_cuenta.py`. Deben fallar con `ModuleNotFoundError: repositories.borrado_cuenta_repository`. Si Docker Desktop no está abierto, pedir al usuario que lo abra; no saltarse este paso.
- [ ] **Step 3: Implementar `BorradoCuentaRepository`** en `backend/repositories/borrado_cuenta_repository.py`.
- [ ] **Step 4: Ejecutar los tests y ver que pasan.** Con el mismo comando, deben pasar los 5. Después, parar el contenedor con `docker compose -f docker-compose.test.yml down`.
- [ ] **Step 5: Commit** `feat(accounts): repository for full deletion and deep anonymization`.

---

### Task 3: Servicio de borrado

**Files:**
- Create: `backend/services/borrado_cuenta_service.py`
- Test: `backend/tests/test_borrado_cuenta_service.py`

**Interfaces:**
- Consumes: `BorradoCuentaRepository` y `DatosCuenta` (Task 2); `listar_archivos` y `eliminar_archivos` (Task 1); `SolicitudRepository().listar_activas_de_usuario` y `SolicitudService().cancelar_por_sistema(solicitud_id, motivo="cuenta eliminada")`, que ya existen.
- Produces: `class BorradoCuentaService` con `self.repo` en `__init__` y
  `async def borrar(self, usuario_id: UUID, admin_id: UUID | None = None) -> Literal["borrada", "anonimizada"]`.

Reglas, en este orden:

1. Si `repo.datos` devuelve `None`, `HTTPException(404, "No existe este usuario")`.
2. Si `admin_id` coincide con `usuario_id`, `400 "No puedes eliminarte a ti mismo"`.
3. Si `d.es_admin`, `400 "No se puede eliminar una cuenta de administrador"`.
4. Calcular `compartido = repo.tiene_historial_compartido(d)`.
5. Si `compartido`, cancelar las solicitudes activas.
6. Storage: listar las tres carpetas de la spec (la de `perfil_id` solo si no es `None`) y llamar a `eliminar_archivos` una vez por bucket. Cualquier excepción se convierte en `HTTPException(502, "No se pudieron borrar tus archivos. Inténtalo de nuevo.")`, **sin** llamar a `borrar_todo` ni a `anonimizar`.
7. Llamar a `repo.anonimizar(d)` y devolver `"anonimizada"`, o a `repo.borrar_todo(d)` y devolver `"borrada"`.

- [ ] **Step 1: Escribir los tests que fallan.** Usar el patrón `BorradoCuentaService.__new__` con `svc.repo = MagicMock()`, como en `tests/test_referidos.py`, y parchear `services.borrado_cuenta_service.listar_archivos`/`eliminar_archivos` con `AsyncMock`. Tests:
  - `test_sin_historial_borra_todo`: devuelve `"borrada"`; `borrar_todo` se llama una vez y `anonimizar` no.
  - `test_con_historial_anonimiza_y_cancela_solicitudes`: devuelve `"anonimizada"` y llama a `cancelar_por_sistema` por cada solicitud activa (parchear `SolicitudRepository` y `SolicitudService`).
  - `test_no_borra_admin`: 400 y ni Storage ni el repositorio se tocan.
  - `test_admin_no_se_borra_a_si_mismo`: 400.
  - `test_usuario_inexistente_404`.
  - `test_borra_las_tres_carpetas`: `listar_archivos` recibe `(SERVICIOS, str(perfil_id))`, `(SERVICIOS, f"avatares/{uid}")` y `(DOCUMENTOS, str(uid))`.
  - `test_sin_perfil_no_lista_carpeta_de_perfil`: con `perfil_id=None`, solo se listan 2 carpetas.
  - `test_si_storage_falla_no_toca_la_bd`: si `eliminar_archivos` lanza un error, da 502 y ni `borrar_todo` ni `anonimizar` se llaman.
- [ ] **Step 2: Ejecutarlos y ver que fallan.** Ejecutar `.venv/Scripts/python -m pytest tests/test_borrado_cuenta_service.py`. Debe dar `ModuleNotFoundError`.
- [ ] **Step 3: Implementar `BorradoCuentaService.borrar`** en `backend/services/borrado_cuenta_service.py`.
- [ ] **Step 4: Ejecutarlos y ver que pasan.** Con el mismo comando, deben pasar los 8.
- [ ] **Step 5: Commit** `feat(accounts): deletion service shared by user and admin`.

---

### Task 4: Endpoints y retirada de la anonimización vieja

**Files:**
- Modify: `backend/routers/usuarios.py`: añadir `DELETE /usuarios/me`.
- Modify: `backend/routers/admin.py:90-93`: usar el servicio nuevo.
- Modify: `backend/schemas/usuario_schema.py`: añadir `BorradoCuentaOut`.
- Modify: `backend/services/user_service.py`: borrar `eliminar_cuenta`.
- Modify: `backend/repositories/user_repository.py`: borrar `eliminar`.
- Test: `backend/tests/test_borrado_cuenta_router.py`

**Interfaces:**
- Consumes: `BorradoCuentaService().borrar` (Task 3).
- Produces:
  - `class BorradoCuentaOut(BaseModel): resultado: Literal["borrada", "anonimizada"]`;
  - `DELETE /usuarios/me`, con `@limiter.limit("3/minute")`, que devuelve 200 y `{"resultado": …}` llamando a `borrar(current_user["user_id"])`;
  - `PATCH /admin/usuarios/{usuario_id}/eliminar`, que devuelve 200 y `BorradoCuentaOut` llamando a `borrar(usuario_id, admin_id=current_admin["user_id"])`.

- [ ] **Step 1: Escribir los tests que fallan,** siguiendo el patrón de `tests/test_lead_router.py`: una app mínima con `limiter`, `app.dependency_overrides[get_current_user]` y `patch("routers.usuarios.BorradoCuentaService")` con `borrar = AsyncMock(return_value="borrada")`:
  - `test_delete_me_borra_al_usuario_del_token`: 200 y `{"resultado": "borrada"}`, con `borrar` llamado con el `user_id` del token.
  - `test_admin_eliminar_usa_el_servicio_nuevo`: con `get_current_admin` sustituido, `borrar` se llama con `admin_id=` el del admin.
- [ ] **Step 2: Ejecutarlos y ver que fallan.** Ejecutar `.venv/Scripts/python -m pytest tests/test_borrado_cuenta_router.py`. Debe dar 405 o un `AttributeError`.
- [ ] **Step 3: Implementar los endpoints** y borrar `UserService.eliminar_cuenta` y `UserRepository.eliminar`. Con `grep -rn "eliminar_cuenta\|user_repository.eliminar\|\.eliminar(usuario_id" backend --include=*.py` (excluyendo `.venv`), comprobar que no queda nadie que los use.
- [ ] **Step 4: Ejecutar toda la suite del backend.** Ejecutar `.venv/Scripts/python -m pytest tests --ignore=tests/integration`. Todo debe pasar.
- [ ] **Step 5: Commit** `feat(accounts): DELETE /usuarios/me and admin deletion through the new service`.

---

### Task 5: Web: «Eliminar mi cuenta», aviso en la portada y texto del admin

**Files:**
- Modify: `frontend/lib/api.ts`: añadir `borrarMiCuenta`; cambiar el tipo de `eliminarCuentaAdmin` (línea 579).
- Modify: `frontend/app/profile/page.tsx`: tarjeta nueva al final de `<main>`, después de «Usuarios bloqueados».
- Modify: `frontend/app/page.tsx`: leer `cuenta` de `searchParams` (líneas 70-75) y mostrar el aviso.
- Modify: `frontend/app/admin/usuarios/page.tsx:83-85`: texto de confirmación.
- Test: `frontend/e2e/borrar_cuenta.spec.ts`

**Interfaces:**
- Consumes: `DELETE /usuarios/me` y `{ resultado: "borrada" | "anonimizada" }` (Task 4).
- Produces: `export function borrarMiCuenta(): Promise<{ resultado: "borrada" | "anonimizada" }>`, que usa `apiFetch("/usuarios/me", { method: "DELETE" })`. `eliminarCuentaAdmin` pasa a devolver el mismo tipo.

Textos exactos:

| Dónde | Texto |
| --- | --- |
| Título de la tarjeta | `Eliminar mi cuenta` |
| Texto de la tarjeta | `Borra tu cuenta, tu perfil y tus anuncios. No se puede deshacer.` |
| Botón (variante `destructive`) | `Eliminar mi cuenta` |
| Título del diálogo (`AlertDialog`) | `¿Eliminar tu cuenta?` |
| Cuerpo del diálogo | `Esto borra tu cuenta, tu perfil y tus anuncios. No se puede deshacer. Si vuelves a entrar con Google, se creará una cuenta nueva.` |
| Botones del diálogo | `Cancelar` / `Sí, eliminar mi cuenta` (desactivado y con `Eliminando…` mientras espera) |
| Error en el diálogo | el `message` del `ApiError`, o `No se pudo eliminar la cuenta. Inténtalo de nuevo.` |
| Aviso en la portada (`?cuenta=eliminada`, `role="status"`) | `Tu cuenta se ha eliminado. Gracias por haber usado Habilo.` |
| Confirmación del admin | `¿Seguro que quieres eliminar la cuenta de ${u.nombre} (${u.email})? Es irreversible. Si no tiene historial con otros usuarios se borra por completo; si lo tiene, se anonimiza y se cancelan sus solicitudes activas.` |

Al terminar con éxito: `captureIfConsented("account_deleted")`, después `logout()` y después `router.replace("/?cuenta=eliminada")`.

- [ ] **Step 1: Escribir el e2e que falla.** Hacer una sesión simulada con `page.addInitScript`, que ponga `localStorage` `token="jwt-de-prueba"` y `serviclick_role="cliente"`, y `page.route` para `**/usuarios/me` (GET da el usuario de `e2e/login_token.spec.ts`; DELETE da `{"resultado":"borrada"}` y se guarda que ocurrió) y `**/usuarios/bloqueados` (`[]`). Si la página llama a más endpoints, simularlos con respuestas vacías.

```ts
test("borrar la cuenta pide confirmación, llama a la API y deja en la portada con aviso", async ({ page }) => {
  await page.goto("/profile")
  await page.getByRole("button", { name: "Eliminar mi cuenta" }).click()
  await expect(page.getByText("Si vuelves a entrar con Google, se creará una cuenta nueva.")).toBeVisible()
  await page.getByRole("button", { name: "Sí, eliminar mi cuenta" }).click()
  await expect(page).toHaveURL(/\/\?cuenta=eliminada/)
  await expect(page.getByRole("status")).toHaveText("Tu cuenta se ha eliminado. Gracias por haber usado Habilo.")
  expect(borrado).toBe(true)
  expect(await page.evaluate(() => localStorage.getItem("token"))).toBeNull()
})

test("cancelar no borra nada", async ({ page }) => { /* Cancelar → borrado sigue false y la URL sigue en /profile */ })

test("si la API falla se muestra el error y no se cierra la sesión", async ({ page }) => {
  /* DELETE → 502 {"detail":"No se pudieron borrar tus archivos. Inténtalo de nuevo."}; ese texto visible; token sigue */
})
```

- [ ] **Step 2: Ejecutarlo y ver que falla.** Ejecutar `npx playwright test e2e/borrar_cuenta.spec.ts`. Debe fallar porque no encuentra el botón.
- [ ] **Step 3: Implementar** la función de la API, la tarjeta con `@/components/ui/alert-dialog`, el aviso en la portada y el texto del admin.
- [ ] **Step 4: Ejecutar los e2e y ver que pasan.** Primero el nuevo; luego, con `npx playwright test`, el resto de la suite (deben pasar todos menos los que ya fallaban, `error_cases` y `happy_path`, que no están versionados).
- [ ] **Step 5: Comprobar en modo producción.** Ejecutar `npx next build && npx next start -p 3100` y repetir el e2e nuevo contra el puerto 3100 (`PLAYWRIGHT_BASE_URL` o `--config` según `playwright.config.ts`). También hay que hacer una captura de la tarjeta y del diálogo con Playwright y mirarla.
- [ ] **Step 6: Commit** `feat(web): delete my account from the profile page`.

---

## Después del plan (no es una tarea de código)

- Revisión final de la rama y, con el OK del usuario, merge a `dev` y luego a `main`. El backend se despliega solo por GitHub Actions; la web, por Vercel.
- Prueba real en producción **solo con el OK del usuario**: crear una cuenta de prueba (Google), publicar un anuncio con foto y borrarla desde «Mi perfil». Comprobar en la BD que no queda ninguna fila y en Storage que no queda ningún archivo.
