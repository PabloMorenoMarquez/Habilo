import { test, expect } from "@playwright/test"

// Invitaciones entre profesores: el enlace lleva ?ref=<código>. El código tiene que
// llegar al alta (select-role lo lee de localStorage) aunque el invitado navegue
// por la web antes de registrarse; si no, quien invita nunca recibe su recompensa.

const codigoGuardado = (page: import("@playwright/test").Page) =>
  page.evaluate(() => localStorage.getItem("habilo_referido_codigo"))

test("el código de invitación sobrevive de la portada al login", async ({ page }) => {
  await page.goto("/?ref=ABC123")
  await page.getByRole("button", { name: "Solo esenciales" }).click()
  await page.getByRole("link", { name: "Soy profesor" }).first().click()
  await expect(page).toHaveURL(/\/da-clases/)
  await page.getByRole("button", { name: "Crear mi perfil gratis" }).first().click()
  await expect(page).toHaveURL(/\/login/)

  expect(await codigoGuardado(page)).toBe("ABC123")
})

test("entrar por /da-clases?ref= guarda el código", async ({ page }) => {
  await page.goto("/da-clases?ref=XYZ789")
  await expect.poll(() => codigoGuardado(page)).toBe("XYZ789")
})
