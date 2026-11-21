import { test, expect } from "@playwright/test"

// Facebook exige una URL con instrucciones para borrar los datos (app en modo Live).
test("la política de privacidad explica cómo borrar la cuenta, también si entraste con Facebook", async ({ page }) => {
  await page.goto("/legal/privacidad#borrar-datos")
  const seccion = page.locator("#borrar-datos")
  await expect(seccion).toBeVisible()
  await expect(seccion).toContainText("Facebook")
  await expect(seccion).toContainText("Borrar mi cuenta")
})
