"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Loader, Clock, X } from "lucide-react"
import { actualizarPerfilProveedor, ApiError } from "@/lib/api"
import {
  DIAS,
  MAX_TRAMOS,
  siguienteTramo,
  activarDia,
  copiarADemas,
  erroresHorario,
  limpiarHorario,
  type Dia,
  type Horario,
  type Tramo,
} from "@/lib/horario"

// Horario semanal: por cada día, disponible o no, y de 1 a 3 tramos.
export default function HorarioDisponibilidad({
  horarioInicial,
  onGuardado,
}: {
  horarioInicial: Horario | null
  onGuardado?: (horario: Horario | null) => void
}) {
  const [horario, setHorario] = useState<Horario>(horarioInicial ?? {})
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guardadoOk, setGuardadoOk] = useState(false)

  const errores = erroresHorario(horario)
  const hayErrores = Object.keys(errores).length > 0
  const diasActivos = DIAS.filter(({ dia }) => (horario[dia]?.length ?? 0) > 0).length

  const cambiar = (nuevo: Horario) => {
    setHorario(nuevo)
    setGuardadoOk(false)
  }

  const toggleDia = (dia: Dia, activo: boolean) => {
    if (activo) return cambiar(activarDia(horario, dia))
    const { [dia]: _quitado, ...resto } = horario
    cambiar(resto)
  }

  const setTramos = (dia: Dia, tramos: Tramo[]) => cambiar({ ...horario, [dia]: tramos })

  const handleGuardar = async () => {
    setError(null)
    setGuardando(true)
    try {
      const limpio = limpiarHorario(horario)
      await actualizarPerfilProveedor({ horario: limpio })
      setGuardadoOk(true)
      onGuardado?.(limpio)
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

      <div className="divide-y divide-border rounded-lg border border-border">
        {DIAS.map(({ dia, nombre }) => {
          const tramos = horario[dia] ?? []
          const activo = tramos.length > 0
          const errorDia = errores[dia]
          const idError = `horario-error-${dia}`
          const aria = (etiqueta: string) => ({
            "aria-label": etiqueta,
            "aria-invalid": errorDia ? true : undefined,
            "aria-describedby": errorDia ? idError : undefined,
          })
          return (
            <div key={dia} role="group" aria-label={nombre} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start">
              <div className="flex items-center gap-3 sm:w-36 sm:pt-1.5">
                <Switch checked={activo} onCheckedChange={(v) => toggleDia(dia, v)} aria-label={nombre} />
                <span className={`text-sm ${activo ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                  {nombre}
                </span>
              </div>

              {activo ? (
                <div className="flex-1 space-y-2">
                  {tramos.map((tramo, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="time"
                        {...aria(`${nombre}, tramo ${i + 1}, inicio`)}
                        value={tramo.inicio}
                        onChange={(e) =>
                          setTramos(dia, tramos.map((t, j) => (j === i ? { ...t, inicio: e.target.value } : t)))
                        }
                        className="h-9 rounded-md border border-border bg-background px-2 text-sm aria-invalid:border-destructive"
                      />
                      <span className="text-xs text-muted-foreground">a</span>
                      <input
                        type="time"
                        {...aria(`${nombre}, tramo ${i + 1}, fin`)}
                        value={tramo.fin}
                        onChange={(e) =>
                          setTramos(dia, tramos.map((t, j) => (j === i ? { ...t, fin: e.target.value } : t)))
                        }
                        className="h-9 rounded-md border border-border bg-background px-2 text-sm aria-invalid:border-destructive"
                      />
                      {tramos.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="-my-1 size-11 text-muted-foreground"
                          aria-label={`Quitar tramo ${i + 1} del ${nombre.toLowerCase()}`}
                          onClick={() => setTramos(dia, tramos.filter((_, j) => j !== i))}
                        >
                          <X size={14} />
                        </Button>
                      )}
                    </div>
                  ))}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    {tramos.length < MAX_TRAMOS && (
                      <button
                        type="button"
                        className="text-xs font-medium text-primary hover:underline"
                        onClick={() => setTramos(dia, [...tramos, siguienteTramo(tramos)])}
                      >
                        + Añadir tramo
                      </button>
                    )}
                    {diasActivos > 1 && (
                      <button
                        type="button"
                        className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
                        onClick={() => cambiar(copiarADemas(horario, dia))}
                      >
                        Copiar a los demás días
                      </button>
                    )}
                  </div>

                  {errorDia && (
                    <p id={idError} role="alert" className="text-xs text-destructive">
                      {errorDia}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground sm:pt-1.5">No disponible</p>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-3">
        <Button size="sm" onClick={handleGuardar} disabled={guardando || hayErrores}>
          {guardando && <Loader size={14} className="animate-spin mr-2" />}
          Guardar horario
        </Button>
        {guardadoOk && <span className="text-xs text-emerald-600">Guardado</span>}
      </div>

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
