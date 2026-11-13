import { test, expect } from "@playwright/test"

test("el índice lista los dos posts y es indexable", async ({ page }) => {
  await page.goto("/blog")

  await expect(
    page.getByRole("heading", { level: 1, name: /clases particulares en talavera/i })
  ).toBeVisible()

  const enlaces = page.locator('a[href^="/blog/"]')
  const hrefs = await enlaces.evaluateAll((nodos) =>
    [...new Set(nodos.map((nodo) => nodo.getAttribute("href")))].sort()
  )
  expect(hrefs).toEqual([
    "/blog/como-elegir-profesor-particular-talavera",
    "/blog/precio-clases-particulares-talavera",
  ])
  await expect(page.getByText("Cómo elegir profesor particular en Talavera de la Reina sin perder dinero ni tiempo")).toBeVisible()
  await expect(page.getByText("Cuánto cuesta un profesor particular en Talavera de la Reina: precios reales y cómo comparar")).toBeVisible()

  const canonical = await page.locator('link[rel="canonical"]').getAttribute("href")
  expect(canonical).not.toBeNull()
  expect(new URL(canonical!).pathname).toBe("/blog")

  const robots = await page.locator('meta[name="robots"]').getAttribute("content")
  expect(robots ?? "").not.toContain("noindex")
})
