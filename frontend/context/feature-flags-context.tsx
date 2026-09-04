"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { API_URL } from "@/lib/api"

interface FeatureFlags {
  pagosHabilitados: boolean
  verificacionIdentidadHabilitada: boolean
}

const DEFAULT_FLAGS: FeatureFlags = {
  pagosHabilitados: false,
  verificacionIdentidadHabilitada: false,
}

interface FeatureFlagsContextType extends FeatureFlags {
  cargado: boolean
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType | null>(null)

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS)
  const [cargado, setCargado] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/config/flags`)
      .then((res) => {
        if (!res.ok) throw new Error(`Error ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setFlags({
          pagosHabilitados: !!data.pagos_habilitados,
          verificacionIdentidadHabilitada: !!data.verificacion_identidad_habilitada,
        })
      })
      .catch((err) => {
        // Si falla la petición (backend caído, red, etc.), nos quedamos con
        // los defaults seguros (todo deshabilitado) en vez de romper la app
        // o asumir que los flags están activos.
        console.error("No se pudieron cargar los feature flags:", err)
      })
      .finally(() => setCargado(true))
  }, [])

  return (
    <FeatureFlagsContext.Provider value={{ ...flags, cargado }}>
      {children}
    </FeatureFlagsContext.Provider>
  )
}

export function useFeatureFlags() {
  const ctx = useContext(FeatureFlagsContext)
  if (!ctx) throw new Error("useFeatureFlags must be used within a FeatureFlagsProvider")
  return ctx
}