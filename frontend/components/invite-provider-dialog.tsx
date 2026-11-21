"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Share2, Copy, Check, Users } from "lucide-react"

interface InviteProviderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  codigoReferido: string | null | undefined
}

export function InviteProviderDialog({ open, onOpenChange, codigoReferido }: InviteProviderDialogProps) {
  const [copiado, setCopiado] = useState(false)

  if (!codigoReferido) return null

  // A /da-clases: quien recibe la invitación es un profesional, no una familia.
  const enlace = `${typeof window !== "undefined" ? window.location.origin : ""}/da-clases?ref=${codigoReferido}`
  const mensaje = `Estoy en Habilo, una nueva plataforma para encontrar profesionales en Talavera. Puedes crear tu perfil gratis aquí: ${enlace}`

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(mensaje)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch (err) {
      console.error("No se pudo copiar:", err)
    }
  }

  const handleCompartir = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text: mensaje })
      } catch {
        // el usuario cerró el share sheet, no hacemos nada
      }
    } else {
      handleCopiar()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm text-center">
        <DialogHeader>
          <div className="mx-auto p-3 rounded-xl bg-primary/10 text-primary w-fit mb-2">
            <Users size={24} />
          </div>
          <DialogTitle>¿Conoces a otro profesional?</DialogTitle>
          <DialogDescription>
            Invítalo a Habilo. Si se registra y publica un anuncio, tus anuncios salen los primeros en el buscador durante 15 días, con la etiqueta «Destacado».
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={handleCompartir} className="w-full gap-2">
            <Share2 size={16} /> Compartir invitación
          </Button>
          <Button variant="outline" onClick={handleCopiar} className="w-full gap-2">
            {copiado ? <Check size={16} /> : <Copy size={16} />}
            {copiado ? "Copiado" : "Copiar mensaje"}
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full">
            Ahora no
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}