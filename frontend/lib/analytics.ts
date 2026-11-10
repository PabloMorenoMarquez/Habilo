import type { PostHog, Properties } from "posthog-js"

export const CONSENT_STORAGE_KEY = "habilo_consent_v1"

const posthogProjectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST

const isPostHogConfigured = Boolean(posthogProjectToken && posthogHost)

let cliente: PostHog | null = null
let initPromise: Promise<void> | null = null
let analyticsActivo = false

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
      cliente.opt_in_capturing()
      analyticsActivo = true
    }
    return Promise.resolve()
  }

  if (!initPromise) {
    initPromise = import("posthog-js")
      .then(({ default: posthog }) => {
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
            disable_surveys: true,
            advanced_disable_flags: true,
          })
        }
        posthog.opt_in_capturing()
        analyticsActivo = true
      })
      .catch(() => {
        initPromise = null
        cliente = null
        analyticsActivo = false
      })
  }

  return initPromise
}

export function revocarAnalytics(): void {
  if (typeof window === "undefined") return
  if (cliente?.__loaded) {
    // reset() devuelve el consentimiento al estado por defecto; se vuelve a
    // optar por fuera después para que no quede capturando tras la retirada.
    cliente.reset()
    cliente.opt_out_capturing()
    analyticsActivo = false
  }
  limpiarPersistenciaPostHog()
}

export function resetAnalyticsIdentity(): void {
  if (!cliente?.__loaded) return
  cliente.reset()
  if (tieneConsentimientoAnalitico()) {
    cliente.opt_in_capturing()
    analyticsActivo = true
  } else {
    analyticsActivo = false
  }
}

export function captureIfConsented(event: string, properties?: Properties): void {
  if (!tieneConsentimientoAnalitico()) return
  void initAnalytics().then(() => {
    cliente?.capture(event, properties)
  })
}

export function identifyIfConsented(distinctId: string, properties?: Properties): void {
  if (!tieneConsentimientoAnalitico()) return
  void initAnalytics().then(() => {
    cliente?.identify(distinctId, properties)
  })
}

export function captureExceptionIfConsented(error: unknown): void {
  if (!tieneConsentimientoAnalitico()) return
  void initAnalytics().then(() => {
    cliente?.captureException(error)
  })
}

/** Borra restos de versiones anteriores que inicializaban PostHog antes del consentimiento. */
function limpiarPersistenciaPostHog() {
  try {
    for (const cookie of document.cookie.split(";")) {
      const nombre = cookie.split("=")[0]?.trim()
      if (nombre && (nombre.startsWith("ph_") || nombre.startsWith("__ph"))) {
        document.cookie = `${nombre}=; Max-Age=0; path=/`
      }
    }
  } catch {
    // Sin acceso a cookies: no hay nada que limpiar.
  }

  try {
    const claves: string[] = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const clave = localStorage.key(i)
      if (clave && (clave.startsWith("ph_") || clave.startsWith("__ph"))) {
        claves.push(clave)
      }
    }
    claves.forEach((clave) => localStorage.removeItem(clave))
  } catch {
    // localStorage puede no estar disponible en modo privado.
  }
}
