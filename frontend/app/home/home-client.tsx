"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { useEffect, useState, useRef, useCallback } from "react"
import posthog from "posthog-js"
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
import { usePaginacion } from "@/hooks/use-paginacion"
import { OnboardingModal } from "@/components/onboarding-modal"
import { formatCategoryName } from "@/lib/category"
import { mapServicioParaTarjeta } from "@/lib/service-mapper"

const RADIO_KM = 50 // radio de búsqueda por defecto
const LOCATION_KEY = "serviclick_location"

const isPostHogConfigured = Boolean(
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN && process.env.NEXT_PUBLIC_POSTHOG_HOST
)

interface HomeClientProps {
  initialServicios: ServicioBackend[]
  initialHasMore: boolean
  initialCategorias: Categoria[]
  initialQuery: string
  initialCiudad: string
}

export default function HomeClient({
  initialServicios,
  initialHasMore,
  initialCategorias,
  initialQuery,
  initialCiudad,
}: HomeClientProps) {
  const { isAuthenticated, isLoading, role } = useAuth()
  const router = useRouter()

  const [search, setSearch] = useState(initialQuery)
  const [categorias, setCategorias] = useState<Categoria[]>(initialCategorias)
  const [activeCategoriaId, setActiveCategoriaId] = useState<string | null>(null)

  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [priceOpen, setPriceOpen] = useState(false)
  const [locationOpen, setLocationOpen] = useState(false)
  const [locationInput, setLocationInput] = useState(initialCiudad)
  const minRef = useRef<HTMLInputElement>(null)
  const locationRef = useRef<HTMLInputElement>(null)

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [ciudadLabel, setCiudadLabel] = useState(initialCiudad)
  const [ubicacionInicializada, setUbicacionInicializada] = useState(false)
  const [locatingUser, setLocatingUser] = useState(false)
  const [cargandoInicial, setCargandoInicial] = useState(initialServicios.length === 0)

  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null)

  useEffect(() => {
    if (isLoading) return
    if (isAuthenticated && role === "profesional") router.replace("/dashboard")
  }, [isAuthenticated, isLoading, role, router])

  // Cargar categorías solo si el servidor no las trajo
  useEffect(() => {
    if (initialCategorias.length > 0) return
    getCategorias()
      .then(setCategorias)
      .catch((err) => console.error("No se pudieron cargar las categorías:", err))
  }, [initialCategorias.length])

  // Al entrar: usar solo una ubicación guardada. La geolocalización del navegador
  // se pide únicamente desde el botón "Usar mi ubicación actual".
  useEffect(() => {
    if (coords) {
      setUbicacionInicializada(true)
      return
    }

    const guardada = localStorage.getItem(LOCATION_KEY)
    if (!guardada) {
      setUbicacionInicializada(true)
      return
    }

    try {
      const parsed = JSON.parse(guardada)
      setCoords({ lat: parsed.lat, lng: parsed.lng })
      setCiudadLabel(parsed.label)
    } catch {
      localStorage.removeItem(LOCATION_KEY)
    }
    setUbicacionInicializada(true)
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

  // Buscar servicios cada vez que cambian coordenadas, ciudad, categoría o texto
  const {
    items: servicios,
    cargando: buscando,
    error: errorServicios,
    hasMore,
    cargar: cargarServicios,
  } = usePaginacion<ServicioBackend>(
    (offset) =>
      buscarServicios({
        lat: coords?.lat,
        lng: coords?.lng,
        radio_km: coords ? RADIO_KM : undefined,
        ciudad: !coords && ciudadLabel ? ciudadLabel : undefined,
        categoria_id: activeCategoriaId || undefined,
        texto: search.trim() || undefined,
        offset,
      }),
    20,
    { items: initialServicios, hasMore: initialHasMore }
  )

  const primerRender = useRef(true)

  useEffect(() => {
    if (!ubicacionInicializada) return

    if (primerRender.current) {
      primerRender.current = false
      // Si los datos ya vienen del servidor, no repetir la búsqueda al montar.
      if (
        coords === null &&
        search === initialQuery &&
        activeCategoriaId === null &&
        !initialCiudad &&
        initialServicios.length > 0
      ) {
        return
      }
    }

    void cargarServicios(true).finally(() => setCargandoInicial(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ubicacionInicializada, coords, activeCategoriaId, search])

  // Capturar la búsqueda cuando el usuario deja de escribir
  useEffect(() => {
    const query = search.trim()
    const category = categorias.find((c) => c.id === activeCategoriaId)?.nombre ?? null
    if (!query && !category && !ciudadLabel) return

    const timer = setTimeout(() => {
      if (isPostHogConfigured) {
        posthog.capture("search_performed", {
          query,
          city: ciudadLabel || null,
          category,
        })
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [search, activeCategoriaId, ciudadLabel, categorias])

  // El precio no lo filtra el backend: se filtra aquí sobre los resultados ya traídos
  const filtered = servicios.filter((s) => {
    const precio = parseFloat(s.precio)
    const matchMin = minPrice === "" || precio >= parseFloat(minPrice)
    const matchMax = maxPrice === "" || precio <= parseFloat(maxPrice)
    return matchMin && matchMax
  })

  const tarjetas = filtered.map(mapServicioParaTarjeta)

  const hasActiveFilters = minPrice !== "" || maxPrice !== ""
  const hasLocationFilter = !!coords || ciudadLabel !== ""

  const clearPriceFilters = () => {
    setMinPrice("")
    setMaxPrice("")
  }

  const activeCategoriaNombre = categorias.find((c) => c.id === activeCategoriaId)?.nombre

  return (
    <div className="min-h-screen bg-background">
      <OnboardingModal role="cliente" />
      <Navbar />

      <section className="bg-primary text-primary-foreground py-12 px-4">
        <div className="max-w-3xl mx-auto space-y-6 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-balance">
            ¿Qué servicio necesitas hoy?
          </h1>
          <p className="text-primary-foreground/75 text-lg">
            Profesionales cerca de ti, listos para ayudarte
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
            ) : coords ? (
              <span>
                Mostrando servicios cerca de{" "}
                <strong className="text-primary-foreground">{ciudadLabel}</strong>
              </span>
            ) : ciudadLabel ? (
              <span>
                Mostrando servicios en{" "}
                <strong className="text-primary-foreground">{ciudadLabel}</strong>
              </span>
            ) : (
              <span>Mostrando todos los servicios</span>
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
              {formatCategoryName(cat.nombre)}
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
            {buscando || cargandoInicial ? (
              "Buscando..."
            ) : errorServicios && tarjetas.length === 0 ? (
              "No pudimos cargar los servicios"
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

        {tarjetas.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {tarjetas.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center py-6">
                <Button
                  variant="outline"
                  onClick={() => cargarServicios(false)}
                  disabled={buscando}
                >
                  {buscando ? (
                    <Loader size={16} className="animate-spin mr-2" />
                  ) : null}
                  Cargar más servicios
                </Button>
              </div>
            )}
          </>
        ) : errorServicios ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <Search size={40} className="text-muted-foreground/40" />
            <h3 className="text-xl font-semibold text-foreground">
              No pudimos cargar los servicios ahora mismo
            </h3>
            <p className="text-muted-foreground">Inténtalo de nuevo en unos minutos.</p>
          </div>
        ) : !buscando && !cargandoInicial ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <Search size={40} className="text-muted-foreground/40" />
            <h3 className="text-xl font-semibold text-foreground">Sin resultados</h3>
            <p className="text-muted-foreground">
              No encontramos servicios con los filtros actuales.
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
