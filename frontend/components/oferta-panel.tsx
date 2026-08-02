"use client"

import { useEffect, useState, useCallback } from "react"
import {
  listarOfertas,
  crearOferta,
  crearOfertaPorHoras,
  confirmarPrecioPublicado,
  aceptarOferta,
  rechazarOferta,
  crearPago,
  Oferta,
  ApiError,
} from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import StripeProvider from "@/components/stripe-provider"
import PaymentForm from "@/components/payment-form"
import { Loader, Tag, Check, X, Clock } from "lucide-react"

interface OfertaPanelProps {
  solicitudId: string
  currentUserId: string
  tipoPrecioServicio: "fijo" | "hora"
  refreshSignal: number
  esCliente: boolean
  onPagoConfirmado: () => void
}

export default function OfertaPanel({
  solicitudId,
  currentUserId,
  tipoPrecioServicio,
  refreshSignal,
  esCliente,
  onPagoConfirmado,
}: OfertaPanelProps) {
  const [ofertas, setOfertas] = useState<Oferta[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [procesando, setProcesando] = useState(false)

  const [nuevaOfertaOpen, setNuevaOfertaOpen] = useState(false)
  const [precio, setPrecio] = useState("")
  const [horas, setHoras] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [fechaHoraPropuesta, setFechaHoraPropuesta] = useState("")

  const [pagoOpen, setPagoOpen] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    try {
      setOfertas(await listarOfertas(solicitudId))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron cargar las ofertas")
    } finally {
      setCargando(false)
    }
  }, [solicitudId])

  useEffect(() => {
    cargar()
  }, [cargar, refreshSignal])

  const ofertaActiva = ofertas.find((o) => o.estado === "pendiente" || o.estado === "aceptada")

  const handleCrearOferta = async () => {
    setProcesando(true)
    setError(null)
    try {
      const fechaIso = fechaHoraPropuesta ? new Date(fechaHoraPropuesta).toISOString() : undefined
      if (tipoPrecioServicio === "hora") {
        const horasNum = parseFloat(horas)
        if (!horasNum || horasNum <= 0) return
        await crearOfertaPorHoras(solicitudId, horasNum, descripcion || undefined, fechaIso)
      } else {
        const precioNum = parseFloat(precio)
        if (!precioNum || precioNum <= 0) return
        await crearOferta(solicitudId, precioNum, descripcion || undefined, fechaIso)
      }
      setNuevaOfertaOpen(false)
      setPrecio("")
      setHoras("")
      setDescripcion("")
      setFechaHoraPropuesta("")
      await cargar()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo enviar la oferta")
    } finally {
      setProcesando(false)
    }
  }

  const handleConfirmarPrecioPublicado = async () => {
    setProcesando(true)
    setError(null)
    try {
      await confirmarPrecioPublicado(solicitudId)
      await cargar()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo confirmar el precio")
    } finally {
      setProcesando(false)
    }
  }

  const handleAceptar = async (ofertaId: string) => {
    setProcesando(true)
    setError(null)
    try {
      await aceptarOferta(ofertaId)
      await cargar()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo aceptar la oferta")
    } finally {
      setProcesando(false)
    }
  }

  const handleRechazar = async (ofertaId: string) => {
    setProcesando(true)
    setError(null)
    try {
      await rechazarOferta(ofertaId)
      await cargar()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo rechazar la oferta")
    } finally {
      setProcesando(false)
    }
  }

  const handleAbrirPago = async () => {
    if (!ofertaActiva) return
    setProcesando(true)
    setError(null)
    try {
      const { client_secret } = await crearPago(ofertaActiva.id)
      setClientSecret(client_secret)
      setPagoOpen(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo iniciar el pago")
    } finally {
      setProcesando(false)
    }
  }

  const handlePagoExitoso = () => {
    setPagoOpen(false)
    onPagoConfirmado()
  }

  if (cargando) {
    return (
      <div className="flex justify-center py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader className="animate-spin" size={13} /> Cargando ofertas...
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-center py-2">
      <div className="bg-secondary rounded-2xl px-5 py-4 text-center space-y-3 max-w-xs">
        {error && <p className="text-xs text-destructive">{error}</p>}

        {ofertaActiva ? (
          <>
            <div className="flex items-center justify-center gap-2">
              <Tag size={14} />
              <span className="text-sm font-medium">{parseFloat(ofertaActiva.precio).toFixed(2)}€</span>
              <Badge variant={ofertaActiva.estado === "aceptada" ? "secondary" : "default"}>
                {ofertaActiva.estado === "aceptada" ? "Aceptada" : "Pendiente"}
              </Badge>
            </div>
            {ofertaActiva.horas && (
              <p className="text-xs text-muted-foreground">{parseFloat(ofertaActiva.horas)} horas</p>
            )}
            {ofertaActiva.descripcion && (
              <p className="text-xs text-muted-foreground">{ofertaActiva.descripcion}</p>
            )}
            {ofertaActiva.fecha_hora_propuesta && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Clock size={12} />
                <span>
                  {new Date(ofertaActiva.fecha_hora_propuesta).toLocaleString("es-ES", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}

            {ofertaActiva.estado === "pendiente" && ofertaActiva.autor_id !== currentUserId && (
              <div className="flex gap-2 justify-center">
                <Button size="sm" disabled={procesando} onClick={() => handleAceptar(ofertaActiva.id)}>
                  <Check size={14} /> Aceptar
                </Button>
                <Button size="sm" variant="outline" disabled={procesando} onClick={() => handleRechazar(ofertaActiva.id)}>
                  <X size={14} /> Rechazar
                </Button>
              </div>
            )}

            {ofertaActiva.estado === "pendiente" && ofertaActiva.autor_id === currentUserId && (
              <p className="text-xs text-muted-foreground">Esperando respuesta a tu oferta</p>
            )}

            {ofertaActiva.estado === "aceptada" && esCliente && (
              <Button size="sm" disabled={procesando} onClick={handleAbrirPago} className="w-full">
                Confirmar y pagar
              </Button>
            )}

            {ofertaActiva.estado === "aceptada" && !esCliente && (
              <p className="text-xs text-muted-foreground">Esperando que el cliente confirme el pago</p>
            )}
          </>
        ) : (
          <div className="flex gap-2 justify-center flex-wrap">
            {tipoPrecioServicio === "fijo" && (
              <Button size="sm" variant="outline" disabled={procesando} onClick={handleConfirmarPrecioPublicado}>
                Confirmar al precio publicado
              </Button>
            )}
            <Button size="sm" variant="outline" disabled={procesando} onClick={() => setNuevaOfertaOpen(true)}>
              {tipoPrecioServicio === "hora" ? (
                <>
                  <Clock size={14} /> Proponer horas
                </>
              ) : (
                <>
                  <Tag size={14} /> Hacer una oferta
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      <Dialog open={nuevaOfertaOpen} onOpenChange={setNuevaOfertaOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{tipoPrecioServicio === "hora" ? "Proponer horas" : "Hacer una oferta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {tipoPrecioServicio === "hora" ? (
              <Input
                type="number"
                step="0.5"
                min="0"
                placeholder="Número de horas"
                value={horas}
                onChange={(e) => setHoras(e.target.value)}
              />
            ) : (
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="Precio (€)"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
              />
            )}
            <Textarea
              placeholder="¿Qué incluye? (opcional)"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
            />
            <div className="space-y-1.5 text-left">
              <label className="text-xs text-muted-foreground">¿Cuándo te vendría bien? (opcional)</label>
              <Input
                type="datetime-local"
                value={fechaHoraPropuesta}
                min={new Date().toISOString().slice(0, 16)}
                onChange={(e) => setFechaHoraPropuesta(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              disabled={procesando || (tipoPrecioServicio === "hora" ? !horas : !precio)}
              onClick={handleCrearOferta}
            >
              Enviar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={pagoOpen} onOpenChange={setPagoOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>Confirmar y pagar</DialogTitle>
          </DialogHeader>
          {clientSecret && (
            <StripeProvider clientSecret={clientSecret}>
              <PaymentForm onSuccess={handlePagoExitoso} />
            </StripeProvider>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}