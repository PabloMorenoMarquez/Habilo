import { test, expect, type Page } from "@playwright/test"

// Alta de profesional con sesión simulada: no necesita backend ni tokens reales.
async function prepararAlta(page: Page, { responderCookies = true } = {}) {
  await page.route("**/usuarios/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "00000000-0000-0000-0000-000000000002",
        email: "profesor-e2e@habilo.test",
        nombre: "Profesor E2E",
        foto_url: null,
        telefono: null,
        telefono_verificado: null,
        ciudad: null,
        fecha_registro: null,
      }),
    })
  )

  const altas: Record<string, unknown>[] = []
  await page.route(/\/proveedor\/(me)?(\?.*)?$/, (route) => {
    const request = route.request()
    if (request.method() === "POST") {
      altas.push(request.postDataJSON())
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
    }
    // Sin perfil previo: la pantalla debe mostrar el formulario de alta.
    return route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Perfil no encontrado" }),
    })
  })

  await page.addInitScript(() => {
    localStorage.setItem("token", "token-de-prueba")
    localStorage.removeItem("serviclick_role")
  })

  await page.goto("/select-role")
  if (responderCookies) {
    await page.getByRole("button", { name: "Solo esenciales" }).click()
  }
  await page.getByRole("button", { name: /soy profesional/i }).click()
  await expect(page.getByRole("heading", { name: /cuéntanos sobre tu servicio/i })).toBeVisible()
  return altas
}

test("el alta pide ciudad y no crea el perfil sin ella", async ({ page }) => {
  const altas = await prepararAlta(page)

  await page.getByLabel("Descripción").fill("Doy clases de inglés")
  await page.getByRole("button", { name: "Crear mi perfil" }).click()

  await expect(page.getByText("Indica la ciudad en la que trabajas.")).toBeVisible()
  expect(altas).toHaveLength(0)
})

test("el permiso de perfil público no viene marcado", async ({ page }) => {
  await prepararAlta(page)
  await expect(page.getByLabel(/quiero un perfil público/i)).not.toBeChecked()
})

test("el alta envía ciudad, materias, niveles y el permiso elegido", async ({ page }) => {
  const altas = await prepararAlta(page)

  await page.getByLabel("Descripción").fill("Doy clases de inglés")
  await page.getByLabel("Ciudad donde trabajas").fill("  Talavera de la Reina ")
  await page.getByLabel(/materias/i).fill("Inglés, Lengua, ")
  await page.getByLabel("Niveles").fill("Primaria,ESO")
  await page.getByLabel(/quiero un perfil público/i).check()
  await page.getByRole("button", { name: "Crear mi perfil" }).click()

  await expect.poll(() => altas.length).toBe(1)
  expect(altas[0]).toMatchObject({
    descripcion: "Doy clases de inglés",
    radio_km_disponible: 10,
    ciudad: "Talavera de la Reina",
    materias: ["Inglés", "Lengua"],
    niveles: ["Primaria", "ESO"],
    perfil_publico: true,
  })
})

test("el aviso de cookies no impide enviar el alta", async ({ page }) => {
  const altas = await prepararAlta(page, { responderCookies: false })
  await expect(page.getByRole("dialog", { name: "Preferencias de cookies" })).toBeVisible()

  await page.getByLabel("Descripción").fill("Doy clases de inglés")
  await page.getByLabel("Ciudad donde trabajas").fill("Talavera de la Reina")
  // Sin timeout largo: si el aviso tapa el botón, el clic falla en vez de esperar.
  await page.getByRole("button", { name: "Crear mi perfil" }).click({ timeout: 5000 })

  await expect.poll(() => altas.length).toBe(1)
})
