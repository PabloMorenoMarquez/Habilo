import type { CaptureResult, PostHog, Properties } from "posthog-js"

export const CONSENT_STORAGE_KEY = "habilo_consent_v1"

// `token` no está aquí: PostHog exige `properties.token` y descarta el evento
// si `before_send` lo elimina. Esa clave se sustituye por el token público del
// proyecto, nunca por un valor que venga del evento o de la URL.
const CLAVES_SENSIBLES =
  /^(?:access_token|refresh_token|id_token|jwt|authorization|password|cookie)$/i
const PARAMETRO_SENSIBLE =
  /([?&#])(?:token|access_token|refresh_token|id_token|jwt|authorization)=[^&\s#]*/gi

/**
 * Elimina credenciales de cualquier cadena que vaya a PostHog. No toca el
 * resto del texto: solo los parámetros cuyo nombre es sensible.
 */
function limpiarParametrosSensibles(valor: string): string {
  return valor
    .replace(PARAMETRO_SENSIBLE, "$1")
    .replace(/([?&])&+/g, "$1")
    .replace(/[?&]+(?=#|$)/g, "")
}

function sanearPropiedades(valor: unknown, profundidad = 0): unknown {
  if (valor === null || typeof valor !== "object") return valor
  // Más allá de este límite se descarta el subárbol: devolverlo sin recorrer
  // dejaría pasar credenciales anidadas.
  if (profundidad > 4) return null
  if (Array.isArray(valor)) {
    return valor.map((item) => sanearPropiedades(item, profundidad + 1))
  }
  if (valor instanceof Date) return valor

  const resultado: Record<string, unknown> = {}
  for (const [clave, item] of Object.entries(valor as Record<string, unknown>)) {
    if (CLAVES_SENSIBLES.test(clave)) continue
    if (clave === "token") {
      resultado[clave] = posthogProjectToken ?? ""
      continue
    }
    resultado[clave] =
      typeof item === "string" ? limpiarParametrosSensibles(item) : sanearPropiedades(item, profundidad + 1)
  }
  return resultado
}

/**
 * Última barrera antes de la red: aunque la URL se limpia al arrancar, ningún
 * evento puede llevar un token en `$current_url`, propiedades o `$set`.
 */
function sanearEvento(evento: CaptureResult | null): CaptureResult | null {
  if (!evento) return null
  return {
    ...evento,
    properties: sanearPropiedades(evento.properties) as Properties,
    ...(evento.$set ? { $set: sanearPropiedades(evento.$set) as Properties } : {}),
    ...(evento.$set_once
      ? { $set_once: sanearPropiedades(evento.$set_once) as Properties }
      : {}),
  }
}

const posthogProjectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST

const isPostHogConfigured = Boolean(posthogProjectToken && posthogHost)

let cliente: PostHog | null = null
let initPromise: Promise<void> | null = null
let analyticsActivo = false
// Sube al retirar el consentimiento. Un init en vuelo compara su época y se
// aborta si el usuario retiró el permiso mientras cargaba el chunk.
let epoca = 0
// Corta los envíos en vuelo y los reintentos cuando se retira el permiso.
let controladorEnvios: AbortController | null = null

export function leerConsentimiento(): boolean | null {
  if (typeof window === "undefined") return null
  try {
    const guardado = localStorage.getItem(CONSENT_STORAGE_KEY)
    if (!guardado) return null
    const datos = JSON.parse(guardado)
    return typeof datos?.analytics === "boolean" ? datos.analytics : null
  } catch {
    return null
  }
}

export function guardarConsentimiento(analytics: boolean): boolean {
  if (typeof window === "undefined") return false
  try {
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ analytics, ts: new Date().toISOString() })
    )
    return true
  } catch {
    return false
  }
}

export function tieneConsentimientoAnalitico(): boolean {
  return leerConsentimiento() === true
}

/**
 * Inicializa PostHog solo después de un consentimiento afirmativo.
 * Nunca se llama durante el arranque si no hay consentimiento guardado.
 */
export function initAnalytics(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (!isPostHogConfigured || !tieneConsentimientoAnalitico()) return Promise.resolve()

  if (cliente?.__loaded) {
    if (!analyticsActivo) {
      prepararTransporte(cliente)
      cliente.opt_in_capturing({ captureEventName: false })
      analyticsActivo = true
    }
    marcarInicializacion(true)
    return Promise.resolve()
  }

  if (!initPromise) {
    const epocaInicial = epoca
    initPromise = import("posthog-js")
      .then(({ default: posthog }) => {
        if (epocaInicial !== epoca || !tieneConsentimientoAnalitico()) {
          initPromise = null
          // Si se retiró y volvió a aceptar durante la carga, reintenta.
          if (tieneConsentimientoAnalitico()) void initAnalytics()
          return
        }
        cliente = posthog
        if (!posthog.__loaded) {
          posthog.init(posthogProjectToken!, {
            api_host: posthogHost!,
            defaults: "2026-01-30",
            person_profiles: "identified_only",
            respect_dnt: true,
            disable_session_recording: true,
            autocapture: false,
            capture_pageleave: false,
            capture_exceptions: true,
            // La URL se limpia antes de inicializar, pero si algún evento
            // llegara con un token, este hook lo elimina antes del envío.
            before_send: sanearEvento,
            disable_surveys: true,
            advanced_disable_flags: true,
            // Sin batching no queda una ventana de 3 s con eventos sin enviar.
            request_batching: false,
            // En desarrollo el cuerpo va sin comprimir para que los E2E
            // comprueben qué evento se envió; en producción se comprime.
            disable_compression: process.env.NODE_ENV !== "production",
          })
        }
        prepararTransporte(posthog)
        posthog.opt_in_capturing({ captureEventName: false })
        analyticsActivo = true
        marcarInicializacion(true)
      })
      .catch(() => {
        initPromise = null
        cliente = null
        analyticsActivo = false
      })
  }

  return initPromise
}

/**
 * Señal de solo desarrollo para que los E2E puedan distinguir "PostHog
 * inicializado" de "nunca inicializado". En producción no se ejecuta.
 */
function marcarInicializacion(activo: boolean) {
  if (process.env.NODE_ENV === "production") return
  const destino = window as Window & { __habiloAnalyticsIniciado?: boolean }
  destino.__habiloAnalyticsIniciado = activo
}

export function revocarAnalytics(): void {
  if (typeof window === "undefined") return
  epoca += 1
  if (cliente?.__loaded) {
    // reset() devuelve el consentimiento al estado por defecto; se vuelve a
    // optar por fuera después para que no quede capturando tras la retirada.
    cliente.reset()
    cliente.opt_out_capturing()
    detenerTransporte()
    analyticsActivo = false
  }
  marcarInicializacion(false)
  limpiarPersistenciaPostHog()
}

export function resetAnalyticsIdentity(): void {
  if (!cliente?.__loaded) return
  if (!tieneConsentimientoAnalitico()) {
    // Sin consentimiento, reset() escribiría un identificador nuevo y dejaría
    // la captura activa. Solo apagamos, cortamos envíos y limpiamos.
    cliente.opt_out_capturing()
    detenerTransporte()
    analyticsActivo = false
    epoca += 1
    marcarInicializacion(false)
    limpiarPersistenciaPostHog()
    return
  }
  cliente.reset()
  prepararTransporte(cliente)
  cliente.opt_in_capturing({ captureEventName: false })
  analyticsActivo = true
}

export function captureIfConsented(event: string, properties?: Properties): void {
  if (!tieneConsentimientoAnalitico()) return
  if (cliente?.__loaded && analyticsActivo) {
    cliente.capture(event, properties)
    return
  }
  void initAnalytics().then(() => {
    if (tieneConsentimientoAnalitico() && cliente?.__loaded) {
      cliente.capture(event, properties)
    }
  })
}

export function identifyIfConsented(distinctId: string, properties?: Properties): void {
  if (!tieneConsentimientoAnalitico()) return
  if (cliente?.__loaded && analyticsActivo) {
    cliente.identify(distinctId, properties)
    return
  }
  void initAnalytics().then(() => {
    if (tieneConsentimientoAnalitico() && cliente?.__loaded) {
      cliente.identify(distinctId, properties)
    }
  })
}

export function captureExceptionIfConsented(error: unknown): void {
  if (!tieneConsentimientoAnalitico()) return
  if (cliente?.__loaded && analyticsActivo) {
    cliente.captureException(error)
    return
  }
  void initAnalytics().then(() => {
    if (tieneConsentimientoAnalitico() && cliente?.__loaded) {
      cliente.captureException(error)
    }
  })
}

function esClaveOptInOut(nombre: string): boolean {
  return nombre.startsWith("__ph_opt_in_out_")
}

type ConfigConTransporte = {
  fetch_options?: { signal?: AbortSignal }
}

const TIMEOUT_ENVIO_MS = 60_000

/**
 * Compone la señal de retirada con un timeout por envío. `AbortSignal.any` y
 * `AbortSignal.timeout` no existen en navegadores antiguos; ahí se construye
 * la composición a mano para no perder el timeout.
 */
function componerSenal(retirada: AbortSignal): AbortSignal {
  if (typeof AbortSignal.any === "function" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.any([retirada, AbortSignal.timeout(TIMEOUT_ENVIO_MS)])
  }

  const compuesta = new AbortController()
  const temporizador = setTimeout(() => compuesta.abort(), TIMEOUT_ENVIO_MS)
  const abortar = () => {
    clearTimeout(temporizador)
    compuesta.abort()
  }
  compuesta.signal.addEventListener(
    "abort",
    () => {
      clearTimeout(temporizador)
      retirada.removeEventListener("abort", abortar)
    },
    { once: true }
  )
  if (retirada.aborted) {
    abortar()
  } else {
    retirada.addEventListener("abort", abortar, { once: true })
  }
  return compuesta.signal
}

/**
 * `request_batching: false` hace que cada evento se envíe al capturarlo, sin
 * ventana de 3 s. El `AbortController` permite cortar además el envío en vuelo
 * y los reintentos cuando se retira el consentimiento. Al volver a aceptar se
 * instala un controlador nuevo.
 */
function prepararTransporte(instancia: PostHog) {
  controladorEnvios?.abort()
  const controlador = new AbortController()
  controladorEnvios = controlador

  // El SDK copia `fetch_options` en cada envío. Con un getter, cada petición
  // recibe una señal nueva que compone la retirada del consentimiento con su
  // propio timeout, sin pisar el del SDK.
  const opciones: { signal?: AbortSignal } = {}
  Object.defineProperty(opciones, "signal", {
    enumerable: true,
    get: () => componerSenal(controlador.signal),
  })

  const config = instancia.config as unknown as ConfigConTransporte
  config.fetch_options = opciones
}

function detenerTransporte() {
  controladorEnvios?.abort()
  controladorEnvios = null
}

// Sonda de solo desarrollo para que los E2E verifiquen el estado real del
// consentimiento dentro del SDK. En producción no se ejecuta.
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  const destino = window as Window & {
    __habiloAnalyticsOptOut?: () => boolean | null
    __habiloAnalyticsCapturar?: (evento: string, propiedades?: Properties) => void
  }
  destino.__habiloAnalyticsOptOut = () =>
    cliente?.__loaded ? cliente.has_opted_out_capturing() : null
  destino.__habiloAnalyticsCapturar = (evento, propiedades) =>
    captureIfConsented(evento, propiedades)
}

/**
 * Borra restos de versiones anteriores que inicializaban PostHog antes del
 * consentimiento. Conserva el marcador `__ph_opt_in_out_*` en "0": es la
 * prueba durable del opt-out, no un identificador analítico.
 */
function limpiarPersistenciaPostHog() {
  const nombresCookie: string[] = []
  try {
    for (const cookie of document.cookie.split(";")) {
      const nombre = cookie.split("=")[0]?.trim()
      if (nombre && (nombre.startsWith("ph_") || nombre.startsWith("__ph"))) {
        if (!esClaveOptInOut(nombre)) nombresCookie.push(nombre)
      }
    }
  } catch {
    // Sin acceso a cookies: no hay nada que limpiar.
  }

  if (nombresCookie.length > 0) {
    const host = window.location.hostname
    const esIp = /^\d+$/.test(host)
    const dominios = new Set<string | null>([null, host, `.${host}`])
    if (esIp) {
      dominios.add(`.${host}`)
    } else {
      // Cubre cualquier sufijo, no solo el dominio registrable: así también
      // se borran cookies puestas en sufijos de varias etiquetas.
      const partes = host.split(".")
      for (let i = 1; i < partes.length; i += 1) {
        const sufijo = partes.slice(i).join(".")
        dominios.add(sufijo)
        dominios.add(`.${sufijo}`)
      }
    }

    for (const nombre of nombresCookie) {
      for (const dominio of dominios) {
        const base = `${nombre}=; Max-Age=0; path=/; SameSite=Lax`
        document.cookie = dominio ? `${base}; domain=${dominio}` : base
      }
    }
  }

  try {
    const claves: string[] = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const clave = localStorage.key(i)
      if (clave && (clave.startsWith("ph_") || clave.startsWith("__ph"))) {
        if (esClaveOptInOut(clave)) {
          if (localStorage.getItem(clave) !== "0") localStorage.setItem(clave, "0")
          continue
        }
        claves.push(clave)
      }
    }
    claves.forEach((clave) => localStorage.removeItem(clave))
  } catch {
    // localStorage puede no estar disponible en modo privado.
  }
}
