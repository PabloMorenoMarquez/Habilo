"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import posthog from "posthog-js"

export const CONSENT_STORAGE_KEY = "habilo_consent_v1"

const isPostHogConfigured = Boolean(
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN && process.env.NEXT_PUBLIC_POSTHOG_HOST
)

interface ConsentContextValue {
  analytics: boolean | null
  bannerOpen: boolean
  decidir: (analytics: boolean) => void
  abrirBanner: () => void
}

const ConsentContext = createContext<ConsentContextValue | null>(null)

function leerConsentimiento(): boolean | null {
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

function guardarConsentimiento(analytics: boolean) {
  if (typeof window === "undefined") return
  localStorage.setItem(
    CONSENT_STORAGE_KEY,
    JSON.stringify({ analytics, ts: new Date().toISOString() })
  )
}

function aplicarConsentimiento(analytics: boolean, capturarPageview: boolean) {
  if (!isPostHogConfigured) return

  if (analytics) {
    posthog.reset()
    posthog.opt_in_capturing()
    if (capturarPageview) posthog.capture("$pageview")
  } else {
    posthog.opt_out_capturing()
    posthog.reset()
  }
}

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [analytics, setAnalytics] = useState<boolean | null>(null)
  const [bannerOpen, setBannerOpen] = useState(false)

  useEffect(() => {
    const guardado = leerConsentimiento()
    if (guardado === null) {
      setBannerOpen(true)
      return
    }
    setAnalytics(guardado)
    aplicarConsentimiento(guardado, guardado)
  }, [])

  const decidir = useCallback((nuevoValor: boolean) => {
    guardarConsentimiento(nuevoValor)
    setAnalytics(nuevoValor)
    aplicarConsentimiento(nuevoValor, nuevoValor)
    setBannerOpen(false)
  }, [])

  const abrirBanner = useCallback(() => setBannerOpen(true), [])

  return (
    <ConsentContext.Provider value={{ analytics, bannerOpen, decidir, abrirBanner }}>
      {children}
    </ConsentContext.Provider>
  )
}

export function useConsent() {
  const ctx = useContext(ConsentContext)
  if (!ctx) throw new Error("useConsent must be used within ConsentProvider")
  return ctx
}
