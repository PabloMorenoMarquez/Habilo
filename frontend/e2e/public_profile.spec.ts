import { test, expect } from "@playwright/test"

const servicioId = process.env.TEST_SERVICIO_ID

test("el perfil público responde y no expone contacto privado", async ({ page, request }) => {
  test.skip(!servicioId, "TEST_SERVICIO_ID no configurado")

  const servicio = await (await request.get(`http://localhost:8000/servicio/${servicioId}`)).json()
  const response = await page.goto(`/profesores/${servicio.proveedor_id}`)
  expect(response?.status()).toBe(200)
  await expect(page.getByRole("button", { name: /contactar/i })).toBeVisible()
  await expect(page.locator("body")).not.toContainText("mailto:")

  // El HTML sin hidratar demuestra que el CTA y el estado del perfil vienen del
  // servidor, y que no se filtran enlaces de contacto privados ni ids internos.
  const html = await (await request.get(`/profesores/${servicio.proveedor_id}`)).text()
  const perfil = await (await request.get(`http://localhost:8000/proveedor/${servicio.proveedor_id}`)).json()
  expect(html).toContain("Contactar")
  expect(html).not.toMatch(/mailto:|tel:|usuario_id/)
  if (perfil.perfil_publico) {
    expect(html).toContain(perfil.nombre_publico)
    expect(html).toContain("application/ld+json")
  } else {
    expect(html).toContain("Este profesional aún no ha activado su perfil público.")
    expect(html).toContain('content="noindex, follow"')
  }
})

test("el sitemap no incluye filtros con UUID", async ({ request }) => {
  const servicios = await (await request.get("http://localhost:8000/servicio/sitemap")).json()
  test.skip(servicios.length === 0, "Backend sin servicios de prueba")

  const xml = await (await request.get("/sitemap.xml")).text()
  expect(xml).not.toContain("?categoria=")
  expect(xml).toContain("/home/service/")
})
