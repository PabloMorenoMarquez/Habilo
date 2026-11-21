"use client"

import { useEffect } from "react"
import { captureIfConsented } from "@/lib/analytics"
import { storeUtmFromUrl } from "@/lib/utm"

export default function LandingTracker() {
  useEffect(() => {
    storeUtmFromUrl(window.location.search)

    const ref = new URLSearchParams(window.location.search).get("ref")
    if (ref) {
      // El alta (select-role) lee el código de aquí. Se guarda en cualquier página de
      // entrada: el invitado suele pasar por la portada o /da-clases antes del login.
      try {
        localStorage.setItem("habilo_referido_codigo", ref.slice(0, 100))
      } catch {
        // Almacenamiento bloqueado: el alta sigue funcionando sin código de invitación.
      }
      captureIfConsented("referral_visit", { code: ref.slice(0, 100) })
    }
  }, [])

  return null
}
