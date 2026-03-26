"use client"

import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { useEffect, useState } from "react"
import Navbar from "@/components/navbar"
import servicesData from "@/data/services.json"
import Image from "next/image"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, Clock, MapPin, CheckCircle, MessageCircle, Share2, Heart, ArrowLeft } from "lucide-react"
import Link from "next/link"

function formatPrice(price: number, type: string) {
  if (type === "palabra") return `${(price * 100).toFixed(0)}€/100 palabras`
  if (type === "hora") return `${price}€/hora`
  if (type === "mes") return `${price}€/mes`
  if (type === "sesión") return `${price}€/sesión`
  if (type === "evento") return `desde ${price}€`
  return `${price}€`
}

export default function ServiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [liked, setLiked] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) router.replace("/")
  }, [isAuthenticated, router])

  const service = servicesData.find((s) => s.id === params.id)

  if (!service) {
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Back */}
        <Link href="/home" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm">
          <ArrowLeft size={16} /> Volver a servicios
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image */}
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-muted">
              <Image src={service.image} alt={service.title} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 66vw" />
            </div>

            {/* Header */}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <Badge variant="secondary" className="text-xs">{service.category}</Badge>
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">{service.title}</h1>
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

              {/* Stats row */}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Star size={16} className="fill-amber-400 text-amber-400" />
                  <span className="font-semibold">{service.rating}</span>
                  <span className="text-muted-foreground">({service.reviewCount} valoraciones)</span>
                </div>
                {service.deliveryDays && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock size={14} />
                    <span>Entrega en {service.deliveryDays} días</span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Descripción del servicio</h2>
              <p className="text-muted-foreground leading-relaxed">{service.description}</p>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {service.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">#{tag}</Badge>
              ))}
            </div>

            {/* About professional */}
            <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Sobre el profesional</h2>
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={service.professional.avatar} alt={service.professional.name} />
                  <AvatarFallback>{service.professional.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground">{service.professional.name}</p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin size={12} />
                    <span>{service.professional.location}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle size={14} className="text-primary" />
                Identidad verificada
              </div>
            </div>
          </div>

          {/* Right: sticky booking card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 p-6 rounded-2xl border border-border bg-card shadow-sm space-y-5">
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Precio</span>
                <p className="text-3xl font-bold text-primary">{formatPrice(service.price, service.priceType)}</p>
              </div>
              {service.deliveryDays && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock size={14} />
                  <span>Entrega en {service.deliveryDays} días</span>
                </div>
              )}
              <div className="space-y-3">
                <Button className="w-full h-12 text-base" asChild>
                  <Link href="/chats">Contratar ahora</Link>
                </Button>
                <Button variant="outline" className="w-full h-12 text-base gap-2" asChild>
                  <Link href="/chats">
                    <MessageCircle size={18} /> Contactar profesional
                  </Link>
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Sin compromiso · Cancela en cualquier momento
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
