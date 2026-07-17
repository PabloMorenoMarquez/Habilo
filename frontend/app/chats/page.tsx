"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { useEffect, useState, useRef, useCallback } from "react"
import Navbar from "@/components/navbar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send, Search, ArrowLeft, Loader, WifiOff, Star} from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { MoreVertical, Flag, Ban } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  getConversaciones,
  getHistorialMensajes,
  marcarMensajesLeidos,
  getWebSocketUrl,
  Conversacion,
  MensajeBackend,
  cambiarEstadoSolicitud,
  crearValoracion,
  ApiError,
  bloquearUsuario, 
  crearReporte
} from "@/lib/api"

const POLL_INTERVAL = 15000 // refresco de la lista lateral, en ms

function formatHora(fecha: string | null) {
  if (!fecha) return ""
  return new Date(fecha).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
}

function ChatsPageInner() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchConv, setSearchConv] = useState("")

  const [conversaciones, setConversaciones] = useState<Conversacion[]>([])
  const [cargandoLista, setCargandoLista] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [mensajes, setMensajes] = useState<MensajeBackend[]>([])
  const [cargandoMensajes, setCargandoMensajes] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const [wsConectado, setWsConectado] = useState(false)
  const [wsConectadoAlgunaVez, setWsConectadoAlgunaVez] = useState(false)

  const [procesandoEstado, setProcesandoEstado] = useState(false)
  const [valorarOpen, setValorarOpen] = useState(false)
  const [puntuacion, setPuntuacion] = useState(0)
  const [comentario, setComentario] = useState("")
  const [enviandoValoracion, setEnviandoValoracion] = useState(false)

  const [cancelarOpen, setCancelarOpen] = useState(false)
  const [motivoCancelacion, setMotivoCancelacion] = useState("")

  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [reportarOpen, setReportarOpen] = useState(false)
  const [motivoReporte, setMotivoReporte] = useState("")
  const [descripcionReporte, setDescripcionReporte] = useState("")
  const [enviandoReporte, setEnviandoReporte] = useState(false)
  const [bloqueando, setBloqueando] = useState(false)
  const [confirmarBloqueoOpen, setConfirmarBloqueoOpen] = useState(false)

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) router.replace("/")
  }, [isAuthenticated, isLoading, router])

  const cargarConversaciones = useCallback(() => {
    getConversaciones()
      .then(setConversaciones)
      .catch((err) => console.error("No se pudieron cargar las conversaciones:", err))
      .finally(() => setCargandoLista(false))
  }, [])

  // Carga inicial + refresco periódico de la lista lateral (polling ligero)
  useEffect(() => {
    cargarConversaciones()
    const interval = setInterval(cargarConversaciones, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [cargarConversaciones])

  // Al seleccionar una conversación: cargar historial, marcar como leído, abrir WebSocket
  useEffect(() => {
    if (!activeId) return
    setWsConectadoAlgunaVez(false)

    setCargandoMensajes(true)
    getHistorialMensajes(activeId)
      .then(setMensajes)
      .catch((err) => console.error(err))
      .finally(() => setCargandoMensajes(false))

    marcarMensajesLeidos(activeId).catch((err) => console.error(err))
    // Reflejar en la lista lateral que esta conversación ya no tiene pendientes
    setConversaciones((prev) => prev.map((c) => (c.id === activeId ? { ...c, no_leidos: 0 } : c)))

    // Cerrar cualquier conexión anterior antes de abrir la nueva
    wsRef.current?.close()

    const ws = new WebSocket(getWebSocketUrl(activeId))
    wsRef.current = ws

    ws.onopen = () => {
      setWsConectado(true)
      setWsConectadoAlgunaVez(true)
    }
    ws.onclose = () => setWsConectado(false)
    ws.onerror = () => setWsConectado(false)
    ws.onmessage = (event) => {
      const mensaje: MensajeBackend = JSON.parse(event.data)
      setMensajes((prev) => [...prev, mensaje])
      // Si el mensaje que llega no es mío, esta conversación sigue "leída" porque la tengo abierta
      if (mensaje.remitente_id !== user?.id) {
        marcarMensajesLeidos(activeId).catch(() => {})
      }
      // Actualiza el preview en la lista lateral sin esperar al polling
      setConversaciones((prev) =>
        prev.map((c) =>
          c.id === activeId ? { ...c, ultimo_mensaje: mensaje.contenido, ultimo_mensaje_fecha: mensaje.fecha } : c
        )
      )
    }

    return () => {
      ws.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [mensajes])

  useEffect(() => {
    const solicitudId = searchParams.get("solicitud")
    if (!solicitudId || conversaciones.length === 0) return
    const existe = conversaciones.some((c) => c.id === solicitudId)
    if (existe) {
      setActiveId(solicitudId)
      setMobileChatOpen(true)
    }
  }, [searchParams, conversaciones])

  const sendMessage = () => {
    const texto = newMessage.trim()
    if (!texto || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({ contenido: texto }))
    setNewMessage("")
  }

  const activeConv = conversaciones.find((c) => c.id === activeId) || null
  const esCliente = activeConv?.cliente_id === user?.id
  const conversacionActiva = activeConv?.estado === "pendiente" || activeConv?.estado === "aceptada"

  const MOTIVOS_CLIENTE = [
    { value: "cliente_desistio", label: "He cambiado de opinión" },
    { value: "no_show_proveedor", label: "El proveedor no se presentó" },
    { value: "otro", label: "Otro motivo" },
  ]
  const MOTIVOS_PROVEEDOR = [
    { value: "proveedor_no_disponible", label: "Ya no puedo ofrecer el servicio" },
    { value: "no_show_cliente", label: "El cliente no se presentó" },
    { value: "otro", label: "Otro motivo" },
  ]

  const handleCancelar = async () => {
    if (!activeId || !motivoCancelacion) return
    setProcesandoEstado(true)
    try {
      await cambiarEstadoSolicitud(activeId, "cancelada", motivoCancelacion)
      setConversaciones((prev) => prev.map((c) => (c.id === activeId ? { ...c, estado: "cancelada" } : c)))
      setCancelarOpen(false)
      setMotivoCancelacion("")
    } catch (err) {
      console.error(err)
    } finally {
      setProcesandoEstado(false)
    }
  }

  const handleCambiarEstado = async (estado: "aceptada" | "rechazada" | "completada") => {
    if (!activeId) return
    setProcesandoEstado(true)
    try {
      await cambiarEstadoSolicitud(activeId, estado)
      setConversaciones((prev) => prev.map((c) => (c.id === activeId ? { ...c, estado } : c)))
    } catch (err) {
      console.error(err)
    } finally {
      setProcesandoEstado(false)
    }
  }

  const handleEnviarValoracion = async () => {
    if (!activeConv || puntuacion === 0) return
    setEnviandoValoracion(true)
    try {
      await crearValoracion({
        solicitud_id: activeConv.id,
        puntuacion,
        comentario: comentario.trim() || undefined,
      })
      setConversaciones((prev) => prev.map((c) => (c.id === activeConv.id ? { ...c, ya_valorada: true } : c)))
      setValorarOpen(false)
      setPuntuacion(0)
      setComentario("")
    } catch (err) {
      console.error(err instanceof ApiError ? err.message : err)
    } finally {
      setEnviandoValoracion(false)
    }
  }

  const openChat = (conv: Conversacion) => {
    setActiveId(conv.id)
    setMobileChatOpen(true)
  }

  const conversacionesFiltradas = conversaciones.filter((c) => {
    if (!searchConv.trim()) return true
    const q = searchConv.toLowerCase()
    return (
      c.otro_usuario_nombre.toLowerCase().includes(q) ||
      c.servicio_titulo.toLowerCase().includes(q)
    )
  })

  const MOTIVOS_REPORTE = [
    { value: "contenido_inapropiado", label: "Contenido inapropiado" },
    { value: "spam", label: "Spam o publicidad" },
    { value: "comportamiento_sospechoso", label: "Comportamiento sospechoso" },
    { value: "no_se_presento", label: "No se presentó al servicio" },
    { value: "otro", label: "Otro motivo" },
  ]

  const handleEnviarReporte = async () => {
    if (!activeConv || !motivoReporte) return
    setEnviandoReporte(true)
    try {
      await crearReporte({
        usuario_reportado_id: activeConv.otro_usuario_id,
        motivo: motivoReporte,
        descripcion: descripcionReporte.trim() || undefined,
        solicitud_id: activeConv.id,
      })
      setReportarOpen(false)
      setMotivoReporte("")
      setDescripcionReporte("")
    } catch (err) {
      console.error(err instanceof ApiError ? err.message : err)
    } finally {
      setEnviandoReporte(false)
    }
  }

  const handleBloquear = async () => {
    if (!activeConv) return
    setBloqueando(true)
    try {
      await bloquearUsuario(activeConv.otro_usuario_id)
      setConfirmarBloqueoOpen(false)
      cargarConversaciones()
    } catch (err) {
      console.error(err instanceof ApiError ? err.message : err)
    } finally {
      setBloqueando(false)
    }
  }

  

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <h1 className="text-2xl font-bold text-foreground mb-5">Mensajes</h1>
        <div className="flex gap-5 h-[calc(100vh-200px)] min-h-[500px]">
          {/* Sidebar */}
          <div className={cn(
            "w-full md:w-80 shrink-0 flex flex-col border border-border rounded-2xl bg-card overflow-hidden",
            mobileChatOpen && "hidden md:flex"
          )}>
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar conversación..." className="pl-9 h-9 text-sm" value={searchConv} onChange={(e) => setSearchConv(e.target.value)} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-border">
              {cargandoLista ? (
                <div className="py-16 flex justify-center">
                  <Loader className="animate-spin text-muted-foreground" size={20} />
                </div>
              ) : conversacionesFiltradas.length === 0 ? (
                <div className="py-16 text-center px-4">
                  <p className="text-sm text-muted-foreground">{searchConv ? "No hay conversaciones que coincidan." : "Aún no tienes conversaciones."}</p>
                </div>
              ) : (
                conversacionesFiltradas.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => openChat(conv)}
                    className={cn(
                      "w-full flex items-start gap-3 p-4 text-left hover:bg-secondary/50 transition-colors",
                      activeId === conv.id && "bg-primary/5"
                    )}
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={conv.otro_usuario_avatar || undefined} alt={conv.otro_usuario_nombre} />
                      <AvatarFallback>{conv.otro_usuario_nombre.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-foreground text-sm truncate">{conv.otro_usuario_nombre}</p>
                        <span className="text-xs text-muted-foreground shrink-0">{formatHora(conv.ultimo_mensaje_fecha)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{conv.servicio_titulo}</p>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {conv.ultimo_mensaje || "Sin mensajes todavía"}
                      </p>
                    </div>
                    {conv.no_leidos > 0 && (
                      <Badge className="h-5 w-5 p-0 flex items-center justify-center text-xs shrink-0 bg-primary text-primary-foreground rounded-full">
                        {conv.no_leidos}
                      </Badge>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat window */}
          <div className={cn(
            "flex-1 border border-border rounded-2xl bg-card overflow-hidden flex-col",
            mobileChatOpen ? "flex" : "hidden md:flex"
          )}>
            {activeConv ? (
              <>
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                  <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileChatOpen(false)}>
                    <ArrowLeft size={18} />
                  </Button>
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={activeConv.otro_usuario_avatar || undefined} alt={activeConv.otro_usuario_nombre} />
                    <AvatarFallback>{activeConv.otro_usuario_nombre.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{activeConv.otro_usuario_nombre}</p>
                    <p className="text-xs text-muted-foreground truncate">{activeConv.servicio_titulo}</p>
                  </div>
                  {!esCliente && activeConv.estado === "aceptada" && (
                    <Button size="sm" variant="outline" disabled={procesandoEstado} onClick={() => handleCambiarEstado("completada")}>
                      Marcar como completado
                    </Button>
                  )}
                  {activeConv.estado === "aceptada" && (
                    <Button size="sm" variant="ghost" className="text-destructive" disabled={procesandoEstado} onClick={() => setCancelarOpen(true)}>
                      Cancelar
                    </Button>
                  )}
                  {wsConectadoAlgunaVez && !wsConectado && (
                    <div className="flex items-center gap-1 text-xs text-destructive shrink-0">
                      <WifiOff size={13} /> Reconectando...
                    </div>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-muted-foreground">
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setReportarOpen(true)} className="gap-2">
                        <Flag size={14} /> Reportar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setConfirmarBloqueoOpen(true)} className="gap-2 text-destructive">
                        <Ban size={14} /> Bloquear usuario
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                  {cargandoMensajes ? (
                    <div className="flex justify-center py-10">
                      <Loader className="animate-spin text-muted-foreground" size={20} />
                    </div>
                  ) : (
                    <>
                      {mensajes.map((msg) => {
                        const esMio = msg.remitente_id === user?.id
                        return (
                          <div key={msg.id} className={cn("flex gap-2", esMio ? "justify-end" : "justify-start")}>
                            {!esMio && (
                              <Avatar className="h-7 w-7 shrink-0 mt-1">
                                <AvatarImage src={activeConv.otro_usuario_avatar || undefined} />
                                <AvatarFallback>{activeConv.otro_usuario_nombre.charAt(0)}</AvatarFallback>
                              </Avatar>
                            )}
                            
                            <div
                              className={cn(
                                "max-w-xs md:max-w-md px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                                esMio
                                  ? "bg-primary text-primary-foreground rounded-br-sm"
                                  : "bg-secondary text-secondary-foreground rounded-bl-sm"
                              )}
                            >
                              <p>{msg.contenido}</p>
                              <p className={cn("text-xs mt-1", esMio ? "text-primary-foreground/60 text-right" : "text-muted-foreground")}>
                                {formatHora(msg.fecha)}
                              </p>
                            </div>
                            
                          </div>
                          
                        )
                      })}
                      {activeConv.estado === "pendiente" && !esCliente && (
                        <div className="flex justify-center py-2">
                          <div className="bg-secondary rounded-2xl px-5 py-4 text-center space-y-3 max-w-xs">
                            <p className="text-sm text-foreground">Tienes una nueva solicitud para este servicio</p>
                            <div className="flex gap-2 justify-center">
                              <Button size="sm" disabled={procesandoEstado} onClick={() => handleCambiarEstado("aceptada")}>
                                Aceptar
                              </Button>
                              <Button size="sm" variant="outline" disabled={procesandoEstado} onClick={() => handleCambiarEstado("rechazada")}>
                                Rechazar
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeConv.estado === "pendiente" && esCliente && (
                        <div className="flex justify-center py-2">
                          <div className="bg-secondary rounded-2xl px-5 py-4 text-center space-y-3 max-w-xs">
                            <p className="text-sm text-foreground">Esperando respuesta del profesional</p>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setCancelarOpen(true)}>
                              Cancelar solicitud
                            </Button>
                          </div>
                        </div>
                      )}


                      {activeConv.estado === "completada" && esCliente && !activeConv.ya_valorada && (
                        <div className="flex justify-center py-2">
                          <div className="bg-secondary rounded-2xl px-5 py-4 text-center space-y-3 max-w-xs">
                            <p className="text-sm text-foreground">Este servicio ha finalizado. ¿Qué tal tu experiencia con {activeConv.otro_usuario_nombre}?</p>
                            <Button size="sm" onClick={() => setValorarOpen(true)}>
                              Valorar ahora
                            </Button>
                          </div>
                        </div>
                      )}

                      {activeConv.estado === "rechazada" && (
                        <div className="flex justify-center py-2">
                          <p className="text-xs text-muted-foreground bg-secondary rounded-full px-4 py-1.5">Esta solicitud fue rechazada</p>
                        </div>
                      )}
                      {activeConv.estado === "cancelada" && (
                        <div className="flex justify-center py-2">
                          <p className="text-xs text-muted-foreground bg-secondary rounded-full px-4 py-1.5">Esta solicitud fue cancelada</p>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                <div className="p-4 border-t border-border">
                  <div className="flex gap-3">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                      placeholder={conversacionActiva ? "Escribe un mensaje..." : "Esta conversación ya no admite mensajes"}
                      className="flex-1"
                      disabled={!wsConectado || !conversacionActiva}
                    />
                    <Button onClick={sendMessage} disabled={!newMessage.trim() || !wsConectado || !conversacionActiva} size="icon" className="shrink-0">
                      <Send size={18} />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Selecciona una conversación para comenzar
              </div>
            )}
          </div>
        </div>
      </main>
      <Dialog open={valorarOpen} onOpenChange={setValorarOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Valora a {activeConv?.otro_usuario_nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setPuntuacion(n)} type="button">
                  <Star size={28} className={n <= puntuacion ? "fill-amber-400 text-amber-400" : "text-muted-foreground"} />
                </button>
              ))}
            </div>
            <Textarea
              placeholder="Cuéntanos tu experiencia (opcional)"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={3}
            />
            <Button className="w-full" disabled={puntuacion === 0 || enviandoValoracion} onClick={handleEnviarValoracion}>
              {enviandoValoracion ? <Loader size={16} className="animate-spin" /> : "Enviar valoración"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={cancelarOpen} onOpenChange={setCancelarOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Por qué cancelas?</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            {(esCliente ? MOTIVOS_CLIENTE : MOTIVOS_PROVEEDOR).map((m) => (
              <button
                key={m.value}
                onClick={() => setMotivoCancelacion(m.value)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors",
                  motivoCancelacion === m.value ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"
                )}
              >
                {m.label}
              </button>
            ))}
            <Button className="w-full mt-2" disabled={!motivoCancelacion || procesandoEstado} onClick={handleCancelar}>
              Confirmar cancelación
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={reportarOpen} onOpenChange={setReportarOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reportar a {activeConv?.otro_usuario_nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {MOTIVOS_REPORTE.map((m) => (
              <button
                key={m.value}
                onClick={() => setMotivoReporte(m.value)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors",
                  motivoReporte === m.value ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"
                )}
              >
                {m.label}
              </button>
            ))}
            <Textarea
              placeholder="Añade más detalles (opcional)"
              value={descripcionReporte}
              onChange={(e) => setDescripcionReporte(e.target.value)}
              rows={3}
            />
            <Button className="w-full" disabled={!motivoReporte || enviandoReporte} onClick={handleEnviarReporte}>
              {enviandoReporte ? <Loader size={16} className="animate-spin" /> : "Enviar reporte"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={confirmarBloqueoOpen} onOpenChange={setConfirmarBloqueoOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Bloquear a {activeConv?.otro_usuario_nombre}?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              No podréis volver a contactar entre vosotros. Si tenéis una solicitud activa, se cancelará automáticamente.
            </p>
            <div className="flex gap-3">
              <Button variant="destructive" className="flex-1" disabled={bloqueando} onClick={handleBloquear}>
                {bloqueando ? <Loader size={16} className="animate-spin" /> : "Bloquear"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setConfirmarBloqueoOpen(false)} disabled={bloqueando}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function ChatsPage() {
  return (
    <Suspense fallback={null}>
      <ChatsPageInner />
    </Suspense>
  )
}