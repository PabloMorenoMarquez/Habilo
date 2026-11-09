import { test, expect } from "@playwright/test"

const H1 = "Clases particulares en Talavera de la Reina, con profesores reales"

test("la portada es pública y muestra la propuesta de valor", async ({ page }) => {
  await page.goto("/")
  await expect(
    page.getByRole("heading", {
      name: "Clases particulares en Talavera de la Reina, con profesores reales",
    })
  ).toBeVisible()
  await expect(page.getByRole("button", { name: "Buscar profesor" })).toBeVisible()
  await expect(page.getByText("Bienvenido de nuevo")).toHaveCount(0)
})

test("el token en portada se manda a /login", async ({ page }) => {
  await page.goto("/?token=abc123")
  await expect(page).toHaveURL(/\/login\?token=abc123/)
})

test("el buscador lleva la consulta a /home", async ({ page }) => {
  await page.goto("/")
  await page.getByLabel("Materia o servicio").fill("matemáticas")
  await page.getByRole("button", { name: "Buscar profesor" }).click()
  await expect(page).toHaveURL(/\/home\?q=matem%C3%A1ticas/)
})

test("el manifest usa los iconos existentes", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest")
  const body = await response.text()
  expect(body).not.toContain("/icons/")
})

test("la landing conserva la atribución por ref sin redirigir", async ({ page }) => {
  await page.goto("/?ref=CODIGO123")
  await expect(page.getByRole("heading", { name: H1 })).toBeVisible()
  await expect(page).not.toHaveURL(/\/login/)

  const stored = await page.evaluate(() => sessionStorage.getItem("habilo_utm_v1"))
  expect(stored).toContain('"ref":"CODIGO123"')
})

test("el token con ref conserva ambos parámetros en /login", async ({ page }) => {
  await page.goto("/?token=abc123&ref=CODIGO123")
  await expect(page).toHaveURL(/\/login\?token=abc123&ref=CODIGO123/)
})
