import { test, expect } from "@playwright/test"
import { loginAs } from "./helpers/auth"

test("el profesor ve los ajustes de perfil público", async ({ page }) => {
  test.skip(!process.env.PROVEEDOR_TOKEN, "PROVEEDOR_TOKEN no configurado")
  await loginAs(page, "proveedor", "/dashboard")
  await expect(page.getByText("Perfil público", { exact: true })).toBeVisible()
  await expect(
    page.getByLabel(/acepto publicar mi nombre, foto, ciudad y precio/i)
  ).toBeVisible()
})
