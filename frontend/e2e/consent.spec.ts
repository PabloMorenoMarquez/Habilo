import { test, expect, type Page } from "@playwright/test"

const CLAVE_CONSENTIMIENTO = "habilo_consent_v1"
const POSTHOG = /posthog\.com/i

/**
 * Intercepta cualquier petición a PostHog y la responde con 200 vacío. Sirve
 * para comprobar que no se intenta enviar nada antes del consentimiento ni
 * después de retirarlo, sin provocar reintentos del SDK.
 */
async function interceptarPostHog(page: Page): Promise<string[]> {
  const peticiones: string[] = []
  await page.route(POSTHOG, async (route) => {
    peticiones.push(route.request().url())
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  })
  return peticiones
}

/**
 * Lee el estado real de PostHog en el navegador. En localhost PostHog marca la
 * sesión como entorno de test (`$internal_or_test_user`) y no manda eventos,
 * así que la inicialización se comprueba con el marcador de desarrollo y con
 * su persistencia, no con la red.
 */
function analyticsIniciado(page: Page) {
  return page.evaluate(() =>
    Boolean((window as Window & { __habiloAnalyticsIniciado?: boolean }).__habiloAnalyticsIniciado)
  )
}

function analyticsOptOut(page: Page) {
  return page.evaluate(() => {
    const ventana = window as Window & { __habiloAnalyticsOptOut?: () => boolean | null }
    return ventana.__habiloAnalyticsOptOut ? ventana.__habiloAnalyticsOptOut() : null
  })
}

async function estadoAnalitica(page: Page) {
  return page.evaluate(() => {
    const claves = Object.keys(localStorage)
    const claveOptIn = claves.find((clave) => clave.startsWith("__ph_opt_in_out_"))
    return {
      optIn: claveOptIn ? localStorage.getItem(claveOptIn) === "1" : false,
      marcador: claveOptIn ? localStorage.getItem(claveOptIn) : null,
      almacen: claves.some(
        (clave) => clave.startsWith("ph_") && clave.endsWith("_posthog")
      ),
    }
  })
}

async function paginaSinDecision(page: Page) {
  await page.goto("/")
  await page.evaluate(() => localStorage.clear())
  await page.context().clearCookies()
  await page.reload()
  await expect(page.getByRole("dialog", { name: /cookies/i })).toBeVisible()
}

function cookiesPostHog(cookies: { name: string }[]) {
  return cookies.filter(
    (cookie) => cookie.name.startsWith("ph_") || cookie.name.startsWith("__ph")
  )
}

async function clavesPostHogActivas(page: Page) {
  return page.evaluate(() =>
    Object.keys(localStorage).filter((clave) => {
      if (clave.startsWith("__ph_opt_in_out_")) return localStorage.getItem(clave) === "1"
      return clave.startsWith("ph_")
    })
  )
}

test("sin decisión no se inicializa ni se envía nada a PostHog", async ({ page }) => {
  const peticiones = await interceptarPostHog(page)
  await paginaSinDecision(page)

  await page.waitForTimeout(3500)

  expect(peticiones).toHaveLength(0)
  expect(await analyticsIniciado(page)).toBe(false)
  expect(await estadoAnalitica(page)).toMatchObject({ optIn: false, marcador: null, almacen: false })
  expect(cookiesPostHog(await page.context().cookies())).toHaveLength(0)
  expect(await clavesPostHogActivas(page)).toHaveLength(0)
})

test("rechazar analítica no inicializa ni deja persistencia de PostHog", async ({ page }) => {
  const peticiones = await interceptarPostHog(page)
  await paginaSinDecision(page)

  await page.getByRole("button", { name: "Solo esenciales" }).click()
  await expect(page.getByRole("dialog", { name: /cookies/i })).toHaveCount(0)

  await page.waitForTimeout(3500)

  expect(peticiones).toHaveLength(0)
  expect(await analyticsIniciado(page)).toBe(false)
  expect(cookiesPostHog(await page.context().cookies())).toHaveLength(0)
  expect(await clavesPostHogActivas(page)).toHaveLength(0)
})

test("aceptar analítica inicializa PostHog y deja persistencia", async ({ page }) => {
  const peticiones = await interceptarPostHog(page)
  await paginaSinDecision(page)

  expect(peticiones).toHaveLength(0)
  await page.getByRole("button", { name: "Aceptar analítica" }).click()

  await expect.poll(() => analyticsIniciado(page), { timeout: 15_000 }).toBe(true)
  await expect.poll(async () => (await estadoAnalitica(page)).optIn).toBe(true)
  expect(await analyticsOptOut(page)).toBe(false)

  const consentimiento = await page.evaluate(
    (clave) => localStorage.getItem(clave),
    CLAVE_CONSENTIMIENTO
  )
  expect(consentimiento).toContain('"analytics":true')

  const estado = await estadoAnalitica(page)
  expect(estado.almacen).toBe(true)
})

test("retirar el consentimiento para los envíos y limpia la persistencia", async ({ page }) => {
  const peticiones = await interceptarPostHog(page)
  await paginaSinDecision(page)

  await page.getByRole("button", { name: "Aceptar analítica" }).click()
  await expect.poll(() => analyticsIniciado(page), { timeout: 15_000 }).toBe(true)

  await page.goto("/legal/privacidad")
  await expect.poll(() => analyticsIniciado(page), { timeout: 15_000 }).toBe(true)
  await page.waitForTimeout(1000)
  peticiones.length = 0

  await page.getByRole("button", { name: "Cambiar preferencias de cookies" }).click()
  await page.getByRole("button", { name: "Solo esenciales" }).click()

  await expect
    .poll(
      () => page.evaluate((clave) => localStorage.getItem(clave), CLAVE_CONSENTIMIENTO),
      { timeout: 15_000 }
    )
    .toContain('"analytics":false')

  await expect.poll(() => analyticsIniciado(page), { timeout: 15_000 }).toBe(false)
  await expect.poll(() => analyticsOptOut(page), { timeout: 15_000 }).toBe(true)

  // El marcador "0" es la prueba durable del opt-out; la persistencia activa
  // y las cookies deben desaparecer.
  const estado = await estadoAnalitica(page)
  expect(estado.marcador).toBe("0")
  expect(estado.almacen).toBe(false)

  await page.waitForTimeout(3500)

  expect(peticiones).toHaveLength(0)
  expect(cookiesPostHog(await page.context().cookies())).toHaveLength(0)
  expect(await clavesPostHogActivas(page)).toHaveLength(0)
})

test("retirar justo después de aceptar corta los envíos pendientes", async ({ page }) => {
  const peticiones = await interceptarPostHog(page)
  await paginaSinDecision(page)

  await page.getByRole("button", { name: "Aceptar analítica" }).click()
  await expect.poll(() => analyticsIniciado(page), { timeout: 15_000 }).toBe(true)

  // Sin esperar ninguna ventana de batching: abrir preferencias y retirar.
  await page.locator('a[href="/legal/privacidad"]').first().click()
  await page.getByRole("button", { name: "Cambiar preferencias de cookies" }).click()
  await page.getByRole("button", { name: "Solo esenciales" }).click()
  await expect.poll(() => analyticsOptOut(page), { timeout: 15_000 }).toBe(true)

  const trasRetirar = peticiones.length
  await page.waitForTimeout(5000)

  expect(peticiones.length).toBe(trasRetirar)
})

test("retirar mientras carga el chunk de PostHog impide su inicialización", async ({ page }) => {
  const peticiones = await interceptarPostHog(page)
  await paginaSinDecision(page)

  let liberar: () => void = () => {}
  const bloqueo = new Promise<void>((resolve) => {
    liberar = resolve
  })
  let chunkPedido: () => void = () => {}
  const pedido = new Promise<void>((resolve) => {
    chunkPedido = resolve
  })
  await page.route(/posthog-js.*\.js/, async (route) => {
    chunkPedido()
    await bloqueo
    await route.continue()
  })

  await page.getByRole("button", { name: "Aceptar analítica" }).click()
  await pedido

  // Navegación de cliente a la página legal: el import del chunk sigue en vuelo.
  await page.locator('a[href="/legal/privacidad"]').first().click()
  await page.getByRole("button", { name: "Cambiar preferencias de cookies" }).click()
  await page.getByRole("button", { name: "Solo esenciales" }).click()
  await expect
    .poll(
      () => page.evaluate((clave) => localStorage.getItem(clave), CLAVE_CONSENTIMIENTO),
      { timeout: 15_000 }
    )
    .toContain('"analytics":false')

  liberar()
  await page.waitForTimeout(3500)

  expect(await analyticsIniciado(page)).toBe(false)
  expect(await analyticsOptOut(page)).toBeNull()
  expect(peticiones).toHaveLength(0)
  expect(cookiesPostHog(await page.context().cookies())).toHaveLength(0)
  expect(await clavesPostHogActivas(page)).toHaveLength(0)
})

test("un consentimiento inválido vuelve a pedir decisión y no envía nada", async ({ page }) => {
  const peticiones = await interceptarPostHog(page)

  await page.goto("/")
  await page.evaluate((clave) => localStorage.setItem(clave, "{no-es-json"), CLAVE_CONSENTIMIENTO)
  await page.reload()

  await expect(page.getByRole("dialog", { name: /cookies/i })).toBeVisible()
  await page.waitForTimeout(3500)

  expect(peticiones).toHaveLength(0)
  expect(await analyticsIniciado(page)).toBe(false)
})

test("sincroniza el rechazo de otra pestaña y deja de capturar", async ({ context, page }) => {
  await page.addInitScript((clave) => {
    localStorage.setItem(clave, JSON.stringify({ analytics: true, ts: new Date().toISOString() }))
  }, CLAVE_CONSENTIMIENTO)

  await page.goto("/")
  await expect.poll(() => analyticsIniciado(page), { timeout: 15_000 }).toBe(true)

  const otra = await context.newPage()
  await otra.goto("/legal/privacidad")
  await otra.getByRole("button", { name: "Cambiar preferencias de cookies" }).click()
  await otra.getByRole("button", { name: "Solo esenciales" }).click()

  await expect.poll(() => analyticsIniciado(page), { timeout: 15_000 }).toBe(false)
  await expect.poll(() => analyticsOptOut(page), { timeout: 15_000 }).toBe(true)
  const estado = await estadoAnalitica(page)
  expect(estado.marcador).toBe("0")
  expect(estado.almacen).toBe(false)
})

test("volver a aceptar tras retirar reactiva la analítica", async ({ page }) => {
  await interceptarPostHog(page)
  await paginaSinDecision(page)

  await page.getByRole("button", { name: "Aceptar analítica" }).click()
  await expect.poll(() => analyticsIniciado(page), { timeout: 15_000 }).toBe(true)

  await page.goto("/legal/privacidad")
  await expect.poll(() => analyticsIniciado(page), { timeout: 15_000 }).toBe(true)
  await page.getByRole("button", { name: "Cambiar preferencias de cookies" }).click()
  await page.getByRole("button", { name: "Solo esenciales" }).click()
  await expect.poll(() => analyticsOptOut(page), { timeout: 15_000 }).toBe(true)

  await page.getByRole("button", { name: "Cambiar preferencias de cookies" }).click()
  await page.getByRole("button", { name: "Aceptar analítica" }).click()

  await expect.poll(() => analyticsIniciado(page), { timeout: 15_000 }).toBe(true)
  expect(await analyticsOptOut(page)).toBe(false)
  const estado = await estadoAnalitica(page)
  expect(estado.marcador).toBe("1")
})

test("un consentimiento guardado afirmativo inicializa PostHog sin mostrar el banner", async ({
  page,
}) => {
  await interceptarPostHog(page)

  await page.goto("/")
  await page.evaluate((clave) => {
    localStorage.setItem(clave, JSON.stringify({ analytics: true, ts: new Date().toISOString() }))
  }, CLAVE_CONSENTIMIENTO)
  await page.reload()

  await expect(page.getByRole("dialog", { name: /cookies/i })).toHaveCount(0)
  await expect.poll(() => analyticsIniciado(page), { timeout: 15_000 }).toBe(true)
})
