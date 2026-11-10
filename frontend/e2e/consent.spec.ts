import { test, expect } from "@playwright/test"

test("rechazar analítica no deja cookies de PostHog", async ({ page, context }) => {
  await context.clearCookies()
  await page.goto("/")
  await page.evaluate(() => localStorage.clear())
  await page.reload()

  await expect(page.getByRole("dialog", { name: /cookies/i })).toBeVisible()
  await page.getByRole("button", { name: "Solo esenciales" }).click()
  await expect(page.getByRole("dialog", { name: /cookies/i })).toHaveCount(0)

  const cookies = await context.cookies()
  expect(cookies.some((cookie) => cookie.name.startsWith("ph_"))).toBe(false)
})

test("aceptar analítica guarda la decisión", async ({ page }) => {
  await page.goto("/")
  await page.evaluate(() => localStorage.clear())
  await page.reload()

  await page.getByRole("button", { name: "Aceptar analítica" }).click()
  const consent = await page.evaluate(() => localStorage.getItem("habilo_consent_v1"))
  expect(consent).toContain('"analytics":true')
})
