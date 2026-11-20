import { test, expect, type Page } from "@playwright/test"

// Formulario público de reseñas: la API se simula, no hace falta backend.
const CODIGO = "abc12345"
const NOMBRE = "Julia Sánchez Navarro"

interface OpcionesApi {
  getStatus?: number
  postStatus?: number
  postBody?: Record<string, unknown>
}

async function prepararApi(page: Page, opciones: OpcionesApi = {}) {
  const { getStatus = 200, postStatus = 201, postBody = { ok: true } } = opciones
  const envios: Record<string, unknown>[] = []

  await page.route(`**/resenas/${CODIGO}`, (route) => {
    const request = route.request()
    if (request.method() === "POST") {
      envios.push(request.postDataJSON())
      return route.fulfill({
        status: postStatus,
        contentType: "application/json",
        body: JSON.stringify(postBody),
      })
    }
    if (getStatus !== 200) {
      return route.fulfill({
        status: getStatus,
        contentType: "application/json",
        body: JSON.stringify({ detail: "No existe el enlace de opiniones" }),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ nombre_profesor: NOMBRE }),
    })
  })
  return envios
}

async function abrir(page: Page) {
  await page.goto(`/opina/${CODIGO}`)
  await page.getByRole("button", { name: "Solo esenciales" }).click()
}

async function rellenar(page: Page, { consentimiento = true } = {}) {
  await expect(page.getByText(`¿Qué tal las clases con ${NOMBRE}?`)).toBeVisible()
  await page.getByRole("button", { name: "5 estrellas" }).click()
  await page
    .getByLabel("Tu opinión")
    .fill("Explica muy bien y mi hija ha subido dos puntos en matemáticas.")
  await page.getByLabel(/tu nombre/i).fill("Marta G.")
  await page.getByRole("radio", { name: /madre o padre/i }).check()
  await page.getByRole("radio", { name: /de 3 a 12 meses/i }).check()
  await page.getByLabel(/email o teléfono/i).fill("marta@example.com")
  if (consentimiento) {
    await page.getByRole("checkbox", { name: /acepto que se publique/i }).check()
  }
}

test("muestra el nombre del profesor y envía la opinión", async ({ page }) => {
  const envios = await prepararApi(page)
  await abrir(page)
  await rellenar(page)
  await page.getByRole("button", { name: "Enviar opinión" }).click()

  await expect(
    page.getByText(
      `Gracias. Revisaremos tu opinión y la publicaremos en el perfil de ${NOMBRE} en unos días`
    )
  ).toBeVisible()
  expect(envios).toHaveLength(1)
  expect(envios[0]).toMatchObject({
    puntuacion: 5,
    comentario: "Explica muy bien y mi hija ha subido dos puntos en matemáticas.",
    autor_nombre: "Marta G.",
    relacion: "padre_madre",
    antiguedad: "3_12_meses",
    contacto: "marta@example.com",
    consentimiento: true,
    website: "",
  })
})

test("código inexistente", async ({ page }) => {
  await prepararApi(page, { getStatus: 404 })
  await abrir(page)
  await expect(page.getByText("Este enlace no es válido")).toBeVisible()
  await expect(page.getByRole("button", { name: "Enviar opinión" })).toHaveCount(0)
})

test("duplicado", async ({ page }) => {
  await prepararApi(page, {
    postStatus: 409,
    postBody: { detail: "Ya has dejado una opinión para este profesor. ¡Gracias!" },
  })
  await abrir(page)
  await rellenar(page)
  await page.getByRole("button", { name: "Enviar opinión" }).click()
  await expect(
    page.getByText("Ya has dejado una opinión para este profesor. ¡Gracias!")
  ).toBeVisible()
})

test("no envía sin consentimiento", async ({ page }) => {
  const envios = await prepararApi(page)
  await abrir(page)
  await rellenar(page, { consentimiento: false })
  await page.getByRole("button", { name: "Enviar opinión" }).click()

  const casilla = page.getByRole("checkbox", { name: /acepto que se publique/i })
  await expect(casilla).toHaveAttribute("aria-invalid", "true")
  await expect(page.getByText(/acepta que publiquemos tu opinión/i)).toBeVisible()
  expect(envios).toHaveLength(0)
})

test("la página no es indexable", async ({ page }) => {
  await prepararApi(page)
  await page.goto(`/opina/${CODIGO}`)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/)
})
