"use client"

import { useEffect, useState } from "react"
import { Tag, Clock } from "lucide-react"
import { listarOfertas, Oferta } from "@/lib/api"

export default function ResumenAcuerdo({
  solicitudId,
  refreshSignal,
}: {
  solicitudId: string
  refreshSignal: number
}) {
  const [oferta, setOferta] = useState<Oferta | null>(null)

  useEffect(() => {
    listarOfertas(solicitudId)
      .then((ofertas) => {
        const aceptada = ofertas.find((o) => o.estado === "aceptada")
        setOferta(aceptada || null)
      })
      .catch((err) => console.error("No se pudo cargar el acuerdo:", err))
  }, [solicitudId, refreshSignal])

  if (!oferta) return null

  return (
    <div className="flex justify-center py-2">
      <div className="bg-secondary/60 border border-border rounded-2xl px-5 py-3 text-center space-y-1.5 max-w-xs">
        <div className="flex items-center justify-center gap-2">
          <Tag size={14} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">{parseFloat(oferta.precio).toFixed(2)}€</span>
          {oferta.horas && <span className="text-xs text-muted-foreground">({parseFloat(oferta.horas)}h)</span>}
        </div>
        {oferta.descripcion && (
          <p className="text-xs text-muted-foreground">{oferta.descripcion}</p>
        )}
        {oferta.fecha_hora_propuesta && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Clock size={12} />
            <span>
              {new Date(oferta.fecha_hora_propuesta).toLocaleString("es-ES", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}