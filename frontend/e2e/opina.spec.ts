import { test, expect, type Page } from "@playwright/test"

// Formulario público de reseñas: la API se simula, no hace falta backend.
const CODIGO = "abc12345"
const NOMBRE = "Julia Sánchez Navarro"

interface OpcionesApi {
  getStatus?: number
  postStatus?: number
  postBody?: Record<string, unknown>
}

async function prepararApi(page: Page, opciones: OpcionesApi = {}) {
  const { getStatus = 200, postStatus = 201, postBody = { ok: true } } = opciones
  const envios: Record<string, unknown>[] = []

  await page.route(`**/resenas/${CODIGO}`, (route) => {
    const request = route.request()
    if (request.method() === "POST") {
      envios.push(request.postDataJSON())
      return route.fulfill({
        status: postStatus,
        contentType: "application/json",
        body: JSON.stringify(postBody),
      })
    }
    if (getStatus !== 200) {
      return route.fulfill({
        status: getStatus,
        contentType: "application/json",
        body: JSON.stringify({ detail: "No existe el enlace de opiniones" }),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ nombre_profesor: NOMBRE }),
    })
  })
  return envios
}

async function abrir(page: Page) {
  await page.goto(`/opina/${CODIGO}`)
  await page.getByRole("button", { name: "Solo esenciales" }).click()
}

async function rellenar(page: Page, { consentimiento = true } = {}) {
  await expect(page.getByText(`¿Qué tal las clases con ${NOMBRE}?`)).toBeVisible()
  await page.getByRole("button", { name: "5 estrellas" }).click()
  await page
    .getByLabel("Tu opinión")
    .fill("Explica muy bien y mi hija ha subido dos puntos en matemáticas.")
  await page.getByLabel(/tu nombre/i).fill("Marta G.")
  await page.getByRole("radio", { name: /madre o padre/i }).check()
  await page.getByRole("radio", { name: /de 3 a 12 meses/i }).check()
  await page.getByLabel(/email o teléfono/i).fill("marta@example.com")
  if (consentimiento) {
    await page.getByRole("checkbox", { name: /acepto que se publique/i }).check()
  }
}

test("muestra el nombre del profesor y envía la opinión", async ({ page }) => {
  const envios = await prepararApi(page)
  await abrir(page)
  await rellenar(page)
  await page.getByRole("button", { name: "Enviar opinión" }).click()

  await expect(
    page.getByText(
      `Gracias. Revisaremos tu opinión y la publicaremos en el perfil de ${NOMBRE} en unos días`
    )
  ).toBeVisible()
  expect(envios).toHaveLength(1)
  expect(envios[0]).toMatchObject({
    puntuacion: 5,
    comentario: "Explica muy bien y mi hija ha subido dos puntos en matemáticas.",
    autor_nombre: "Marta G.",
    relacion: "padre_madre",
    antiguedad: "3_12_meses",
    contacto: "marta@example.com",
    consentimiento: true,
    website: "",
  })
})

test("código inexistente", async ({ page }) => {
  await prepararApi(page, { getStatus: 404 })
  await abrir(page)
  await expect(page.getByText("Este enlace no es válido")).toBeVisible()
  await expect(page.getByRole("button", { name: "Enviar opinión" })).toHaveCount(0)
})

test("duplicado", async ({ page }) => {
  await prepararApi(page, {
    postStatus: 409,
    postBody: { detail: "Ya has dejado una opinión para este profesor. ¡Gracias!" },
  })
  await abrir(page)
  await rellenar(page)
  await page.getByRole("button", { name: "Enviar opinión" }).click()
  await expect(
    page.getByText("Ya has dejado una opinión para este profesor. ¡Gracias!")
  ).toBeVisible()
})

test("no envía sin consentimiento", async ({ page }) => {
  const envios = await prepararApi(page)
  await abrir(page)
  await rellenar(page, { consentimiento: false })
  await page.getByRole("button", { name: "Enviar opinión" }).click()

  const casilla = page.getByRole("checkbox", { name: /acepto que se publique/i })
  await expect(casilla).toHaveAttribute("aria-invalid", "true")
  await expect(page.getByText(/acepta que publiquemos tu opinión/i)).toBeVisible()
  expect(envios).toHaveLength(0)
})

test("la página no es indexable", async ({ page }) => {
  await prepararApi(page)
  await page.goto(`/opina/${CODIGO}`)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/)
})

// --- Panel del profesor: tarjeta «Pide opiniones a tus alumnos» ---
// El panel carga sus datos en el navegador con la sesión, así que se simulan
// la sesión y las llamadas a la API (no hace falta backend).

const ENLACE = `https://habilo.es/opina/${CODIGO}`

async function prepararPanel(page: Page, { codigoStatus = 200 } = {}) {
  const json = (body: unknown, status = 200) => ({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  })

  await page.route("**/usuarios/me", (route) =>
    route.fulfill(
      json({
        id: "00000000-0000-0000-0000-000000000002",
        email: "profesor-e2e@habilo.test",
        nombre: "Profesor E2E",
        foto_url: null,
        telefono: null,
        telefono_verificado: null,
        ciudad: null,
        fecha_registro: null,
      })
    )
  )
  await page.route("**/proveedor/me", (route) =>
    route.fulfill(
      json({
        id: "00000000-0000-0000-0000-000000000010",
        usuario_id: "00000000-0000-0000-0000-000000000002",
        descripcion: "Clases de matemáticas",
        experiencia_años: 3,
        radio_km_disponible: 5,
        valoracion_media: null,
        num_valoraciones: 0,
        verificado: false,
        fecha_creacion: null,
        dias_disponibles: null,
        hora_inicio: null,
        hora_fin: null,
        destacado_hasta: null,
        url_documento: null,
        motivo_rechazo: null,
        codigo_referido: null,
        ciudad: "Talavera de la Reina",
        zona: null,
        materias: ["Matemáticas"],
        niveles: ["ESO"],
        perfil_publico: true,
        consentimiento_marketing: false,
      })
    )
  )
  await page.route("**/proveedor/me/codigo-resenas", (route) =>
    codigoStatus === 200
      ? route.fulfill(json({ codigo: CODIGO }))
      : route.fulfill(json({ detail: "No tienes perfil de proveedor" }, codigoStatus))
  )
  await page.route("**/categorias/", (route) => route.fulfill(json([])))
  await page.route("**/solicitudes/conversaciones**", (route) =>
    route.fulfill(json({ items: [], total: 0 }))
  )
  // Con un servicio publicado el panel no abre el diálogo de «crear servicio».
  await page.route("**/servicio/mios", (route) =>
    route.fulfill(
      json({
        items: [
          {
            id: "00000000-0000-0000-0000-000000000020",
            proveedor_id: "00000000-0000-0000-0000-000000000010",
            categoria_id: null,
            titulo: "Clases de matemáticas",
            descripcion: null,
            precio: "15",
            tipo_precio: "hora",
            activo: true,
            fecha_creacion: "2026-11-01T10:00:00Z",
            imagen_url: null,
            latitud: null,
            longitud: null,
            distancia_km: null,
            proveedor_nombre: null,
            proveedor_avatar: null,
            proveedor_valoracion_media: null,
            proveedor_num_valoraciones: null,
            categoria_nombre: null,
            es_favorito: false,
            proveedor_destacado_hasta: null,
          },
        ],
        total: 1,
      })
    )
  )

  await page.addInitScript(() => {
    localStorage.setItem("token", "token-de-prueba")
    localStorage.setItem("serviclick_role", "profesional")
    localStorage.setItem("onboarding_visto_v1_profesional", "1")
  })

  await page.goto("/dashboard")
  await page.getByRole("button", { name: "Solo esenciales" }).click()
}

test("el panel muestra el enlace para pedir opiniones", async ({ page }) => {
  await prepararPanel(page)
  const tarjeta = page.getByRole("region", { name: "Pide opiniones a tus alumnos" })
  await expect(tarjeta).toBeVisible()
  await expect(tarjeta.getByText(ENLACE)).toBeVisible()
})

test("el botón de WhatsApp lleva el mensaje con el enlace", async ({ page }) => {
  await prepararPanel(page)
  const texto =
    "Hola, estoy en Habilo, una web de profesores de Talavera. Si te están sirviendo mis clases, " +
    `¿me dejas una opinión? Son dos minutos: ${ENLACE}`
  await expect(page.getByRole("link", { name: "Enviar por WhatsApp" })).toHaveAttribute(
    "href",
    `https://wa.me/?text=${encodeURIComponent(texto)}`
  )
})

test("copiar deja el enlace en el portapapeles", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"])
  await prepararPanel(page)
  await page.getByRole("button", { name: "Copiar" }).click()
  await expect(page.getByRole("button", { name: "Copiado" })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(ENLACE)
})

test("sin código no se muestra la tarjeta", async ({ page }) => {
  await prepararPanel(page, { codigoStatus: 404 })
  await expect(page.getByRole("heading", { name: "Panel Profesional" })).toBeVisible()
  await expect(page.getByText("Mis servicios")).toBeVisible()
  await expect(page.getByRole("region", { name: "Pide opiniones a tus alumnos" })).toHaveCount(0)
})
