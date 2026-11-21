import { test, expect } from "@playwright/test"

test("la página para profesores explica la oferta y es indexable", async ({ page }) => {
  const response = await page.goto("/da-clases")
  expect(response?.status()).toBe(200)

  await expect(
    page.getByRole("heading", { level: 1, name: "Da clases particulares en Talavera de la Reina" })
  ).toBeVisible()
  await expect(page.getByText("Gratis y sin comisión")).toBeVisible()

  const canonical = await page.locator('link[rel="canonical"]').getAttribute("href")
  expect(canonical).toMatch(/\/da-clases$/)
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0)
})

test("el botón de la página para profesores lleva al alta", async ({ page }) => {
  await page.goto("/da-clases")
  await page.getByRole("button", { name: "Solo esenciales" }).click()
  await page.getByRole("button", { name: "Crear mi perfil gratis" }).first().click()
  await expect(page).toHaveURL(/\/login/)
})

test("«Soy profesor» de la portada lleva a la página para profesores", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "Solo esenciales" }).click()
  await page.getByRole("link", { name: "Soy profesor" }).first().click()
  await expect(page).toHaveURL(/\/da-clases$/)
})

for (const width of [320, 360, 390]) {
  test(`en un móvil de ${width} px, «Soy profesor» se ve arriba en la portada`, async ({ page }) => {
    // Los profesores que llegan de Wallapop entran por «habilo.es» a secas desde el móvil.
    await page.setViewportSize({ width, height: 740 })
    await page.goto("/")
    const header = page.locator("header").first()
    const soyProfesor = header.getByRole("link", { name: "Soy profesor" })
    const login = header.getByRole("link", { name: "Iniciar sesión" })
    await expect(soyProfesor).toBeVisible()
    await expect(login).toBeVisible()

    // Sin desbordar: nada se sale de la pantalla y los botones no se pisan.
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(width)
    const a = (await soyProfesor.boundingBox())!
    const b = (await login.boundingBox())!
    expect(a.x + a.width).toBeLessThanOrEqual(b.x)
    expect(b.x + b.width).toBeLessThanOrEqual(width)
    expect(a.height).toBeLessThanOrEqual(40)
  })
}

test("la página para profesores está en el sitemap", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text()
  expect(xml).toContain("/da-clases</loc>")
})

test("habilo.es/w lleva a la página para profesores con la UTM de Wallapop", async ({ request }) => {
  // Wallapop bloquea enlaces con https:// en el chat; se escribe «habilo.es/w».
  const response = await request.get("/w", { maxRedirects: 0 })
  expect(response.status()).toBe(307)
  const destino = new URL(response.headers()["location"], "http://localhost:3000")
  expect(destino.pathname).toBe("/da-clases")
  expect(destino.searchParams.get("utm_source")).toBe("wallapop")
  expect(destino.searchParams.get("utm_medium")).toBe("dm")
  expect(destino.searchParams.get("utm_campaign")).toBe("captacion-profesores")
})

for (const [ruta, fuente] of [["/wa", "wallapop"], ["/m", "milanuncios"]] as const) {
  test(`habilo.es${ruta} (anuncio propio) lleva a /da-clases con la UTM de ${fuente}`, async ({ request }) => {
    const response = await request.get(ruta, { maxRedirects: 0 })
    expect(response.status()).toBe(307)
    const destino = new URL(response.headers()["location"], "http://localhost:3000")
    expect(destino.pathname).toBe("/da-clases")
    expect(destino.searchParams.get("utm_source")).toBe(fuente)
    expect(destino.searchParams.get("utm_medium")).toBe("anuncio")
    expect(destino.searchParams.get("utm_campaign")).toBe("captacion-profesores")
  })
}
