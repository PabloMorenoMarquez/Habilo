"use client"

import { Button } from "@/components/ui/button"
import { useConsent } from "@/context/consent-context"

export function ConsentSettingsButton() {
  const { abrirBanner } = useConsent()

  return (
    <Button variant="outline" onClick={abrirBanner}>
      Cambiar preferencias de cookies
    </Button>
  )
}
