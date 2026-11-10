import { test, expect } from "@playwright/test"

const servicioId = process.env.TEST_SERVICIO_ID

test("el servicio se renderiza en servidor y permite contactar sin cuenta", async ({ page, request }) => {
  test.skip(!servicioId, "TEST_SERVICIO_ID no configurado")

  const html = await (await request.get(`/home/service/${servicioId}`)).text()
  const detalle = await (await request.get(`http://localhost:8000/servicio/${servicioId}`)).json()
  expect(html).toContain(detalle.titulo)
  if (detalle.descripcion) {
    expect(html).toContain(detalle.descripcion.slice(0, 40))
  }

  // Estas aserciones solo pueden cumplirse si el cuerpo se renderiza en el
  // servidor: el metadata y el JSON-LD no contienen CTA, enlace ni precio.
  expect(html).toContain("Contactar profesional")
  expect(html).toContain(`href="/profesores/${detalle.proveedor_id}"`)
  expect(html).toContain("Descripción del servicio")
  expect(html).toContain(`${parseFloat(detalle.precio)}€`)

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
