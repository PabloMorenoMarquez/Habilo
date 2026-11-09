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

test("la sesión hidrata los favoritos del catálogo SSR", async ({ page, request }) => {
  const api = await request.get("http://localhost:8000/servicio/?limit=1")
  const data = await api.json()
  test.skip(data.items.length === 0, "Backend sin servicios de prueba")

  let llamadasCatalogo = 0

  await page.route("**/usuarios/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "00000000-0000-0000-0000-000000000001",
        email: "cliente-e2e@habilo.test",
        nombre: "Cliente E2E",
        foto_url: null,
        telefono: null,
        telefono_verificado: null,
        ciudad: null,
        fecha_registro: null,
      }),
    })
  )

  await page.route(/\/servicio\/\?/, (route) => {
    llamadasCatalogo += 1
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [{ ...data.items[0], es_favorito: true }],
        has_more: false,
        limit: 20,
        offset: 0,
      }),
    })
  })

  await page.addInitScript(() => {
    localStorage.setItem("token", "token-de-prueba")
    localStorage.setItem("serviclick_role", "cliente")
    localStorage.setItem("onboarding_visto_v1_cliente", "1")
  })

  await page.goto("/home")

  // El HTML SSR llega sin token (corazón vacío); el refetch autenticado
  // debe hidratar el estado real una sola vez.
  await expect(page.getByRole("button", { name: /favoritos/i }).first()).toHaveAttribute(
    "aria-pressed",
    "true"
  )
  expect(llamadasCatalogo).toBe(1)
})

test("borrar la ciudad vuelve a buscar sin filtro de ciudad", async ({ page, request }) => {
  const api = await request.get("http://localhost:8000/servicio/?limit=1")
  const data = await api.json()
  const servicio = data.items[0]
  test.skip(!servicio || !servicio.ciudad, "Backend sin servicios con ciudad")

  const urls: string[] = []

  await page.addInitScript(() => {
    localStorage.setItem("onboarding_visto_v1_cliente", "1")
  })

  await page.route(/\/servicio\/\?/, (route) => {
    const url = new URL(route.request().url())
    const conCiudad = url.searchParams.has("ciudad")
    urls.push(route.request().url())
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: conCiudad ? [servicio] : [],
        has_more: false,
        limit: 20,
        offset: 0,
      }),
    })
  })

  await page.goto(`/home?ciudad=${encodeURIComponent(servicio.ciudad)}`)
  await expect(page.getByText(`Mostrando servicios en`)).toBeVisible()

  const sinCiudadAntes = urls.filter((u) => !new URL(u).searchParams.has("ciudad")).length

  await page.getByRole("button", { name: "Cambiar" }).click()
  await page.getByRole("button", { name: /Borrar/i }).click()

  await expect(page.getByText("Mostrando todos los servicios")).toBeVisible()
  await expect
    .poll(() => urls.filter((u) => !new URL(u).searchParams.has("ciudad")).length)
    .toBeGreaterThan(sinCiudadAntes)
})
