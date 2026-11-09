import { test, expect } from "@playwright/test"

test("el HTML inicial de /home contiene servicios", async ({ request }) => {
  const api = await request.get("http://localhost:8000/servicio/?limit=1")
  const data = await api.json()
  test.skip(data.items.length === 0, "Backend sin servicios de prueba")

  const html = await (await request.get("/home")).text()
  expect(html).toContain(data.items[0].titulo)
  expect(html).not.toContain("Necesitamos tu ubicación")
})

test("la búsqueda por URL llega al cliente", async ({ page }) => {
  await page.goto("/home?q=matemáticas")
  await expect(page.getByPlaceholder(/busca un servicio/i)).toHaveValue("matemáticas")
})
