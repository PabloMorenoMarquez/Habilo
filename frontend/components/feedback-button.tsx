"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { MessageSquarePlus, Loader, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ApiError, enviarFeedback } from "@/lib/api"

const TIPOS = [
  { value: "sugerencia" as const, label: "Sugerencia" },
  { value: "bug" as const, label: "Algo falla" },
  { value: "otro" as const, label: "Otro" },
]

export function FeedbackButton() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [tipo, setTipo] = useState<"sugerencia" | "bug" | "otro">("sugerencia")
  const [mensaje, setMensaje] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleEnviar = async () => {
    if (mensaje.trim().length < 3) return
    setEnviando(true)
    setError(null)
    try {
      await enviarFeedback({ tipo, mensaje: mensaje.trim(), pagina: pathname })
      setEnviado(true)
      setMensaje("")
      setTimeout(() => {
        setOpen(false)
        setEnviado(false)
      }, 1500)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo enviar. Inténtalo de nuevo.")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-shadow text-sm font-medium"
      >
        <MessageSquarePlus size={18} />
        <span className="hidden sm:inline">Danos tu opinión</span>
      </button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setMensaje(""); setError(null); setEnviado(false) } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Cuéntanos qué tal</DialogTitle>
          </DialogHeader>

          {enviado ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="p-3 rounded-full bg-emerald-100 text-emerald-600">
                <Check size={24} />
              </div>
              <p className="text-sm text-muted-foreground">¡Gracias! Lo tendremos en cuenta.</p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="flex gap-2">
                {TIPOS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTipo(t.value)}
                    className={`flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                      tipo === t.value ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-secondary/50"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <Textarea
                placeholder={tipo === "bug" ? "¿Qué ha pasado? Cuanto más detalle, mejor." : "Cuéntanos tu idea o comentario..."}
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                rows={4}
                autoFocus
              />

              {error && <p className="text-xs text-destructive">{error}</p>}

              <Button
                className="w-full"
                disabled={mensaje.trim().length < 3 || enviando}
                onClick={handleEnviar}
              >
                {enviando ? <Loader size={16} className="animate-spin" /> : "Enviar"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}