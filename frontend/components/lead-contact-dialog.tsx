"use client"

import { useState } from "react"
import posthog from "posthog-js"
import { Loader } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { crearLead } from "@/lib/api"
import { getUtm } from "@/lib/utm"

const isPostHogConfigured = Boolean(
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN && process.env.NEXT_PUBLIC_POSTHOG_HOST
)

type CanalContacto = "whatsapp" | "email"

interface LeadContactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  servicioId?: string
  perfilId?: string
  profesionalNombre: string
}

interface Errores {
  nombre?: string
  contacto?: string
  mensaje?: string
  consentimiento?: string
}

function esContactoValido(contacto: string, canal: CanalContacto): boolean {
  const valor = contacto.trim()
  if (canal === "email") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)
  }
  return valor.replace(/\D/g, "").length >= 9
}

export function LeadContactDialog({
  open,
  onOpenChange,
  servicioId,
  perfilId,
  profesionalNombre,
}: LeadContactDialogProps) {
  const [nombre, setNombre] = useState("")
  const [contacto, setContacto] = useState("")
  const [canal, setCanal] = useState<CanalContacto>("whatsapp")
  const [mensaje, setMensaje] = useState("")
  const [consentimiento, setConsentimiento] = useState(false)
  const [website, setWebsite] = useState("")
  const [errores, setErrores] = useState<Errores>({})
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)

  const reset = () => {
    setNombre("")
    setContacto("")
    setCanal("whatsapp")
    setMensaje("")
    setConsentimiento(false)
    setWebsite("")
    setErrores({})
    setEnviando(false)
    setEnviado(false)
    setErrorEnvio(null)
  }

  const handleOpenChange = (nuevo: boolean) => {
    if (!nuevo) reset()
    onOpenChange(nuevo)
  }

  const validar = (): Errores => {
    const nuevos: Errores = {}
    if (!nombre.trim()) {
      nuevos.nombre = "Escribe tu nombre."
    }
    if (!esContactoValido(contacto, canal)) {
      nuevos.contacto = "Indica un WhatsApp o email válido."
    }
    if (mensaje.trim().length < 10) {
      nuevos.mensaje = "Cuéntanos qué necesitas (mínimo 10 caracteres)."
    }
    if (!consentimiento) {
      nuevos.consentimiento = "Debes aceptar que el profesional reciba tus datos."
    }
    return nuevos
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorEnvio(null)
    const nuevosErrores = validar()
    setErrores(nuevosErrores)
    if (Object.keys(nuevosErrores).length > 0) return

    setEnviando(true)
    try {
      await crearLead({
        nombre: nombre.trim(),
        contacto: contacto.trim(),
        canal_contacto: canal,
        mensaje: mensaje.trim(),
        consentimiento,
        website,
        servicio_id: servicioId,
        perfil_id: perfilId,
        ...getUtm(),
        pagina_origen: window.location.href,
      })
      setEnviado(true)
      if (isPostHogConfigured) {
        posthog.capture("lead_submitted", {
          service_id: servicioId,
          perfil_id: perfilId,
          channel: canal,
        })
      }
    } catch {
      setErrorEnvio("No se pudo enviar. Inténtalo de nuevo.")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contactar con {profesionalNombre}</DialogTitle>
          <DialogDescription>Cuéntale qué necesitas. No hace falta crear cuenta.</DialogDescription>
        </DialogHeader>

        {enviado ? (
          <p className="text-sm text-foreground">
            Mensaje enviado. El profesional te contactará por WhatsApp o email.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lead-nombre">Nombre</Label>
              <Input
                id="lead-nombre"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                autoComplete="name"
                aria-invalid={Boolean(errores.nombre)}
                aria-describedby={errores.nombre ? "lead-nombre-error" : undefined}
              />
              {errores.nombre && (
                <p id="lead-nombre-error" className="text-sm text-destructive">
                  {errores.nombre}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-canal">Canal</Label>
              <select
                id="lead-canal"
                value={canal}
                onChange={(event) => setCanal(event.target.value as CanalContacto)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-contacto">WhatsApp o email</Label>
              <Input
                id="lead-contacto"
                value={contacto}
                onChange={(event) => setContacto(event.target.value)}
                autoComplete="email"
                aria-invalid={Boolean(errores.contacto)}
                aria-describedby={errores.contacto ? "lead-contacto-error" : undefined}
              />
              {errores.contacto && (
                <p id="lead-contacto-error" className="text-sm text-destructive">
                  {errores.contacto}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-mensaje">Mensaje</Label>
              <Textarea
                id="lead-mensaje"
                value={mensaje}
                onChange={(event) => setMensaje(event.target.value)}
                rows={4}
                aria-invalid={Boolean(errores.mensaje)}
                aria-describedby={errores.mensaje ? "lead-mensaje-error" : undefined}
              />
              {errores.mensaje && (
                <p id="lead-mensaje-error" className="text-sm text-destructive">
                  {errores.mensaje}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="lead-consentimiento"
                  checked={consentimiento}
                  onCheckedChange={(valor) => setConsentimiento(valor === true)}
                  aria-invalid={Boolean(errores.consentimiento)}
                  aria-describedby={errores.consentimiento ? "lead-consentimiento-error" : undefined}
                />
                <Label htmlFor="lead-consentimiento" className="font-normal leading-snug">
                  Acepto que el profesional reciba mis datos
                </Label>
              </div>
              {errores.consentimiento && (
                <p id="lead-consentimiento-error" className="text-sm text-destructive">
                  {errores.consentimiento}
                </p>
              )}
            </div>

            <div className="hidden" aria-hidden="true">
              <Input
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
              />
            </div>

            {errorEnvio && <p className="text-sm text-destructive">{errorEnvio}</p>}

            <Button type="submit" className="w-full" disabled={enviando}>
              {enviando ? <Loader size={18} className="animate-spin" /> : "Enviar mensaje"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
