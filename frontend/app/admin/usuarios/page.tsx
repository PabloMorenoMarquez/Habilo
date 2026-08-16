"use client"

import { useEffect, useState, useCallback } from "react"
import {
  buscarUsuariosAdmin,
  getUsuariosBaneados,
  banearUsuario,
  desbanearUsuario,
  eliminarCuentaAdmin,
  UsuarioAdmin,
  ApiError,
} from "@/lib/api"
import { useAuth } from "@/context/auth-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Loader, Search, Ban, ShieldOff, Trash2 } from "lucide-react"

export default function AdminUsuariosPage() {
  const { user: currentUser } = useAuth()

  const [busqueda, setBusqueda] = useState("")
  const [resultados, setResultados] = useState<UsuarioAdmin[]>([])
  const [buscando, setBuscando] = useState(false)

  const [baneados, setBaneados] = useState<UsuarioAdmin[]>([])
  const [cargandoBaneados, setCargandoBaneados] = useState(true)

  const [error, setError] = useState<string | null>(null)
  const [procesando, setProcesando] = useState<string | null>(null)
  const [baneoAbierto, setBaneoAbierto] = useState<string | null>(null)
  const [motivo, setMotivo] = useState("")

  const cargarBaneados = useCallback(async () => {
    setCargandoBaneados(true)
    try {
      setBaneados(await getUsuariosBaneados())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron cargar los usuarios baneados")
    } finally {
      setCargandoBaneados(false)
    }
  }, [])

  useEffect(() => {
    cargarBaneados()
  }, [cargarBaneados])

  const handleBuscar = async () => {
    if (!busqueda.trim()) return
    setBuscando(true)
    setError(null)
    try {
      setResultados(await buscarUsuariosAdmin(busqueda.trim()))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo buscar")
    } finally {
      setBuscando(false)
    }
  }

  const handleBanear = async () => {
    if (!baneoAbierto || !motivo.trim()) return
    setProcesando(baneoAbierto)
    setError(null)
    try {
      await banearUsuario(baneoAbierto, motivo.trim())
      setBaneoAbierto(null)
      setMotivo("")
      setResultados((prev) => prev.filter((u) => u.id !== baneoAbierto))
      await cargarBaneados()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo banear al usuario")
    } finally {
      setProcesando(null)
    }
  }

  const handleEliminarCuenta = async (u: UsuarioAdmin) => {
    const confirmado = window.confirm(
      `¿Seguro que quieres eliminar la cuenta de ${u.nombre} (${u.email})? Esta acción es irreversible: se cancelarán sus solicitudes activas (con reembolso si aplica), se desactivarán sus servicios publicados, y sus datos personales se anonimizarán.`
    )
    if (!confirmado) return

    setProcesando(u.id)
    setError(null)
    try {
      await eliminarCuentaAdmin(u.id)
      setResultados((prev) => prev.filter((r) => r.id !== u.id))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar la cuenta")
    } finally {
      setProcesando(null)
    }
  }

  const handleDesbanear = async (id: string) => {
    setProcesando(id)
    setError(null)
    try {
      await desbanearUsuario(id)
      await cargarBaneados()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo desbanear al usuario")
    } finally {
      setProcesando(null)
    }
  }

  return (
    <div className="space-y-8">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Buscar usuario</h2>
        <div className="flex gap-2">
          <Input
            placeholder="Buscar por email..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
          />
          <Button onClick={handleBuscar} disabled={buscando || !busqueda.trim()}>
            <Search size={16} /> Buscar
          </Button>
        </div>

        {buscando ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
            <Loader className="animate-spin" size={16} /> Buscando...
          </div>
        ) : (
          resultados.length > 0 && (
            <div className="space-y-2">
              {resultados.map((u) => (
                <Card key={u.id}>
                  <CardContent className="pt-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium flex items-center gap-2">
                        {u.nombre}
                        {u.es_admin && <Badge variant="secondary">Admin</Badge>}
                        {u.baneado && <Badge variant="destructive">Baneado</Badge>}
                        {u.cuenta_eliminada && <Badge variant="outline">Cuenta eliminada</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>

                    {!u.cuenta_eliminada && u.id !== currentUser?.id && !u.es_admin && (
                      <div className="flex gap-2">
                        {!u.baneado && (
                          <Dialog
                            open={baneoAbierto === u.id}
                            onOpenChange={(open) => {
                              setBaneoAbierto(open ? u.id : null)
                              if (!open) setMotivo("")
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button size="sm" variant="destructive" disabled={procesando === u.id}>
                                <Ban size={14} /> Banear
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Banear a {u.nombre}</DialogTitle>
                              </DialogHeader>
                              <Textarea
                                placeholder="Motivo del baneo"
                                value={motivo}
                                onChange={(e) => setMotivo(e.target.value)}
                                rows={3}
                              />
                              <DialogFooter>
                                <Button variant="ghost" onClick={() => setBaneoAbierto(null)}>
                                  Cancelar
                                </Button>
                                <Button
                                  variant="destructive"
                                  disabled={!motivo.trim() || procesando === u.id}
                                  onClick={handleBanear}
                                >
                                  Confirmar baneo
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}

                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={procesando === u.id}
                          onClick={() => handleEliminarCuenta(u)}
                        >
                          <Trash2 size={14} /> Eliminar cuenta
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Usuarios baneados</h2>

        {cargandoBaneados ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
            <Loader className="animate-spin" size={16} /> Cargando...
          </div>
        ) : baneados.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No hay usuarios baneados actualmente.</p>
        ) : (
          <div className="space-y-2">
            {baneados.map((u) => (
              <Card key={u.id}>
                <CardContent className="pt-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">{u.nombre}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                    {u.motivo_baneo && <p className="text-sm mt-1">{u.motivo_baneo}</p>}
                  </div>
                  <Button size="sm" variant="outline" disabled={procesando === u.id} onClick={() => handleDesbanear(u.id)}>
                    <ShieldOff size={14} /> Desbanear
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}