"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { useEffect, useState } from "react"
import Navbar from "@/components/navbar"
import ServiceCard from "@/components/service-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, ShieldCheck, Heart, Loader } from "lucide-react"
import {
  listarServiciosFavoritos,
  listarProveedoresFavoritos,
  desmarcarProveedorFavorito,
  ServicioBackend,
  ProveedorFavorito,
} from "@/lib/api"

// Mismo mapeo que usa la home para pasarle los datos a ServiceCard
function mapServicioParaTarjeta(s: ServicioBackend) {
  return {
    id: s.id,
    title: s.titulo,
    category: s.categoria_nombre || "General",
    description: s.descripcion || "",
    price: parseFloat(s.precio),
    priceType: s.tipo_precio,
    rating: s.proveedor_valoracion_media ?? 0,
    reviewCount: s.proveedor_num_valoraciones ?? 0,
    deliveryDays: null,
    image: s.imagen_url || "/placeholder.jpg",
    favorito: s.es_favorito,
    professional: {
      id: s.proveedor_id,
      name: s.proveedor_nombre || "Profesional",
      avatar: s.proveedor_avatar || "/placeholder-user.jpg",
      location: s.distancia_km != null ? `a ${s.distancia_km.toFixed(1)} km` : "",
    },
    tags: [] as string[],
    featured: false,
  }
}

export default function FavoritosPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  const [servicios, setServicios] = useState<ServicioBackend[]>([])
  const [proveedores, setProveedores] = useState<ProveedorFavorito[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quitandoProveedorId, setQuitandoProveedorId] = useState<string | null>(null)

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) router.replace("/")
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    setCargando(true)
    setError(null)
    Promise.all([listarServiciosFavoritos(), listarProveedoresFavoritos()])
      .then(([serviciosData, proveedoresData]) => {
        setServicios(serviciosData)
        setProveedores(proveedoresData)
      })
      .catch((err) => {
        console.error(err)
        setError("No se pudieron cargar tus favoritos.")
      })
      .finally(() => setCargando(false))
  }, [])

  const handleQuitarServicioDeLista = (servicioId: string) => {
    setServicios((prev) => prev.filter((s) => s.id !== servicioId))
  }

  const handleDejarDeSeguir = async (perfilId: string) => {
    setQuitandoProveedorId(perfilId)
    const previos = proveedores
    setProveedores((prev) => prev.filter((p) => p.id !== perfilId)) // optimista
    try {
      await desmarcarProveedorFavorito(perfilId)
    } catch (err) {
      setProveedores(previos) // revertimos si falla
      console.error("No se pudo dejar de seguir al profesional:", err)
    } finally {
      setQuitandoProveedorId(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Mis favoritos</h1>

        {cargando ? (
          <div className="flex justify-center py-20">
            <Loader className="animate-spin text-muted-foreground" size={28} />
          </div>
        ) : error ? (
          <p className="text-center text-sm text-destructive py-10">{error}</p>
        ) : (
          <Tabs defaultValue="servicios">
            <TabsList>
              <TabsTrigger value="servicios">Servicios ({servicios.length})</TabsTrigger>
              <TabsTrigger value="proveedores">Profesionales ({proveedores.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="servicios" className="pt-4">
              {servicios.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Heart size={32} className="mx-auto mb-3 opacity-40" />
                  <p>Todavía no has guardado ningún servicio como favorito.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {servicios.map((s) => (
                    <ServiceCard
                      key={s.id}
                      service={mapServicioParaTarjeta(s)}
                      onFavoritoChange={(favorito) => {
                        if (!favorito) handleQuitarServicioDeLista(s.id)
                      }}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="proveedores" className="pt-4">
              {proveedores.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Heart size={32} className="mx-auto mb-3 opacity-40" />
                  <p>Todavía no sigues a ningún profesional.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {proveedores.map((p) => (
                    <div key={p.id} className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={p.foto_url || undefined} alt={p.nombre || ""} />
                          <AvatarFallback>{(p.nombre || "?").charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-foreground truncate">{p.nombre || "Profesional"}</p>
                            {p.verificado && <ShieldCheck size={14} className="text-emerald-500 shrink-0" />}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Star size={13} className="fill-amber-400 text-amber-400" />
                            <span>{p.valoracion_media != null ? parseFloat(String(p.valoracion_media)).toFixed(1) : "—"}</span>
                            <span>({p.num_valoraciones})</span>
                          </div>
                        </div>
                      </div>
                      {p.descripcion && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{p.descripcion}</p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDejarDeSeguir(p.id)}
                        disabled={quitandoProveedorId === p.id}
                        className="mt-auto"
                      >
                        <Heart size={14} className="fill-current mr-1.5" />
                        Dejar de seguir
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  )
}