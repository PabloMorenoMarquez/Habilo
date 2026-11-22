import { test, expect, type Page } from "@playwright/test"

// «Eliminar mi cuenta» en Mi perfil: pide confirmación, llama a DELETE /usuarios/me,
// cierra la sesión y lleva a la portada con un aviso. La API está simulada.

const USUARIO = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "familia@example.com",
  nombre: "Familia Prueba",
  foto_url: null,
  telefono: null,
  telefono_verificado: null,
  ciudad: null,
  fecha_registro: "2026-11-21T15:05:57Z",
  es_admin: false,
}

async function sesionSimulada(page: Page, respuestaDelete: { status: number; body: unknown }) {
  const estado = { borrado: false }
  await page.addInitScript(() => {
    // Solo la primera carga: tras borrar, la portada no debe recuperar la sesión.
    if (sessionStorage.getItem("e2e-sesion")) return
    sessionStorage.setItem("e2e-sesion", "1")
    localStorage.setItem("token", "jwt-de-prueba")
    localStorage.setItem("serviclick_role", "cliente")
  })
  await page.route("**/usuarios/me", async (route) => {
    if (route.request().method() === "DELETE") {
      estado.borrado = true
      await route.fulfill({
        status: respuestaDelete.status,
        contentType: "application/json",
        body: JSON.stringify(respuestaDelete.body),
      })
      return
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(USUARIO) })
  })
  await page.route("**/usuarios/bloqueados", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  )
  return estado
}

test("borrar la cuenta pide confirmación, llama a la API y deja en la portada con aviso", async ({ page }) => {
  const estado = await sesionSimulada(page, { status: 200, body: { resultado: "borrada" } })

  await page.goto("/profile")
  await page.getByRole("button", { name: "Eliminar mi cuenta" }).click()
  await expect(page.getByText("Si vuelves a entrar con Google, se creará una cuenta nueva.")).toBeVisible()
  await page.getByRole("button", { name: "Sí, eliminar mi cuenta" }).click()

  await expect(page).toHaveURL(/\/\?cuenta=eliminada/, { timeout: 15_000 })
  await expect(page.getByRole("status")).toHaveText("Tu cuenta se ha eliminado. Gracias por haber usado Habilo.")
  expect(estado.borrado).toBe(true)
  expect(await page.evaluate(() => localStorage.getItem("token"))).toBeNull()
})

test("cancelar no borra nada", async ({ page }) => {
  const estado = await sesionSimulada(page, { status: 200, body: { resultado: "borrada" } })

  await page.goto("/profile")
  await page.getByRole("button", { name: "Eliminar mi cuenta" }).click()
  await page.getByRole("button", { name: "Cancelar" }).click()

  await expect(page.getByRole("alertdialog")).toBeHidden()
  expect(estado.borrado).toBe(false)
  await expect(page).toHaveURL(/\/profile$/)
})

test("si la API falla se muestra el error y no se cierra la sesión", async ({ page }) => {
  const detalle = "No se pudieron borrar tus archivos. Inténtalo de nuevo."
  await sesionSimulada(page, { status: 502, body: { detail: detalle } })

  await page.goto("/profile")
  await page.getByRole("button", { name: "Eliminar mi cuenta" }).click()
  await page.getByRole("button", { name: "Sí, eliminar mi cuenta" }).click()

  await expect(page.getByRole("alertdialog").getByText(detalle)).toBeVisible()
  await expect(page).toHaveURL(/\/profile$/)
  expect(await page.evaluate(() => localStorage.getItem("token"))).toBe("jwt-de-prueba")
})
