import { test, expect } from "@playwright/test"

// Facebook exige una URL con instrucciones para borrar los datos (app en modo Live).
test("la política de privacidad explica cómo borrar la cuenta, también si entraste con Facebook", async ({ page }) => {
  await page.goto("/legal/privacidad#borrar-datos")
  const seccion = page.locator("#borrar-datos")
  await expect(seccion).toBeVisible()
  await expect(seccion).toContainText("Facebook")
  // Desde el 22/11 se borra uno mismo con el botón de «Mi perfil».
  await expect(seccion).toContainText("Eliminar mi cuenta")
  await expect(seccion).toContainText("Mi perfil")
  // Alternativa por correo si no se puede entrar.
  await expect(seccion).toContainText("Borrar mi cuenta")
  await expect(seccion).toContainText("soporte@habilo.es")
})

for (const ruta of ["/legal/aviso-legal", "/legal/privacidad", "/legal/terminos-y-condiciones"]) {
  test(`${ruta} usa el correo de soporte, no un correo personal`, async ({ page }) => {
    await page.goto(ruta)
    const html = await page.content()
    expect(html).not.toContain("@gmail.com")
    await expect(page.locator("main, body").first()).toContainText("soporte@habilo.es")
  })
}
