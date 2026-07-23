"use client"

import { useEffect, useState, useCallback } from "react"
import { getReportesAdmin, cambiarEstadoReporte, ReporteAdmin, ApiError } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader, Check, X } from "lucide-react"

const ESTADO_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  resuelto: "Resuelto",
  descartado: "Descartado",
}

const ESTADO_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pendiente: "default",
  resuelto: "secondary",
  descartado: "outline",
}

const MOTIVO_LABELS: Record<string, string> = {
  contenido_inapropiado: "Contenido inapropiado",
  spam: "Spam",
  comportamiento_sospechoso: "Comportamiento sospechoso",
  no_se_presento: "No se presentó",
  otro: "Otro",
}

export default function AdminReportesPage() {
  const [reportes, setReportes] = useState<ReporteAdmin[]>([])
  const [filtro, setFiltro] = useState<string>("pendiente")
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [procesando, setProcesando] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const estado = filtro === "todos" ? undefined : filtro
      setReportes(await getReportesAdmin(estado))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron cargar los reportes")
    } finally {
      setCargando(false)
    }
  }, [filtro])

  useEffect(() => {
    cargar()
  }, [cargar])

  const handleCambiarEstado = async (id: string, estado: "resuelto" | "descartado") => {
    setProcesando(id)
    try {
      await cambiarEstadoReporte(id, estado)
      await cargar()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo actualizar el reporte")
    } finally {
      setProcesando(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {reportes.length} reporte{reportes.length === 1 ? "" : "s"}
        </p>
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendiente">Pendientes</SelectItem>
            <SelectItem value="resuelto">Resueltos</SelectItem>
            <SelectItem value="descartado">Descartados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {cargando ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader className="animate-spin" size={16} /> Cargando reportes...
        </div>
      ) : reportes.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No hay reportes en este filtro.</p>
      ) : (
        <div className="space-y-3">
          {reportes.map((r) => (
            <Card key={r.id}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">
                      {r.autor_nombre} <span className="text-muted-foreground font-normal">reportó a</span>{" "}
                      {r.reportado_nombre}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.autor_email} → {r.reportado_email}
                    </p>
                  </div>
                  <Badge variant={ESTADO_VARIANTS[r.estado] ?? "default"}>
                    {ESTADO_LABELS[r.estado] ?? r.estado}
                  </Badge>
                </div>

                <div className="text-sm">
                  <span className="font-medium">{MOTIVO_LABELS[r.motivo] ?? r.motivo}</span>
                  {r.descripcion && <p className="text-muted-foreground mt-1">{r.descripcion}</p>}
                </div>

                <p className="text-xs text-muted-foreground">
                  {r.fecha ? new Date(r.fecha).toLocaleString("es-ES") : ""}
                </p>

                {r.estado === "pendiente" && (
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={procesando === r.id}
                      onClick={() => handleCambiarEstado(r.id, "resuelto")}
                    >
                      <Check size={14} /> Marcar resuelto
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={procesando === r.id}
                      onClick={() => handleCambiarEstado(r.id, "descartado")}
                    >
                      <X size={14} /> Descartar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}