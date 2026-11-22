import { test, expect, type Page } from "@playwright/test"

// Editor del horario por días en el panel del profesor. API simulada.

const USUARIO = {
  id: "22222222-2222-2222-2222-222222222222",
  email: "profe@example.com",
  nombre: "Profe Prueba",
  foto_url: null,
  telefono: null,
  telefono_verificado: null,
  ciudad: "Talavera de la Reina",
  fecha_registro: "2026-11-21T15:05:57Z",
  es_admin: false,
}

const PERFIL = {
  id: "33333333-3333-3333-3333-333333333333",
  usuario_id: USUARIO.id,
  descripcion: "Clases de guitarra",
  experiencia_años: 3,
  radio_km_disponible: 10,
  valoracion_media: "0",
  num_valoraciones: 0,
  verificado: false,
  fecha_creacion: "2026-11-21T15:05:57Z",
  horario: null,
  destacado_hasta: null,
  url_documento: null,
  motivo_rechazo: null,
  codigo_referido: "ABCD1234",
  codigo_resenas: "abcd1234",
  ciudad: "Talavera de la Reina",
  zona: null,
  materias: ["Guitarra"],
  niveles: [],
  perfil_publico: true,
  consentimiento_marketing: false,
}

async function panelSimulado(page: Page) {
  const patches: unknown[] = []
  await page.addInitScript(() => {
    localStorage.setItem("token", "jwt-de-prueba")
    localStorage.setItem("serviclick_role", "profesional")
    localStorage.setItem("onboarding_visto_v1_profesional", "1")
  })
  // Todo lo del backend local: lo que no conocemos, vacío.
  await page.route("http://localhost:8000/**", async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const json = (body: unknown) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) })
    if (url.pathname === "/usuarios/me") return json(USUARIO)
    if (url.pathname === "/proveedor/me") return json(PERFIL)
    if (url.pathname === "/proveedor/" && req.method() === "PATCH") {
      const body = req.postDataJSON()
      patches.push(body)
      return json({ ...PERFIL, ...body })
    }
    if (url.pathname.startsWith("/config")) return json({})
    if (url.pathname === "/servicio/mios" || url.pathname === "/solicitudes/conversaciones")
      return json({ items: [], total: 0, limit: 20, offset: 0 })
    return json([])
  })
  return patches
}

const fila = (page: Page, dia: string) => page.getByRole("group", { name: dia })

// Sin anuncios, el panel abre solo «Crear nuevo servicio»; se cierra para llegar al horario.
async function abrirPanel(page: Page) {
  await page.goto("/dashboard")
  await expect(page.getByRole("dialog", { name: "Crear nuevo servicio" })).toBeVisible({ timeout: 15_000 })
  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog", { name: "Crear nuevo servicio" })).toBeHidden()
  // El aviso de cookies tapa la parte de abajo de la página.
  await page.getByRole("button", { name: "Solo esenciales" }).click()
}

test("empieza sin días y guarda el lunes con dos tramos", async ({ page }) => {
  const patches = await panelSimulado(page)
  await abrirPanel(page)

  const lunes = fila(page, "Lunes")
  await expect(lunes.getByRole("switch", { name: "Lunes" })).not.toBeChecked({ timeout: 15_000 })
  await lunes.getByRole("switch", { name: "Lunes" }).click()
  await expect(lunes.getByLabel("Inicio").first()).toHaveValue("17:00")

  await lunes.getByLabel("Inicio").first().fill("09:00")
  await lunes.getByLabel("Fin").first().fill("13:00")
  await lunes.getByRole("button", { name: "+ Añadir tramo" }).click()
  await lunes.getByLabel("Inicio").nth(1).fill("15:00")
  await lunes.getByLabel("Fin").nth(1).fill("20:00")
  await page.getByRole("button", { name: "Guardar horario" }).click()

  await expect(page.getByText("Guardado", { exact: true })).toBeVisible()
  expect(patches.at(-1)).toEqual({
    horario: { "1": [{ inicio: "09:00", fin: "13:00" }, { inicio: "15:00", fin: "20:00" }] },
  })
})

test("copiar a los demás días", async ({ page }) => {
  await panelSimulado(page)
  await abrirPanel(page)

  const lunes = fila(page, "Lunes")
  const martes = fila(page, "Martes")
  await lunes.getByRole("switch", { name: "Lunes" }).click({ timeout: 15_000 })
  await lunes.getByLabel("Inicio").first().fill("09:00")
  await lunes.getByLabel("Fin").first().fill("13:00")
  await martes.getByRole("switch", { name: "Martes" }).click()
  await martes.getByLabel("Inicio").first().fill("18:00")
  await martes.getByLabel("Fin").first().fill("19:00")

  await lunes.getByRole("button", { name: "Copiar a los demás días" }).click()

  await expect(martes.getByLabel("Inicio").first()).toHaveValue("09:00")
  await expect(martes.getByLabel("Fin").first()).toHaveValue("13:00")
})

test("un tramo al revés no deja guardar", async ({ page }) => {
  const patches = await panelSimulado(page)
  await abrirPanel(page)

  const lunes = fila(page, "Lunes")
  await lunes.getByRole("switch", { name: "Lunes" }).click({ timeout: 15_000 })
  await lunes.getByLabel("Inicio").first().fill("14:00")
  await lunes.getByLabel("Fin").first().fill("10:00")

  await expect(lunes.getByText("La hora de fin debe ser posterior a la de inicio")).toBeVisible()
  await expect(page.getByRole("button", { name: "Guardar horario" })).toBeDisabled()
  expect(patches).toHaveLength(0)
})
