"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { useEffect, useState, useRef, useCallback } from "react"
import Navbar from "@/components/navbar"
import ServiceCard from "@/components/service-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Search, SlidersHorizontal, X, MapPin, Navigation, Loader } from "lucide-react"
import { buscarServicios, getCategorias, ServicioBackend, Categoria } from "@/lib/api"
import { geocodeCiudad, getBrowserLocation } from "@/lib/geocode"

const RADIO_KM = 50 // radio de búsqueda por defecto
const LOCATION_KEY = "serviclick_location"

// Convierte el servicio tal y como lo devuelve el backend a la forma que espera ServiceCard
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

export default function ClientHomePage() {
  const { isAuthenticated, isLoading, role, user } = useAuth()
  const router = useRouter()

  const [search, setSearch] = useState("")
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [activeCategoriaId, setActiveCategoriaId] = useState<string | null>(null)

  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [priceOpen, setPriceOpen] = useState(false)
  const [locationOpen, setLocationOpen] = useState(false)
  const [locationInput, setLocationInput] = useState(user?.location || "")
  const minRef = useRef<HTMLInputElement>(null)
  const locationRef = useRef<HTMLInputElement>(null)

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [ciudadLabel, setCiudadLabel] = useState(user?.location || "")
  const [locatingUser, setLocatingUser] = useState(false)

  const [servicios, setServicios] = useState<ServicioBackend[]>([])
  const [buscando, setBuscando] = useState(false)
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null)

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) router.replace("/")
    else if (role === "profesional") router.replace("/dashboard")
  }, [isAuthenticated, isLoading, role, router])

  // Cargar categorías reales una vez
  useEffect(() => {
    getCategorias()
      .then(setCategorias)
      .catch((err) => console.error("No se pudieron cargar las categorías:", err))
  }, [])

  // Al entrar por primera vez: intentar geolocalización del navegador automáticamente
  useEffect(() => {
    if (coords) return

    // 1. ¿Ya teníamos una ubicación guardada de antes? Úsala directamente, sin pedir permiso ni geocodificar de nuevo.
    const guardada = localStorage.getItem(LOCATION_KEY)
    if (guardada) {
      try {
        const parsed = JSON.parse(guardada)
        setCoords({ lat: parsed.lat, lng: parsed.lng })
        setCiudadLabel(parsed.label)
        return
      } catch {
        localStorage.removeItem(LOCATION_KEY)
      }
    }

    // 2. Si no había nada guardado, sí intentamos geolocalización automática como hasta ahora
    setLocatingUser(true)
    getBrowserLocation()
      .then((loc) => {
        if (loc) {
          setCoords(loc)
          setCiudadLabel("tu ubicación actual")
        }
      })
      .finally(() => setLocatingUser(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyLocation = useCallback(async () => {
    setLocationOpen(false)
    const ciudad = locationInput.trim()
    if (!ciudad) return
    setLocatingUser(true)
    const loc = await geocodeCiudad(ciudad)
    setLocatingUser(false)
    if (loc) {
      setCoords(loc)
      setCiudadLabel(ciudad)
      localStorage.setItem(LOCATION_KEY, JSON.stringify({ ...loc, label: ciudad }))   
    } else {
      setErrorBusqueda(`No se pudo localizar "${ciudad}". Prueba con otra ciudad.`)
    }
  }, [locationInput])

  const useMyLocation = useCallback(async () => {
    setLocationOpen(false)
    setLocatingUser(true)
    const loc = await getBrowserLocation()
    setLocatingUser(false)
    if (loc) {
      setCoords(loc)
      setCiudadLabel("tu ubicación actual")
      localStorage.setItem(LOCATION_KEY, JSON.stringify({ ...loc, label: "tu ubicación actual" }))   
    } else {
      setErrorBusqueda("No se pudo acceder a tu ubicación. Revisa los permisos del navegador.")
    }
  }, [])

  const clearLocation = () => {
    setCoords(null)
    setCiudadLabel("")
    setLocationInput("")
    localStorage.removeItem(LOCATION_KEY)  
  }

  // Buscar servicios cada vez que cambian coordenadas, categoría o texto
  useEffect(() => {
    if (!coords) return
    setBuscando(true)
    setErrorBusqueda(null)
    buscarServicios({
      lat: coords.lat,
      lng: coords.lng,
      radio_km: RADIO_KM,
      categoria_id: activeCategoriaId || undefined,
      texto: search || undefined,
    })
      .then(setServicios)
      .catch((err) => {
        console.error(err)
        setErrorBusqueda("No se pudieron cargar los servicios.")
        setServicios([])
      })
      .finally(() => setBuscando(false))
  }, [coords, activeCategoriaId, search])

  // El precio no lo filtra el backend: se filtra aquí sobre los resultados ya traídos
  const filtered = servicios.filter((s) => {
    const precio = parseFloat(s.precio)
    const matchMin = minPrice === "" || precio >= parseFloat(minPrice)
    const matchMax = maxPrice === "" || precio <= parseFloat(maxPrice)
    return matchMin && matchMax
  })

  const tarjetas = filtered.map(mapServicioParaTarjeta)

  const hasActiveFilters = minPrice !== "" || maxPrice !== ""
  const hasLocationFilter = !!coords

  const clearPriceFilters = () => {
    setMinPrice("")
    setMaxPrice("")
  }

  const activeCategoriaNombre = categorias.find((c) => c.id === activeCategoriaId)?.nombre

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="bg-primary text-primary-foreground py-12 px-4">
        <div className="max-w-3xl mx-auto space-y-6 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-balance">
            ¿Qué servicio necesitas hoy?
          </h1>
          <p className="text-primary-foreground/75 text-lg">
            Miles de profesionales listos para ayudarte
          </p>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Busca un servicio, p. ej. 'fontanería' o 'clases inglés'..."
              className="pl-12 pr-12 h-14 text-base bg-card text-foreground border-border rounded-xl shadow-lg placeholder:text-muted-foreground"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-primary-foreground/80">
            <MapPin size={14} className="shrink-0" />
            {locatingUser ? (
              <span className="flex items-center gap-2">
                <Loader size={12} className="animate-spin" /> Buscando tu ubicación...
              </span>
            ) : hasLocationFilter ? (
              <span>
                Mostrando servicios cerca de{" "}
                <strong className="text-primary-foreground">{ciudadLabel}</strong>
              </span>
            ) : (
              <span>Añade tu ubicación para ver servicios cercanos</span>
            )}
            <Popover open={locationOpen} onOpenChange={(o) => { setLocationOpen(o); if (o) setTimeout(() => locationRef.current?.focus(), 50) }}>
              <PopoverTrigger asChild>
                <button className="underline underline-offset-2 hover:text-primary-foreground transition-colors font-medium">
                  {hasLocationFilter ? "Cambiar" : "Añadir ubicación"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="center">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm text-foreground">Tu ubicación</p>
                    {hasLocationFilter && (
                      <button
                        onClick={clearLocation}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        <X size={12} /> Borrar
                      </button>
                    )}
                  </div>
                  <Button size="sm" variant="outline" className="w-full gap-2" onClick={useMyLocation}>
                    <Navigation size={14} /> Usar mi ubicación actual
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">o escribe tu ciudad</p>
                  <div className="relative">
                    <Navigation size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      ref={locationRef}
                      placeholder="Ej. Madrid, Barcelona, Sevilla..."
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") applyLocation() }}
                      className="pl-8"
                    />
                  </div>
                  <Button size="sm" className="w-full" onClick={applyLocation}>
                    Aplicar
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          {errorBusqueda && (
            <p className="text-sm text-primary-foreground/90 bg-primary-foreground/10 rounded-lg px-3 py-2 inline-block">
              {errorBusqueda}
            </p>
          )}
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setActiveCategoriaId(null)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeCategoriaId === null
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
          >
            Todos
          </button>
          {categorias.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategoriaId(cat.id)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors capitalize ${activeCategoriaId === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
            >
              {cat.nombre}
            </button>
          ))}

          <Popover open={priceOpen} onOpenChange={(o) => { setPriceOpen(o); if (o) setTimeout(() => minRef.current?.focus(), 50) }}>
            <PopoverTrigger asChild>
              <Button
                variant={hasActiveFilters ? "default" : "outline"}
                size="sm"
                className="shrink-0 gap-2"
              >
                <SlidersHorizontal size={15} />
                Precio
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0 bg-primary-foreground/20 text-primary-foreground">
                    {minPrice && maxPrice
                      ? `${minPrice}€–${maxPrice}€`
                      : minPrice
                        ? `+${minPrice}€`
                        : `–${maxPrice}€`}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm text-foreground">Filtrar por precio</p>
                  {hasActiveFilters && (
                    <button
                      onClick={clearPriceFilters}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <X size={12} /> Limpiar
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Mínimo (€)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                      <Input
                        ref={minRef}
                        type="number"
                        min="0"
                        placeholder="0"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        className="pl-7 h-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Máximo (€)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Sin límite"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        className="pl-7 h-9"
                      />
                    </div>
                  </div>
                </div>
                <Button size="sm" className="w-full" onClick={() => setPriceOpen(false)}>
                  Aplicar filtro
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            {buscando ? (
              "Buscando..."
            ) : (
              <>
                <span className="font-semibold text-foreground">{tarjetas.length}</span> servicios encontrados
                {activeCategoriaNombre && (
                  <> en <Badge variant="secondary" className="ml-1 capitalize">{activeCategoriaNombre}</Badge></>
                )}
              </>
            )}
          </p>
        </div>

        {!hasLocationFilter && !locatingUser ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <MapPin size={40} className="text-muted-foreground/40" />
            <h3 className="text-xl font-semibold text-foreground">Necesitamos tu ubicación</h3>
            <p className="text-muted-foreground max-w-sm">
              Para mostrarte servicios cercanos, indícanos tu ciudad o permite el acceso a tu ubicación.
            </p>
          </div>
        ) : tarjetas.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {tarjetas.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        ) : !buscando ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <Search size={40} className="text-muted-foreground/40" />
            <h3 className="text-xl font-semibold text-foreground">Sin resultados</h3>
            <p className="text-muted-foreground">
              No encontramos servicios con los filtros actuales cerca de ti.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearch("")
                setActiveCategoriaId(null)
                clearPriceFilters()
              }}
            >
              Limpiar filtros
            </Button>
          </div>
        ) : null}
      </main>
    </div>
  )
}