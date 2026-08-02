"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { Star, Clock, MapPin, Heart } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { marcarServicioFavorito, desmarcarServicioFavorito } from "@/lib/api"

interface ServiceCardProps {
  service: {
    id: string
    title: string
    category: string
    description: string
    price: number
    priceType: string
    rating: number
    reviewCount: number
    deliveryDays: number | null
    image: string
    favorito?: boolean
    professional: {
      id: string
      name: string
      avatar: string
      location: string
    }
    tags: string[]
    featured: boolean
  }
  // Se llama cuando cambia el estado de favorito (útil en la pantalla de "Mis favoritos"
  // para quitar la tarjeta de la lista en cuanto se desmarca, sin esperar a recargar)
  onFavoritoChange?: (favorito: boolean) => void
}

function formatPrice(price: number, type: string) {
  if (type === "palabra") return `${(price * 100).toFixed(0)}€/100 palabras`
  if (type === "hora") return `${price}€/hora`
  if (type === "mes") return `${price}€/mes`
  if (type === "sesión") return `${price}€/sesión`
  if (type === "evento") return `desde ${price}€`
  return `${price}€`
}

export default function ServiceCard({ service, onFavoritoChange }: ServiceCardProps) {
  const [favorito, setFavorito] = useState(!!service.favorito)
  const [cargandoFavorito, setCargandoFavorito] = useState(false)

  const handleToggleFavorito = async (e: React.MouseEvent) => {
    e.preventDefault() // el card entero es un <Link>, no queremos navegar al pulsar el corazón
    e.stopPropagation()
    if (cargandoFavorito) return

    const previo = favorito
    setFavorito(!previo) // actualización optimista
    setCargandoFavorito(true)
    try {
      if (previo) {
        await desmarcarServicioFavorito(service.id)
      } else {
        await marcarServicioFavorito(service.id)
      }
      onFavoritoChange?.(!previo)
    } catch (err) {
      setFavorito(previo) // revertimos si falla
      console.error("No se pudo actualizar el favorito:", err)
    } finally {
      setCargandoFavorito(false)
    }
  }

  return (
    <Link href={`/home/service/${service.id}`} className="group block">
      <article className="bg-card border border-border rounded-2xl overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30 h-full flex flex-col">
        {/* Image */}
        <div className="relative aspect-[16/9] overflow-hidden bg-muted">
          <Image
            src={service.image}
            alt={service.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {service.featured && (
            <div className="absolute top-3 left-3">
              <Badge className="bg-primary text-primary-foreground text-xs font-semibold">Destacado</Badge>
            </div>
          )}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <Badge variant="secondary" className="text-xs font-medium bg-card/90 text-foreground backdrop-blur-sm">
              {service.category}
            </Badge>
          </div>
          <button
            type="button"
            onClick={handleToggleFavorito}
            className="absolute bottom-3 right-3 p-2 rounded-full bg-card/90 backdrop-blur-sm hover:bg-card transition-colors"
          >
            <Heart size={16} className={favorito ? "fill-red-500 text-red-500" : "text-foreground"} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-3 flex-1">
          {/* Title */}
          <h3 className="font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {service.title}
          </h3>

          {/* Pro info */}
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={service.professional.avatar} alt={service.professional.name} />
              <AvatarFallback className="text-xs">{service.professional.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">{service.professional.name}</span>
            <span className="text-muted-foreground/40">·</span>
            <MapPin size={12} className="text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">{service.professional.location}</span>
          </div>

          {/* Rating + delivery */}
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1">
              <Star size={14} className="fill-amber-400 text-amber-400" />
              <span className="font-semibold text-foreground">{service.rating}</span>
              <span className="text-muted-foreground">({service.reviewCount})</span>
            </div>
            {service.deliveryDays && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock size={12} />
                  <span>{service.deliveryDays} días</span>
                </div>
              </>
            )}
          </div>

          {/* Price */}
          <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Desde</span>
            <span className="text-lg font-bold text-primary">
              {formatPrice(service.price, service.priceType)}
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}