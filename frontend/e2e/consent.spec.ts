import { test, expect, type Page } from "@playwright/test"

const CLAVE_CONSENTIMIENTO = "habilo_consent_v1"
const POSTHOG = /posthog\.com/i

/**
 * PostHog descarta eventos de navegadores automatizados: detecta
 * `navigator.webdriver` y la marca "HeadlessChrome" en `userAgentData`. Playwright
 * los expone por defecto, lo que dejaría los tests de red vacíos. Se ocultan
 * solo en este spec para que las peticiones a PostHog sean reales.
 */
test.use({
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
})

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false })
    Object.defineProperty(navigator, "userAgentData", { get: () => undefined })
  })
})

/**
 * Intercepta cualquier petición a PostHog y la responde con 200 vacío. Sirve
 * para comprobar que no se intenta enviar nada antes del consentimiento ni
 * después de retirarlo, sin provocar reintentos del SDK.
 */
async function interceptarPostHog(page: Page): Promise<string[]> {
  const peticiones: string[] = []
  await page.context().route(POSTHOG, async (route) => {
    peticiones.push(route.request().url())
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  })
  return peticiones
}

const EVENTO_POSTHOG = /posthog\.com\/e\//

/** Extrae los nombres de evento del cuerpo JSON de PostHog. */
function eventosDelCuerpo(cuerpo: string | null): string[] {
  if (!cuerpo) return []
  try {
    const json = JSON.parse(cuerpo) as {
      event?: string
      batch?: Array<{ event?: string }>
    }
    const lista = json.batch ?? [json]
    return lista.map((evento) => evento.event).filter((evento): evento is string => Boolean(evento))
  } catch {
    return []
  }
}

/**
 * Lee el estado real de PostHog en el navegador. La inicialización se comprueba
 * con el marcador de desarrollo y con su persistencia, no solo con la red.
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
  const marcas: number[] = []
  const eventos: string[] = []
  await page.route(POSTHOG, async (route) => {
    marcas.push(Date.now())
    eventos.push(...eventosDelCuerpo(route.request().postData()))
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  })
  await page.addInitScript((clave) => {
    localStorage.setItem(clave, JSON.stringify({ analytics: true, ts: new Date().toISOString() }))
  }, CLAVE_CONSENTIMIENTO)

  await page.goto("/")
  await expect.poll(() => analyticsIniciado(page), { timeout: 15_000 }).toBe(true)
  await expect.poll(() => marcas.length, { timeout: 15_000 }).toBeGreaterThan(0)

  // Evento de negocio justo antes de retirar: con batching volvería a salir
  // 3 s después, ya sin consentimiento.
  const antesDelEvento = marcas.length
  await page.evaluate(() => {
    const ventana = window as Window & {
      __habiloAnalyticsCapturar?: (evento: string) => void
    }
    ventana.__habiloAnalyticsCapturar?.("e2e_previo_a_retirada")
  })
  await expect
    .poll(() => eventos.includes("e2e_previo_a_retirada"), { timeout: 15_000 })
    .toBe(true)
  expect(marcas.length).toBeGreaterThan(antesDelEvento)

  await page.locator('a[href="/legal/privacidad"]').first().click()
  await page.getByRole("button", { name: "Cambiar preferencias de cookies" }).click()
  await page.getByRole("button", { name: "Solo esenciales" }).click()
  await expect.poll(() => analyticsOptOut(page), { timeout: 15_000 }).toBe(true)

  const retirada = Date.now()
  await page.waitForTimeout(5000)

  const posteriores = marcas.filter((marca) => marca > retirada + 250)
  expect(posteriores).toHaveLength(0)
})

test("retirar aborta un envío en vuelo y no lo reintenta", async ({ context, page }) => {
  const peticiones: string[] = []
  const canceladas: string[] = []
  let totalEnvios = 0
  page.on("requestfailed", (req) => {
    if (EVENTO_POSTHOG.test(req.url())) {
      canceladas.push(req.failure()?.errorText ?? "desconocido")
    }
  })

  // La segunda pestaña retira el consentimiento; sus envíos no salen a la red.
  await context.route(POSTHOG, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  })

  let liberar: () => void = () => {}
  const bloqueo = new Promise<void>((resolve) => {
    liberar = resolve
  })
  let enVuelo = false

  await page.route(POSTHOG, async (route) => {
    if (!EVENTO_POSTHOG.test(route.request().url())) {
      await route.fulfill({ status: 200, contentType: "application/javascript", body: "" })
      return
    }

    // Cuenta también los reintentos: cualquier envío posterior a la retirada
    // invalida la prueba, aunque no sea el evento retenido.
    totalEnvios += 1

    // Los eventos de `init()` salen antes de instalar `fetch_options`; se
    // retiene uno posterior, ya cubierto por la señal de retirada.
    if (!enVuelo && eventosDelCuerpo(route.request().postData()).includes("e2e_envio_en_vuelo")) {
      enVuelo = true
      peticiones.push(route.request().url())
      await bloqueo
      await route
        .fulfill({ status: 200, contentType: "application/json", body: "{}" })
        .catch(() => {})
      return
    }

    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  })

  await paginaSinDecision(page)
  await page.getByRole("button", { name: "Aceptar analítica" }).click()
  await expect.poll(() => analyticsIniciado(page), { timeout: 15_000 }).toBe(true)

  await page.evaluate(() => {
    const ventana = window as Window & {
      __habiloAnalyticsCapturar?: (evento: string) => void
    }
    ventana.__habiloAnalyticsCapturar?.("e2e_envio_en_vuelo")
  })
  await expect.poll(() => enVuelo, { timeout: 15_000 }).toBe(true)

  // La primera pestaña sigue en "/" con el envío retenido; la segunda retira.
  const otra = await context.newPage()
  await otra.goto("/legal/privacidad")
  await otra.getByRole("button", { name: "Cambiar preferencias de cookies" }).click()
  await otra.getByRole("button", { name: "Solo esenciales" }).click()

  await expect.poll(() => analyticsOptOut(page), { timeout: 15_000 }).toBe(true)
  await expect.poll(() => canceladas.length, { timeout: 10_000 }).toBeGreaterThan(0)
  expect(canceladas.every((motivo) => motivo.includes("ERR_ABORTED"))).toBe(true)

  const enviosAlRetirar = totalEnvios
  liberar()
  // Cubre el primer reintento de PostHog, que llega entre 1,5 y 4,5 s después.
  await page.waitForTimeout(8000)
  expect(totalEnvios).toBe(enviosAlRetirar)
  expect(peticiones.length).toBe(1)
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
  await interceptarPostHog(page)
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

test("el token de login no llega a PostHog ni queda en la URL", async ({ page }) => {
  const cuerpos: string[] = []
  await page.route(POSTHOG, async (route) => {
    const cuerpo = route.request().postData()
    if (cuerpo) cuerpos.push(cuerpo)
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  })

  await page.addInitScript((clave) => {
    localStorage.setItem(clave, JSON.stringify({ analytics: true, ts: new Date().toISOString() }))
  }, CLAVE_CONSENTIMIENTO)

  await page.goto("/login?token=TOKEN_SECRETO_E2E&ref=REF_E2E")
  await expect.poll(() => analyticsIniciado(page), { timeout: 15_000 }).toBe(true)

  const url = new URL(page.url())
  expect(url.searchParams.get("token")).toBeNull()
  expect(url.searchParams.get("ref")).toBe("REF_E2E")
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("habilo_referido_codigo")))
    .toBe("REF_E2E")

  // Se fuerza el token también como propiedad del evento: before_send debe
  // borrarlo aunque la URL ya esté limpia.
  await page.evaluate(() => {
    const ventana = window as Window & {
      __habiloAnalyticsCapturar?: (
        evento: string,
        propiedades?: Record<string, unknown>
      ) => void
    }
    ventana.__habiloAnalyticsCapturar?.("e2e_token_login", {
      enlace: "https://habilo.es/login?token=TOKEN_SECRETO_E2E",
      token: "TOKEN_SECRETO_E2E",
    })
  })

  await expect
    .poll(() => cuerpos.some((cuerpo) => cuerpo.includes("e2e_token_login")), {
      timeout: 15_000,
    })
    .toBe(true)
  expect(cuerpos.every((cuerpo) => !cuerpo.includes("TOKEN_SECRETO_E2E"))).toBe(true)
})
