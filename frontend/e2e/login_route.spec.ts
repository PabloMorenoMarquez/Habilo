import { test, expect } from "@playwright/test"

test("login vive en /login", async ({ page }) => {
  await page.goto("/login")
  await expect(page.getByRole("heading", { name: /bienvenido de nuevo/i })).toBeVisible()
})

test("/ con token redirige a /login", async ({ page }) => {
  await page.goto("/?token=abc123")
  await expect(page).toHaveURL(/\/login\?token=abc123/)
})

test("home anónimo muestra iniciar sesión", async ({ page }) => {
  // El onboarding de primera visita abre un diálogo modal que oculta el navbar
  // al árbol de accesibilidad. Simulamos una visita ya vista.
  await page.addInitScript(() => {
    localStorage.setItem("onboarding_visto_v1_cliente", "1")
  })
  await page.goto("/home")
  await expect(page.getByRole("link", { name: "Iniciar sesión" })).toBeVisible()
})

test("/ con ref muestra la landing y conserva la atribución", async ({ page }) => {
  await page.goto("/?ref=ABC123")
  await expect(page.getByRole("heading", { name: /clases particulares en talavera/i })).toBeVisible()
  await expect(page).not.toHaveURL(/\/login/)
})

test("/ con token y ref conserva ambos parámetros", async ({ page }) => {
  await page.goto("/?token=abc123&ref=ABC123")
  await expect(page).toHaveURL(/\/login\?token=abc123&ref=ABC123/)
})
