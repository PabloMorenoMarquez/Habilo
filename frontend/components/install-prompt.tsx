'use client'

import { useEffect, useState } from 'react'
import { X, Share, PlusSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isIos() {
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase())
}

function isInStandaloneMode() {
  return (
    ('standalone' in window.navigator && (window.navigator as any).standalone) ||
    window.matchMedia('(display-mode: standalone)').matches
  )
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosHint, setShowIosHint] = useState(false)
  const [dismissed, setDismissed] = useState(true) // arranca oculto hasta comprobar

  useEffect(() => {
    if (isInStandaloneMode()) return // ya está instalada, no molestar

    const wasDismissed = localStorage.getItem('install-prompt-dismissed')
    if (wasDismissed) return

    setDismissed(false)

    if (isIos()) {
      setShowIosHint(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem('install-prompt-dismissed', '1')
    setDismissed(true)
  }

  if (dismissed) return null
  if (!deferredPrompt && !showIosHint) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border bg-background p-4 shadow-lg md:left-auto md:right-4">
      <button
        onClick={handleDismiss}
        className="absolute right-2 top-2 text-muted-foreground"
        aria-label="Cerrar"
      >
        <X className="h-4 w-4" />
      </button>

      {showIosHint ? (
        <div className="pr-6 text-sm">
          <p className="font-medium">Instala ServiClick en tu iPhone</p>
          <p className="mt-1 text-muted-foreground">
            Toca <Share className="mx-1 inline h-3.5 w-3.5" /> y luego{' '}
            <PlusSquare className="mx-1 inline h-3.5 w-3.5" /> "Añadir a pantalla de inicio".
          </p>
        </div>
      ) : (
        <div className="pr-6">
          <p className="text-sm font-medium">Instala ServiClick</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Acceso más rápido y notificaciones de tus solicitudes.
          </p>
          <Button size="sm" className="mt-3" onClick={handleInstall}>
            Instalar
          </Button>
        </div>
      )}
    </div>
  )
}