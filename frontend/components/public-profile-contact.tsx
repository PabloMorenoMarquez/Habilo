"use client"

import { useState } from "react"
import { MessageCircle, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LeadContactDialog } from "@/components/lead-contact-dialog"
import { captureIfConsented } from "@/lib/analytics"

interface PublicProfileContactProps {
  perfilId: string
  profesionalNombre: string
}

export function PublicProfileContact({ perfilId, profesionalNombre }: PublicProfileContactProps) {
  const [leadOpen, setLeadOpen] = useState(false)

  const handleShare = async () => {
    const url = `${window.location.origin}/profesores/${perfilId}`
    const texto = `Clases con ${profesionalNombre} en Habilo`

    if (navigator.share) {
      try {
        await navigator.share({ title: profesionalNombre, text: texto, url })
      } catch {
        // El usuario puede cancelar el diálogo nativo; no es un fallo.
        return
      }
      captureIfConsented("share_clicked", { channel: "native", provider_id: perfilId })
      return
    }

    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${texto}: ${url}`)}`,
      "_blank",
      "noopener,noreferrer"
    )
    captureIfConsented("share_clicked", { channel: "whatsapp", provider_id: perfilId })
  }

  return (
    <div className="space-y-2">
      <Button size="lg" className="w-full gap-2" onClick={() => setLeadOpen(true)}>
        <MessageCircle size={18} /> Contactar
      </Button>
      <Button variant="outline" size="lg" className="w-full gap-2" onClick={handleShare}>
        <Share2 size={18} /> Compartir por WhatsApp
      </Button>
      <LeadContactDialog
        open={leadOpen}
        onOpenChange={setLeadOpen}
        perfilId={perfilId}
        profesionalNombre={profesionalNombre}
      />
    </div>
  )
}
