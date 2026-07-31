"use client"

import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { useEffect, useState } from "react"
import Navbar from "@/components/navbar"
import Image from "next/image"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, Clock, MapPin, CheckCircle, MessageCircle, Share2, Heart, ArrowLeft, Loader } from "lucide-react"
import Link from "next/link"
import { getServicioDetalle, crearSolicitud, listarImagenesServicio, ImagenServicio, ServicioBackend, ApiError } from "@/lib/api"

function formatPrice(price: number, type: string) {
  if (type === "hora") return `${price}€/hora`
  return `${price}€`
}

export default function ServiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [liked, setLiked] = useState(false)

  const [servicio, setServicio] = useState<ServicioBackend | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [imagenes, setImagenes] = useState<ImagenServicio[]>([])
  const [imagenActiva, setImagenActiva] = useState(0)

  const [contactando, setContactando] = useState(false)
  const [contactoError, setContactoError] = useState<string | null>(null)

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) router.replace("/")
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    const id = params.id as string
    if (!id) return
    setCargando(true)
    getServicioDetalle(id)
      .then(setServicio)
      .catch((err) => {
        console.error(err)
        setError("No se pudo cargar el servicio.")
      })
      .finally(() => setCargando(false))

    setImagenActiva(0)
    listarImagenesServicio(id)
      .then(setImagenes)
      .catch((err) => console.error("No se pudo cargar la galería:", err))
  }, [params.id])

  const handleContactar = async () => {
    if (!servicio) return
    setContactando(true)
    setContactoError(null)
    try {
      const solicitud = await crearSolicitud(servicio.id) 
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

  if (error || !servicio) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Servicio no encontrado</h1>
          <Button asChild variant="outline"><Link href="/home">Volver al inicio</Link></Button>
        </main>
      </div>
    )
  }

  const rating = servicio.proveedor_valoracion_media ?? 0
  const reviewCount = servicio.proveedor_num_valoraciones ?? 0
  const precio = parseFloat(servicio.precio)
  const fotos = imagenes.length > 0 ? imagenes.map((img) => img.url) : servicio.imagen_url ? [servicio.imagen_url] : []

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
              <Image src={fotos[imagenActiva] || "/placeholder.jpg"} alt={servicio.titulo} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 66vw" />
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
                  <Badge variant="secondary" className="text-xs capitalize">{servicio.categoria_nombre || "General"}</Badge>
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">{servicio.titulo}</h1>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLiked((v) => !v)}
                    className={liked ? "text-red-500" : "text-muted-foreground"}
                  >
                    <Heart size={20} fill={liked ? "currentColor" : "none"} />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <Share2 size={20} />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Star size={16} className="fill-amber-400 text-amber-400" />
                  <span className="font-semibold">{rating.toFixed(1)}</span>
                  <span className="text-muted-foreground">({reviewCount} valoraciones)</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Descripción del servicio</h2>
              <p className="text-muted-foreground leading-relaxed">
                {servicio.descripcion || "Sin descripción."}
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Sobre el profesional</h2>
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={servicio.proveedor_avatar || undefined} alt={servicio.proveedor_nombre || ""} />
                  <AvatarFallback>{(servicio.proveedor_nombre || "?").charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground">{servicio.proveedor_nombre}</p>
                  {servicio.distancia_km != null && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin size={12} />
                      <span>a {servicio.distancia_km.toFixed(1)} km</span>
                    </div>
                  )}
                </div>
              </div>
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
                Se enviará una solicitud al profesional
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}