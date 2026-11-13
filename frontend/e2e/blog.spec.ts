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

const SLUG = "como-elegir-profesor-particular-talavera"
const URL_POST = `/blog/${SLUG}`

test("el artículo renderiza el contenido y los datos estructurados", async ({ page }) => {
  await page.goto(URL_POST)

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Cómo elegir profesor particular")
  await expect(page.locator(".article-body").getByText("Define el objetivo antes de buscar")).toBeVisible()
  await expect(page.locator(".article-body a[href^='/home?']").first()).toBeVisible()

  const canonical = await page.locator('link[rel="canonical"]').getAttribute("href")
  expect(new URL(canonical!).pathname).toBe(URL_POST)

  const robots = await page.locator('meta[name="robots"]').getAttribute("content")
  expect(robots ?? "").not.toContain("noindex")

  const raw = await page.locator('script[type="application/ld+json"]').first().textContent()
  const jsonLd = JSON.parse(raw!)
  const tipos = jsonLd["@graph"].map((nodo: { "@type": string }) => nodo["@type"])
  expect(tipos).toContain("BlogPosting")
  expect(tipos).toContain("BreadcrumbList")
})

test("el artículo de precios renderiza la tabla sin desbordar en móvil", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto("/blog/precio-clases-particulares-talavera")

  await expect(page.locator(".article-body table")).toBeVisible()
  await expect(page.locator(".article-body td", { hasText: "13–15" }).first()).toBeVisible()

  const desborde = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  )
  expect(desborde).toBeLessThanOrEqual(1)
})

test("un slug inexistente devuelve 404", async ({ page }) => {
  const respuesta = await page.goto("/blog/no-existe")
  expect(respuesta?.status()).toBe(404)
})

test("cada post tiene entre 1.200 y 1.800 palabras", async ({ page }) => {
  const slugs = [
    "como-elegir-profesor-particular-talavera",
    "precio-clases-particulares-talavera",
  ]

  for (const slug of slugs) {
    await page.goto(`/blog/${slug}`)
    const texto = await page.locator(".article-body").innerText()
    const palabras = texto.trim().split(/\s+/).filter(Boolean).length
    expect(palabras, `${slug} tiene ${palabras} palabras`).toBeGreaterThanOrEqual(1200)
    expect(palabras, `${slug} tiene ${palabras} palabras`).toBeLessThanOrEqual(1800)
  }
})

test("el CTA no envía nada a PostHog sin consentimiento", async ({ page, context }) => {
  const peticiones: string[] = []
  await context.route(/posthog\.com/i, async (route) => {
    peticiones.push(route.request().url())
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  })

  await page.goto(URL_POST)
  await page.evaluate(() => localStorage.clear())
  await page.reload()

  const cta = page.locator(".article-cta a").first()
  await cta.click({ force: true })
  await page.waitForTimeout(1000)

  expect(peticiones).toHaveLength(0)
})

test("el sitemap incluye el blog y los dos artículos", async ({ request }) => {
  const respuesta = await request.get("/sitemap.xml")
  expect(respuesta.status()).toBe(200)

  const xml = await respuesta.text()
  expect(xml).toContain("<urlset")
  expect(xml).toContain("/blog</loc>")
  expect(xml).toContain("/blog/como-elegir-profesor-particular-talavera</loc>")
  expect(xml).toContain("/blog/precio-clases-particulares-talavera</loc>")
})

test("la portada enlaza al blog en cabecera y pie", async ({ page }) => {
  await page.goto("/")

  const enlaces = page.locator('a[href="/blog"]')
  expect(await enlaces.count()).toBeGreaterThanOrEqual(2)

  const visibles = await enlaces.evaluateAll((nodos) =>
    nodos.filter((nodo) => (nodo as HTMLElement).offsetParent !== null).length
  )
  expect(visibles).toBeGreaterThanOrEqual(1)
})

test("el artículo es legible: jerarquía, índice y ancho de línea", async ({ page }) => {
  await page.goto(URL_POST)

  const estilos = await page.evaluate(() => {
    const cuerpo = document.querySelector(".article-body")!
    const css = (selector: string) => getComputedStyle(cuerpo.querySelector(selector)!)
    return {
      parrafo: parseFloat(css("p:not(:first-child)").fontSize),
      margenParrafo: parseFloat(css("p:not(:first-child)").marginBottom),
      h2: parseFloat(css("h2").fontSize),
      pesoH2: Number(css("h2").fontWeight),
      margenH2: parseFloat(css("h2").marginTop),
      sangriaLista: parseFloat(css("ul li").paddingLeft) + parseFloat(css("ul").paddingLeft),
      ancho: cuerpo.clientWidth,
    }
  })

  expect(estilos.parrafo).toBeGreaterThanOrEqual(17)
  expect(estilos.margenParrafo).toBeGreaterThanOrEqual(16)
  expect(estilos.h2).toBeGreaterThanOrEqual(estilos.parrafo * 1.4)
  expect(estilos.pesoH2).toBeGreaterThanOrEqual(700)
  expect(estilos.margenH2).toBeGreaterThanOrEqual(40)
  expect(estilos.sangriaLista).toBeGreaterThanOrEqual(16)
  // Línea de lectura: unos 75 caracteres como máximo.
  expect(estilos.ancho).toBeLessThanOrEqual(720)

  const indice = page.locator(".article-toc a")
  expect(await indice.count()).toBeGreaterThanOrEqual(8)
  const destinos = await indice.evaluateAll((enlaces) =>
    enlaces.map((enlace) => {
      const id = decodeURIComponent(enlace.getAttribute("href")!.slice(1))
      return document.getElementById(id)?.tagName ?? null
    })
  )
  expect(destinos.every((etiqueta) => etiqueta === "H2")).toBe(true)
})
