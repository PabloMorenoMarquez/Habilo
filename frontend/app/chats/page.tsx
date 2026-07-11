"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { useEffect, useState, useRef, useCallback } from "react"
import Navbar from "@/components/navbar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send, Search, ArrowLeft, Loader, WifiOff } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getConversaciones,
  getHistorialMensajes,
  marcarMensajesLeidos,
  getWebSocketUrl,
  Conversacion,
  MensajeBackend,
} from "@/lib/api"

const POLL_INTERVAL = 15000 // refresco de la lista lateral, en ms

function formatHora(fecha: string | null) {
  if (!fecha) return ""
  return new Date(fecha).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
}

export default function ChatsPage() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()

  const [conversaciones, setConversaciones] = useState<Conversacion[]>([])
  const [cargandoLista, setCargandoLista] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [mensajes, setMensajes] = useState<MensajeBackend[]>([])
  const [cargandoMensajes, setCargandoMensajes] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const [wsConectado, setWsConectado] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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

    ws.onopen = () => setWsConectado(true)
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

  const sendMessage = () => {
    const texto = newMessage.trim()
    if (!texto || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({ contenido: texto }))
    setNewMessage("")
  }

  const openChat = (conv: Conversacion) => {
    setActiveId(conv.id)
    setMobileChatOpen(true)
  }

  const activeConv = conversaciones.find((c) => c.id === activeId) || null

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
                <Input placeholder="Buscar conversación..." className="pl-9 h-9 text-sm" disabled />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-border">
              {cargandoLista ? (
                <div className="py-16 flex justify-center">
                  <Loader className="animate-spin text-muted-foreground" size={20} />
                </div>
              ) : conversaciones.length === 0 ? (
                <div className="py-16 text-center px-4">
                  <p className="text-sm text-muted-foreground">Aún no tienes conversaciones.</p>
                </div>
              ) : (
                conversaciones.map((conv) => (
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
                  {!wsConectado && (
                    <div className="flex items-center gap-1 text-xs text-destructive shrink-0">
                      <WifiOff size={13} /> Reconectando...
                    </div>
                  )}
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
                      placeholder="Escribe un mensaje..."
                      className="flex-1"
                      disabled={!wsConectado}
                    />
                    <Button onClick={sendMessage} disabled={!newMessage.trim() || !wsConectado} size="icon" className="shrink-0">
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
    </div>
  )
}