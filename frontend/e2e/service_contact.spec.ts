import { test, expect } from "@playwright/test"

const servicioId = process.env.TEST_SERVICIO_ID

test("un visitante anónimo contacta sin crear cuenta", async ({ page }) => {
  test.skip(!servicioId, "TEST_SERVICIO_ID no configurado")

  await page.route("**/leads/", (route) =>
    route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true }) })
  )
  await page.goto(`/home/service/${servicioId}`)
  await page.getByRole("button", { name: /contactar profesional/i }).click()
  await page.getByLabel("Nombre").fill("Ana")
  await page.getByLabel("WhatsApp o email").fill("+34600111222")
  await page.getByLabel("Mensaje").fill("Necesito clases de matemáticas para ESO")
  await page.getByLabel(/acepto que el profesional reciba mis datos/i).check()
  await page.getByRole("button", { name: "Enviar mensaje" }).click()
  await expect(page.getByText(/mensaje enviado/i)).toBeVisible()
})
