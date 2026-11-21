import { test, expect } from "@playwright/test"

// Vuelta de Google/Facebook: el backend redirige a /login?token=<jwt>.
// La página debe usar ese token (GET /usuarios/me) y llevar a un usuario nuevo,
// sin rol todavía, a elegir rol. Si el token se pierde, el usuario se queda en
// el login sin ningún mensaje (fallo visto en producción el 2026-11-21).

const USUARIO = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "nuevo@example.com",
  nombre: "Profe Nuevo",
  foto_url: null,
  telefono: null,
  telefono_verificado: null,
  ciudad: null,
  fecha_registro: "2026-11-21T15:05:57Z",
  es_admin: false,
}

test("la vuelta de Google con token lleva a un usuario nuevo a elegir rol", async ({ page }) => {
  const llamadasMe: string[] = []
  await page.route("**/usuarios/me", async (route) => {
    llamadasMe.push(route.request().headers()["authorization"] ?? "")
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(USUARIO) })
  })

  await page.goto("/login?token=jwt-de-prueba")

  await expect(page).toHaveURL(/\/select-role/, { timeout: 15_000 })
  expect(llamadasMe[0]).toBe("Bearer jwt-de-prueba")
  // El token no se queda en la barra de direcciones.
  expect(page.url()).not.toContain("jwt-de-prueba")
})

test("un token rechazado muestra un error en vez de quedarse callado", async ({ page }) => {
  await page.route("**/usuarios/me", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: '{"detail":"Token no válido"}' }),
  )

  await page.goto("/login?token=caducado")

  await expect(page.getByText("No se pudo iniciar sesión. Inténtalo de nuevo.")).toBeVisible({ timeout: 15_000 })
})
