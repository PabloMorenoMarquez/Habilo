"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import {
  CONSENT_STORAGE_KEY,
  guardarConsentimiento,
  initAnalytics,
  leerConsentimiento,
  revocarAnalytics,
} from "@/lib/analytics"

export { CONSENT_STORAGE_KEY }

interface ConsentContextValue {
  analytics: boolean | null
  bannerOpen: boolean
  decidir: (analytics: boolean) => void
  abrirBanner: () => void
}

const ConsentContext = createContext<ConsentContextValue | null>(null)

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [analytics, setAnalytics] = useState<boolean | null>(null)
  const [bannerOpen, setBannerOpen] = useState(false)

  useEffect(() => {
    const guardado = leerConsentimiento()

    if (guardado === true) {
      setAnalytics(true)
      void initAnalytics()
      return
    }

    // Sin decisión o con rechazo previo no se inicializa PostHog. También se
    // eliminan restos de versiones anteriores que lo cargaban sin permiso.
    revocarAnalytics()
    setAnalytics(guardado)
    if (guardado === null) setBannerOpen(true)
  }, [])

  const decidir = useCallback((nuevoValor: boolean) => {
    guardarConsentimiento(nuevoValor)
    setAnalytics(nuevoValor)
    setBannerOpen(false)

    if (nuevoValor) {
      void initAnalytics()
    } else {
      revocarAnalytics()
    }
  }, [])

  // Sincroniza la decisión entre pestañas: retirar en una debe detener la
  // analítica en las demás, y aceptar debe activarla.
  useEffect(() => {
    const alCambiarAlmacen = (evento: StorageEvent) => {
      if (evento.key !== CONSENT_STORAGE_KEY) return
      const guardado = leerConsentimiento()
      setAnalytics(guardado)
      if (guardado === true) {
        setBannerOpen(false)
        void initAnalytics()
      } else {
        revocarAnalytics()
        setBannerOpen(guardado === null)
      }
    }

    window.addEventListener("storage", alCambiarAlmacen)
    return () => window.removeEventListener("storage", alCambiarAlmacen)
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
