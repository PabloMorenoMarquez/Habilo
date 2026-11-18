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

test("la página para profesores está en el sitemap", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text()
  expect(xml).toContain("/da-clases</loc>")
})
