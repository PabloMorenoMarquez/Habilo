"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader, Clock } from "lucide-react"
import { actualizarPerfilProveedor, ApiError } from "@/lib/api"

const DIAS = [
  { numero: 1, label: "L" },
  { numero: 2, label: "M" },
  { numero: 3, label: "X" },
  { numero: 4, label: "J" },
  { numero: 5, label: "V" },
  { numero: 6, label: "S" },
  { numero: 7, label: "D" },
]

function parseDias(csv: string | null): Set<number> {
  if (!csv) return new Set()
  return new Set(
    csv
      .split(",")
      .map((n) => parseInt(n.trim(), 10))
      .filter((n) => !isNaN(n))
  )
}

export default function HorarioDisponibilidad({
  diasIniciales,
  horaInicioInicial,
  horaFinInicial,
  onGuardado,
}: {
  diasIniciales: string | null
  horaInicioInicial: string | null
  horaFinInicial: string | null
  onGuardado?: (datos: { dias_disponibles: string; hora_inicio: string; hora_fin: string }) => void
}) {
  const [diasSeleccionados, setDiasSeleccionados] = useState<Set<number>>(parseDias(diasIniciales))
  const [horaInicio, setHoraInicio] = useState(horaInicioInicial || "")
  const [horaFin, setHoraFin] = useState(horaFinInicial || "")
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guardadoOk, setGuardadoOk] = useState(false)

  const toggleDia = (numero: number) => {
    setGuardadoOk(false)
    setDiasSeleccionados((prev) => {
      const copia = new Set(prev)
      if (copia.has(numero)) copia.delete(numero)
      else copia.add(numero)
      return copia
    })
  }

  const handleGuardar = async () => {
    setError(null)
    setGuardando(true)
    try {
      const diasCsv = Array.from(diasSeleccionados)
        .sort((a, b) => a - b)
        .join(",")
      await actualizarPerfilProveedor({
        dias_disponibles: diasCsv,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
      })
      setGuardadoOk(true)
      onGuardado?.({ dias_disponibles: diasCsv, hora_inicio: horaInicio, hora_fin: horaFin })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el horario")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock size={16} className="text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Horario de disponibilidad</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Esto es solo informativo para tus clientes — no bloquea ni reserva ningún hueco automáticamente.
      </p>

      <div className="flex gap-1.5">
        {DIAS.map((dia) => (
          <button
            key={dia.numero}
            type="button"
            onClick={() => toggleDia(dia.numero)}
            className={`w-9 h-9 rounded-full text-sm font-medium transition-colors ${
              diasSeleccionados.has(dia.numero)
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {dia.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">De</label>
          <input
            type="time"
            value={horaInicio}
            onChange={(e) => {
              setHoraInicio(e.target.value)
              setGuardadoOk(false)
            }}
            className="h-9 rounded-md border border-border bg-background px-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">a</label>
          <input
            type="time"
            value={horaFin}
            onChange={(e) => {
              setHoraFin(e.target.value)
              setGuardadoOk(false)
            }}
            className="h-9 rounded-md border border-border bg-background px-2 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button size="sm" onClick={handleGuardar} disabled={guardando}>
          {guardando && <Loader size={14} className="animate-spin mr-2" />}
          Guardar horario
        </Button>
        {guardadoOk && <span className="text-xs text-emerald-600">Guardado</span>}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}