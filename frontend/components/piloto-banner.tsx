"use client"

import { Info } from "lucide-react"
import { useFeatureFlags } from "@/context/feature-flags-context"

export function PilotoBanner() {
  const { pagosHabilitados, cargado } = useFeatureFlags()

  if (!cargado || pagosHabilitados) return null

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-xs sm:text-sm px-4 py-2 flex items-center justify-center gap-2 text-center">
      <Info size={14} className="shrink-0" />
      <span>
        Estamos en fase piloto: coordina el servicio y el pago directamente con el profesional. Próximamente activaremos el pago online.
      </span>
    </div>
  )
}