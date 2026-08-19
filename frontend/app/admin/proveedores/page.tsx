"use client"

import { useEffect, useState, useCallback } from "react"
import {
  getProveedoresPendientes,
  verificarProveedor,
  rechazarProveedor,
  getUrlDocumentoProveedor,
  PerfilProveedorAdmin,
  ApiError,
} from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Loader, Check, FileText } from "lucide-react"

export default function AdminProveedoresPage() {
  const [perfiles, setPerfiles] = useState<PerfilProveedorAdmin[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [procesando, setProcesando] = useState<string | null>(null)
  const [rechazoAbierto, setRechazoAbierto] = useState<string | null>(null)
  const [motivo, setMotivo] = useState("")
  const [abriendoDocumento, setAbriendoDocumento] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setPerfiles(await getProveedoresPendientes())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron cargar los perfiles")
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const handleVerificar = async (id: string) => {
    setProcesando(id)
    try {
      await verificarProveedor(id)
      await cargar()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo verificar el perfil")
    } finally {
      setProcesando(null)
    }
  }

  const handleRechazar = async () => {
    if (!rechazoAbierto || !motivo.trim()) return
    setProcesando(rechazoAbierto)
    try {
      await rechazarProveedor(rechazoAbierto, motivo.trim())
      setRechazoAbierto(null)
      setMotivo("")
      await cargar()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo rechazar el documento")
    } finally {
      setProcesando(null)
    }
  }

  const handleVerDocumento = async (perfilId: string) => {
    setAbriendoDocumento(perfilId)
    setError(null)
    try {
      const { url } = await getUrlDocumentoProveedor(perfilId)
      window.open(url, "_blank", "noopener,noreferrer")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo abrir el documento")
    } finally {
      setAbriendoDocumento(null)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {perfiles.length} proveedor{perfiles.length === 1 ? "" : "es"} pendiente{perfiles.length === 1 ? "" : "s"} de
        verificación
      </p>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {cargando ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader className="animate-spin" size={16} /> Cargando...
        </div>
      ) : perfiles.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No hay documentos pendientes de revisión.</p>
      ) : (
        <div className="space-y-3">
          {perfiles.map((p) => (
            <Card key={p.id}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">{p.usuario_nombre}</p>
                    <p className="text-xs text-muted-foreground">{p.usuario_email}</p>
                  </div>
                  <Badge variant="outline">
                    {p.experiencia_años ? `${p.experiencia_años} años exp.` : "Sin experiencia indicada"}
                  </Badge>
                </div>

                {p.descripcion && <p className="text-sm text-muted-foreground">{p.descripcion}</p>}

                <button
                  type="button"
                  onClick={() => handleVerDocumento(p.id)}
                  disabled={abriendoDocumento === p.id}
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline disabled:opacity-50"
                >
                  {abriendoDocumento === p.id ? (
                    <Loader size={14} className="animate-spin" />
                  ) : (
                    <FileText size={14} />
                  )}
                  Ver documento
                </button>

                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" disabled={procesando === p.id} onClick={() => handleVerificar(p.id)}>
                    <Check size={14} /> Verificar
                  </Button>

                  <Dialog
                    open={rechazoAbierto === p.id}
                    onOpenChange={(open) => {
                      setRechazoAbierto(open ? p.id : null)
                      if (!open) setMotivo("")
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button size="sm" variant="ghost" disabled={procesando === p.id}>
                        Rechazar
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Rechazar documento</DialogTitle>
                      </DialogHeader>
                      <Textarea
                        placeholder="Motivo del rechazo"
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        rows={3}
                      />
                      <DialogFooter>
                        <Button variant="ghost" onClick={() => setRechazoAbierto(null)}>
                          Cancelar
                        </Button>
                        <Button
                          variant="destructive"
                          disabled={!motivo.trim() || procesando === p.id}
                          onClick={handleRechazar}
                        >
                          Confirmar rechazo
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}