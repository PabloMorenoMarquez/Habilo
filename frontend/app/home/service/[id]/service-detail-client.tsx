"use client"

import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { useEffect, useRef, useState } from "react"
import Navbar from "@/components/navbar"
import Image from "next/image"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, Clock, MapPin, MessageCircle, Share2, Heart, ArrowLeft, Loader } from "lucide-react"
import Link from "next/link"
import {
  getServicioDetalle,
  crearSolicitud,
  listarImagenesServicio,
  ImagenServicio,
  ServicioBackend,
  ApiError,
  marcarServicioFavorito,
  desmarcarServicioFavorito,
  marcarProveedorFavorito,
  desmarcarProveedorFavorito,
  listarProveedoresFavoritos,
  getPerfilProveedorPublico,
  PerfilPublicoCompleto,
} from "@/lib/api"
import { AuthRequiredDialog } from "@/components/auth-required-dialog"
import { LeadContactDialog } from "@/components/lead-contact-dialog"
import { formatCategoryName } from "@/lib/category"
import posthog from "posthog-js"

const isPostHogConfigured = Boolean(
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN && process.env.NEXT_PUBLIC_POSTHOG_HOST
)

function formatPrice(price: number, type: string) {
  if (type === "hora") return `${price}€/hora`
  return `${price}€`
}

const DIAS_LABELS: Record<number, string> = { 1: "L", 2: "M", 3: "X", 4: "J", 5: "V", 6: "S", 7: "D" }

function formatearDiasDisponibles(csv: string | null | undefined): string {
  if (!csv) return ""
  const dias = csv
    .split(",")
    .map((n) => parseInt(n.trim(), 10))
    .filter((n) => !isNaN(n))
    .sort((a, b) => a - b)
  return dias.map((d) => DIAS_LABELS[d] || "").join(", ")
}

interface ServiceDetailClientProps {
  initialServicio: ServicioBackend | null
}

export default function ServiceDetailClient({ initialServicio }: ServiceDetailClientProps) {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const id = (params?.id as string) || initialServicio?.id || ""

  const [liked, setLiked] = useState(false)
  const [cargandoLike, setCargandoLike] = useState(false)

  const [siguiendoProveedor, setSiguiendoProveedor] = useState(false)
  const [cargandoSeguir, setCargandoSeguir] = useState(false)

  const [perfilProveedor, setPerfilProveedor] = useState<PerfilPublicoCompleto | null>(null)

  const [servicio, setServicio] = useState<ServicioBackend | null>(initialServicio)
  const [cargando, setCargando] = useState(!initialServicio)

  const [imagenes, setImagenes] = useState<ImagenServicio[]>([])
  const [imagenActiva, setImagenActiva] = useState(0)

  const [contactando, setContactando] = useState(false)
  const [contactoError, setContactoError] = useState<string | null>(null)

  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [authDialogMensaje, setAuthDialogMensaje] = useState<string>()

  const [leadOpen, setLeadOpen] = useState(false)

  const servicioVistoRef = useRef<string | null>(null)
  const detallePromesaRef = useRef<{ id: string; promise: Promise<ServicioBackend> } | null>(null)

  useEffect(() => {
    if (!id) return
    setImagenActiva(0)
    listarImagenesServicio(id)
      .then(setImagenes)
      .catch((err) => console.error("No se pudo cargar la galería:", err))
  }, [id])

  useEffect(() => {
    if (!id) {
      setCargando(false)
      return
    }
    if (initialServicio) return

    // Sin datos SSR (fallo de red o del backend): reintentamos una sola vez.
    // Reutilizamos la misma promesa si el efecto se repite (Strict Mode), y no
    // dependemos de la sesión para no repetir la petición ni volver al spinner.
    let intento = detallePromesaRef.current
    if (!intento || intento.id !== id) {
      setCargando(true)
      intento = { id, promise: getServicioDetalle(id) }
      detallePromesaRef.current = intento
    }

    let activo = true
    intento.promise
      .then((data) => {
        if (activo) setServicio(data)
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (activo) setCargando(false)
      })

    return () => {
      activo = false
    }
  }, [id, initialServicio])

  useEffect(() => {
    if (!initialServicio || isLoading || !isAuthenticated) return

    // El HTML SSR es anónimo. Con sesión refrescamos una vez para recuperar
    // el estado real de favorito; los anónimos no repiten la petición.
    let activo = true
    getServicioDetalle(id)
      .then((data) => {
        if (activo) setServicio(data)
      })
      .catch((err) => console.error("No se pudo refrescar el servicio:", err))

    return () => {
      activo = false
    }
  }, [id, initialServicio, isAuthenticated, isLoading])

  useEffect(() => {
    if (!servicio || servicioVistoRef.current === servicio.id) return
    servicioVistoRef.current = servicio.id
    if (isPostHogConfigured) {
      posthog.capture("service_viewed", {
        service_id: servicio.id,
        category: servicio.categoria_nombre ?? null,
        city: servicio.proveedor_ciudad ?? null,
      })
    }
  }, [servicio])

  useEffect(() => {
    if (servicio) setLiked(servicio.es_favorito)
  }, [servicio])

  const proveedorId = servicio?.proveedor_id

  useEffect(() => {
    if (!proveedorId) return

    let activo = true
    getPerfilProveedorPublico(proveedorId)
      .then((perfil) => {
        if (activo) setPerfilProveedor(perfil)
      })
      .catch((err) => console.error("No se pudo cargar el perfil del profesional:", err))

    return () => {
      activo = false
    }
  }, [proveedorId])

  useEffect(() => {
    // Solo comprobamos "sigo a este proveedor" si hay sesión — para anónimos no tiene sentido
    if (!proveedorId || !isAuthenticated) {
      setSiguiendoProveedor(false)
      return
    }

    let activo = true
    listarProveedoresFavoritos()
      .then((favs) => {
        if (activo) setSiguiendoProveedor(favs.some((p) => p.id === proveedorId))
      })
      .catch((err) => console.error("No se pudo comprobar si sigues a este profesional:", err))

    return () => {
      activo = false
    }
  }, [proveedorId, isAuthenticated])

  const requireAuth = (mensaje: string) => {
    setAuthDialogMensaje(mensaje)
    setAuthDialogOpen(true)
  }

  const handleToggleLike = async () => {
    if (!servicio) return
    if (!isAuthenticated) {
      requireAuth("Inicia sesión para guardar servicios en tus favoritos.")
      return
    }
    const previo = liked
    setLiked(!previo)
    setCargandoLike(true)
    try {
      if (previo) await desmarcarServicioFavorito(servicio.id)
      else await marcarServicioFavorito(servicio.id)
      if (isPostHogConfigured) {
        posthog.capture("service_favorite_changed", {
          service_id: servicio.id,
          is_favorited: !previo,
        })
      }
    } catch (err) {
      setLiked(previo)
      console.error("No se pudo actualizar el favorito:", err)
    } finally {
      setCargandoLike(false)
    }
  }

  const handleToggleSeguir = async () => {
    if (!servicio) return
    if (!isAuthenticated) {
      requireAuth("Inicia sesión para seguir a este profesional.")
      return
    }
    const previo = siguiendoProveedor
    setSiguiendoProveedor(!previo)
    setCargandoSeguir(true)
    try {
      if (previo) await desmarcarProveedorFavorito(servicio.proveedor_id)
      else await marcarProveedorFavorito(servicio.proveedor_id)
      if (isPostHogConfigured) {
        posthog.capture("provider_follow_changed", {
          provider_id: servicio.proveedor_id,
          is_following: !previo,
        })
      }
    } catch (err) {
      setSiguiendoProveedor(previo)
      console.error("No se pudo actualizar el seguimiento:", err)
    } finally {
      setCargandoSeguir(false)
    }
  }

  const handleContactar = async () => {
    if (!servicio) return
    if (!isAuthenticated) {
      setLeadOpen(true)
      return
    }
    setContactando(true)
    setContactoError(null)
    try {
      const solicitud = await crearSolicitud(servicio.id)
      if (isPostHogConfigured) {
        posthog.capture("service_request_created", {
          service_id: servicio.id,
          request_id: solicitud.id,
        })
      }
      router.push(`/chats?solicitud=${solicitud.id}`)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setContactoError("Ya tienes una solicitud activa con este profesional para este servicio.")
      } else {
        setContactoError("No se pudo enviar la solicitud. Inténtalo de nuevo.")
      }
    } finally {
      setContactando(false)
    }
  }

  const handleShare = async () => {
    if (!servicio) return
    const url = `${window.location.origin}/home/service/${servicio.id}`
    const texto = `${servicio.titulo} en Habilo`

    if (navigator.share) {
      try {
        await navigator.share({ title: servicio.titulo, text: texto, url })
      } catch {
        // El usuario puede cancelar el diálogo nativo; no es un fallo.
        return
      }
      if (isPostHogConfigured) {
        posthog.capture("share_clicked", { channel: "native", service_id: servicio.id })
      }
      return
    }

    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${texto}: ${url}`)}`,
      "_blank",
      "noopener,noreferrer"
    )
    if (isPostHogConfigured) {
      posthog.capture("share_clicked", { channel: "whatsapp", service_id: servicio.id })
    }
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-20 flex justify-center">
          <Loader className="animate-spin text-muted-foreground" size={28} />
        </main>
      </div>
    )
  }

  if (!servicio) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">No se pudo cargar el servicio</h1>
          <p className="text-muted-foreground mb-6">
            Ha ocurrido un problema al cargar este servicio. Inténtalo de nuevo en unos minutos.
          </p>
          <Button asChild variant="outline"><Link href="/home">Volver al inicio</Link></Button>
        </main>
      </div>
    )
  }

  const rating = servicio.proveedor_valoracion_media ?? 0
  const reviewCount = servicio.proveedor_num_valoraciones ?? 0
  const precio = parseFloat(servicio.precio)
  const fotos = imagenes.length > 0 ? imagenes.map((img) => img.url) : servicio.imagen_url ? [servicio.imagen_url] : []
  // La API devuelve el perfil privado anonimizado; no lo usamos para completar
  // ciudad, materias ni niveles en la ficha pública del servicio.
  const perfilVisible = perfilProveedor?.perfil_publico === true
  const ciudad =
    perfilProveedor && !perfilVisible
      ? null
      : perfilProveedor?.ciudad || servicio.proveedor_ciudad
  const materias = perfilVisible ? perfilProveedor?.materias ?? [] : []
  const niveles = perfilVisible ? perfilProveedor?.niveles ?? [] : []

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Link href="/home" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm">
          <ArrowLeft size={16} /> Volver a servicios
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-muted">
              <Image
                src={fotos[imagenActiva] || "/placeholder.jpg"}
                alt={servicio.titulo}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 66vw"
              />
            </div>

            {fotos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {fotos.map((url, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setImagenActiva(index)}
                    className={`relative shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      index === imagenActiva ? "border-primary" : "border-transparent"
                    }`}
                  >
                    <Image src={url} alt="" fill className="object-cover" sizes="80px" />
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <Badge variant="secondary" className="text-xs">{formatCategoryName(servicio.categoria_nombre)}</Badge>
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">{servicio.titulo}</h1>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleToggleLike}
                    disabled={cargandoLike}
                    className={liked ? "text-red-500" : "text-muted-foreground"}
                  >
                    <Heart size={20} fill={liked ? "currentColor" : "none"} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleShare}
                    className="text-muted-foreground"
                    aria-label="Compartir servicio"
                  >
                    <Share2 size={20} />
                  </Button>
                </div>
              </div>

              {reviewCount > 0 && (
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Star size={16} className="fill-amber-400 text-amber-400" />
                    <span className="font-semibold">{rating.toFixed(1)}</span>
                    <span className="text-muted-foreground">({reviewCount} valoraciones)</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Descripción del servicio</h2>
              <p className="text-muted-foreground leading-relaxed">
                {servicio.descripcion || "Sin descripción."}
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Sobre el profesional</h2>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={servicio.proveedor_avatar || undefined} alt={servicio.proveedor_nombre || ""} />
                    <AvatarFallback>{(servicio.proveedor_nombre || "?").charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <Link
                      href={`/profesores/${servicio.proveedor_id}`}
                      className="font-semibold text-foreground hover:underline"
                    >
                      {servicio.proveedor_nombre || "Profesional de Habilo"}
                    </Link>
                    {ciudad && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin size={12} />
                        <span>{ciudad}</span>
                      </div>
                    )}
                    {servicio.distancia_km != null && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin size={12} />
                        <span>a {servicio.distancia_km.toFixed(1)} km</span>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant={siguiendoProveedor ? "secondary" : "outline"}
                  size="sm"
                  onClick={handleToggleSeguir}
                  disabled={cargandoSeguir}
                  className="shrink-0"
                >
                  <Heart size={14} className={siguiendoProveedor ? "fill-current mr-1.5" : "mr-1.5"} />
                  {siguiendoProveedor ? "Dejar de seguir" : "Seguir"}
                </Button>
              </div>

              {(perfilProveedor?.dias_disponibles || (perfilProveedor?.hora_inicio && perfilProveedor?.hora_fin)) && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/60">
                  <div className="p-2 rounded-lg bg-card text-primary shrink-0">
                    <Clock size={16} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">Horario habitual</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {perfilProveedor.dias_disponibles && (
                        <div className="flex gap-1">
                          {formatearDiasDisponibles(perfilProveedor.dias_disponibles)
                            .split(", ")
                            .map((dia, i) => (
                              <span
                                key={i}
                                className="w-6 h-6 flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold"
                              >
                                {dia}
                              </span>
                            ))}
                        </div>
                      )}
                      {perfilProveedor.hora_inicio && perfilProveedor.hora_fin && (
                        <span className="text-sm font-medium text-foreground">
                          {perfilProveedor.hora_inicio} – {perfilProveedor.hora_fin}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {(materias.length > 0 || niveles.length > 0) && (
                <div className="space-y-3">
                  {materias.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">Materias</span>
                      <div className="flex flex-wrap gap-1.5">
                        {materias.map((materia) => (
                          <Badge key={materia} variant="outline" className="font-normal">
                            {materia}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {niveles.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">Niveles</span>
                      <div className="flex flex-wrap gap-1.5">
                        {niveles.map((nivel) => (
                          <Badge key={nivel} variant="secondary" className="font-normal">
                            {nivel}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 p-6 rounded-2xl border border-border bg-card shadow-sm space-y-5">
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Precio</span>
                <p className="text-3xl font-bold text-primary">{formatPrice(precio, servicio.tipo_precio)}</p>
              </div>
              <div className="space-y-3">
                <Button
                  className="w-full h-12 text-base gap-2"
                  onClick={handleContactar}
                  disabled={contactando}
                >
                  {contactando ? (
                    <Loader size={18} className="animate-spin" />
                  ) : (
                    <>
                      <MessageCircle size={18} /> Contactar profesional
                    </>
                  )}
                </Button>
                {contactoError && (
                  <p className="text-center text-sm text-destructive">{contactoError}</p>
                )}
              </div>
              <p className="text-center text-xs text-muted-foreground">
                El profesional recibirá tu mensaje y podrá contactarte.
              </p>
            </div>
          </div>
        </div>
      </main>

      <AuthRequiredDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        mensaje={authDialogMensaje}
      />

      <LeadContactDialog
        open={leadOpen}
        onOpenChange={setLeadOpen}
        servicioId={servicio.id}
        profesionalNombre={servicio.proveedor_nombre || "Profesional"}
      />
    </div>
  )
}