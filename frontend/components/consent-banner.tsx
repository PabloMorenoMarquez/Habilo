"use client"

import Link from "next/link"
import { Analytics } from "@vercel/analytics/next"
import { Button } from "@/components/ui/button"
import { useConsent } from "@/context/consent-context"

export function ConsentBanner() {
  const { bannerOpen, decidir } = useConsent()

  if (!bannerOpen) return null

  return (
    <div
      role="dialog"
      aria-label="Preferencias de cookies"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-2xl rounded-xl border border-border bg-background p-5 shadow-lg"
    >
      <p className="text-sm text-foreground">
        Usamos cookies técnicas para que Habilo funcione. Si aceptas, también usamos analítica
        para entender qué páginas ayudan a encontrar profesor.
      </p>
      <p className="mt-2 text-sm">
        <Link href="/legal/privacidad" className="text-primary hover:underline">
          Política de privacidad
        </Link>
      </p>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button variant="outline" className="w-full" onClick={() => decidir(false)}>
          Solo esenciales
        </Button>
        <Button className="w-full" onClick={() => decidir(true)}>
          Aceptar analítica
        </Button>
      </div>
    </div>
  )
}

export function AnalyticsGate() {
  const { analytics } = useConsent()
  if (!analytics) return null
  return <Analytics />
}
