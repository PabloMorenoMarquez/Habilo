"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Copy, MessageCircle, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getMiCodigoResenas } from "@/lib/api"

// El enlace se comparte fuera de la web (WhatsApp), así que siempre apunta al
// dominio público, no al entorno en el que se abra el panel.
const BASE_ENLACE = "https://habilo.es/opina/"

function mensajeWhatsApp(enlace: string) {
  return (
    "Hola, estoy en Habilo, una web de profesores de Talavera. Si te están sirviendo mis clases, " +
    `¿me dejas una opinión? Son dos minutos: ${enlace}`
  )
}

/**
 * Tarjeta del panel del profesor con su enlace para pedir opiniones a sus alumnos.
 * Si el código no se puede cargar, no se muestra nada.
 */
export default function PedirResenasCard() {
  const [codigo, setCodigo] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [errorCopia, setErrorCopia] = useState(false)
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    getMiCodigoResenas()
      .then((data) => setCodigo(data.codigo))
      .catch(() => setCodigo(null))
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current)
    }
  }, [])

  if (!codigo) return null

  const enlace = `${BASE_ENLACE}${codigo}`
  const urlWhatsApp = `https://wa.me/?text=${encodeURIComponent(mensajeWhatsApp(enlace))}`

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(enlace)
      setErrorCopia(false)
      setCopiado(true)
      if (temporizador.current) clearTimeout(temporizador.current)
      temporizador.current = setTimeout(() => setCopiado(false), 2000)
    } catch {
      setErrorCopia(true)
    }
  }

  return (
    <Card>
      <CardContent className="p-5">
        <section aria-labelledby="pedir-resenas-titulo" className="space-y-3">
          <div className="flex items-center gap-2">
            <Star size={16} className="text-muted-foreground" aria-hidden="true" />
            <h2 id="pedir-resenas-titulo" className="text-sm font-medium text-foreground">
              Pide opiniones a tus alumnos
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Manda este enlace a tus alumnos o a sus familias. No necesitan cuenta. Revisamos cada
            opinión antes de publicarla en tu perfil.
          </p>

          <p className="rounded-md border border-border bg-secondary/60 px-3 py-2 text-sm font-medium text-foreground break-all select-all">
            {enlace}
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={copiar} aria-live="polite">
              {copiado ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              {copiado ? "Copiado" : "Copiar"}
            </Button>
            <Button asChild>
              <a href={urlWhatsApp} target="_blank" rel="noopener noreferrer">
                <MessageCircle aria-hidden="true" />
                Enviar por WhatsApp
              </a>
            </Button>
          </div>

          {errorCopia && (
            <p className="text-xs text-destructive">
              No se pudo copiar. Mantén pulsado el enlace para copiarlo.
            </p>
          )}
        </section>
      </CardContent>
    </Card>
  )
}
