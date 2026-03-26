"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { useEffect, useState, useRef } from "react"
import Navbar from "@/components/navbar"
import ServiceCard from "@/components/service-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Search, SlidersHorizontal, X, MapPin, Navigation } from "lucide-react"

const CATEGORIES = ["Todos", "Diseño", "Educación", "Tecnología", "Hogar", "Fotografía", "Deporte", "Traducción", "Finanzas"]

export default function ClientHomePage() {
  const { isAuthenticated, role, services, user, updateLocation } = useAuth()
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("Todos")
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [priceOpen, setPriceOpen] = useState(false)
  const [locationOpen, setLocationOpen] = useState(false)
  const [locationInput, setLocationInput] = useState(user?.location || "")
  const minRef = useRef<HTMLInputElement>(null)
  const locationRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isAuthenticated) router.replace("/")
    else if (role === "profesional") router.replace("/dashboard")
  }, [isAuthenticated, role, router])

  // Keep location input in sync if user location changes
  useEffect(() => {
    if (user?.location) setLocationInput(user.location)
  }, [user?.location])

  const activeServices = services.filter((s) => s.active)

  const clientLocation = user?.location?.trim().toLowerCase() || ""

  const filtered = activeServices.filter((s) => {
    const matchCat = activeCategory === "Todos" || s.category === activeCategory
    const matchSearch =
      search === "" ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase())
    const matchMin = minPrice === "" || s.price >= parseFloat(minPrice)
    const matchMax = maxPrice === "" || s.price <= parseFloat(maxPrice)
    const matchLocation =
      clientLocation === "" ||
      s.professional.location.toLowerCase().includes(clientLocation) ||
      clientLocation.includes(s.professional.location.toLowerCase().split(",")[0].trim())
    return matchCat && matchSearch && matchMin && matchMax && matchLocation
  })

  const hasActiveFilters = minPrice !== "" || maxPrice !== ""
  const hasLocationFilter = clientLocation !== ""

  const clearPriceFilters = () => {
    setMinPrice("")
    setMaxPrice("")
  }

  const clearLocation = () => {
    updateLocation("")
    setLocationInput("")
  }

  const applyLocation = () => {
    updateLocation(locationInput.trim())
    setLocationOpen(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero search */}
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
              placeholder="Busca un servicio, p. ej. 'diseño logo' o 'clases inglés'..."
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

          {/* Client location bar */}
          <div className="flex items-center justify-center gap-2 text-sm text-primary-foreground/80">
            <MapPin size={14} className="shrink-0" />
            {hasLocationFilter ? (
              <span>
                Mostrando servicios cerca de{" "}
                <strong className="text-primary-foreground">{user?.location}</strong>
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
                  <p className="text-xs text-muted-foreground">
                    Introduce tu ciudad para ver primero los servicios más cercanos.
                  </p>
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
                  {/* Quick city chips */}
                  <div className="flex flex-wrap gap-2">
                    {["Madrid", "Barcelona", "Valencia", "Sevilla", "Bilbao"].map((city) => (
                      <button
                        key={city}
                        onClick={() => { setLocationInput(city); updateLocation(city); setLocationOpen(false) }}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                          user?.location?.toLowerCase() === city.toLowerCase()
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80"
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                  <Button size="sm" className="w-full" onClick={applyLocation}>
                    Aplicar
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </section>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Categories + filters row */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {cat}
            </button>
          ))}

          {/* Location filter pill */}
          <Popover open={locationOpen} onOpenChange={(o) => { setLocationOpen(o); if (o) setTimeout(() => locationRef.current?.focus(), 50) }}>
            <PopoverTrigger asChild>
              <Button
                variant={hasLocationFilter ? "default" : "outline"}
                size="sm"
                className="shrink-0 gap-2"
              >
                <MapPin size={15} />
                {hasLocationFilter ? user?.location : "Cercanía"}
                {hasLocationFilter && (
                  <span
                    role="button"
                    aria-label="Borrar ubicación"
                    onClick={(e) => { e.stopPropagation(); clearLocation() }}
                    className="ml-1 hover:opacity-70"
                  >
                    <X size={12} />
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm text-foreground">Filtrar por cercanía</p>
                  {hasLocationFilter && (
                    <button
                      onClick={clearLocation}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <X size={12} /> Borrar
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Solo se mostrarán servicios cuya sede coincida con tu ciudad.
                </p>
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
                <div className="flex flex-wrap gap-2">
                  {["Madrid", "Barcelona", "Valencia", "Sevilla", "Bilbao"].map((city) => (
                    <button
                      key={city}
                      onClick={() => { setLocationInput(city); updateLocation(city); setLocationOpen(false) }}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                        user?.location?.toLowerCase() === city.toLowerCase()
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80"
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
                <Button size="sm" className="w-full" onClick={applyLocation}>
                  Aplicar
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Price filter popover */}
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
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Rangos rápidos</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "Hasta 25€", min: "", max: "25" },
                      { label: "25€ – 100€", min: "25", max: "100" },
                      { label: "100€ – 300€", min: "100", max: "300" },
                      { label: "Más de 300€", min: "300", max: "" },
                    ].map((range) => (
                      <button
                        key={range.label}
                        onClick={() => { setMinPrice(range.min); setMaxPrice(range.max) }}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                          minPrice === range.min && maxPrice === range.max
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80"
                        }`}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                </div>
                <Button size="sm" className="w-full" onClick={() => setPriceOpen(false)}>
                  Aplicar filtro
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Active filter pills */}
        {(hasActiveFilters || hasLocationFilter) && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Filtrando por:</span>
            {hasLocationFilter && (
              <Badge variant="secondary" className="gap-1 pr-1.5">
                <MapPin size={11} />
                {user?.location}
                <button onClick={clearLocation} className="ml-1 hover:text-destructive">
                  <X size={12} />
                </button>
              </Badge>
            )}
            {hasActiveFilters && (
              <Badge variant="secondary" className="gap-1 pr-1.5">
                <SlidersHorizontal size={11} />
                {minPrice && maxPrice
                  ? `${minPrice}€ – ${maxPrice}€`
                  : minPrice
                  ? `Desde ${minPrice}€`
                  : `Hasta ${maxPrice}€`}
                <button onClick={clearPriceFilters} className="ml-1 hover:text-destructive">
                  <X size={12} />
                </button>
              </Badge>
            )}
          </div>
        )}

        {/* Results header */}
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            <span className="font-semibold text-foreground">{filtered.length}</span> servicios encontrados
            {activeCategory !== "Todos" && (
              <> en <Badge variant="secondary" className="ml-1">{activeCategory}</Badge></>
            )}
          </p>
        </div>

        {/* Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <Search size={40} className="text-muted-foreground/40" />
            <h3 className="text-xl font-semibold text-foreground">Sin resultados</h3>
            <p className="text-muted-foreground">
              No encontramos servicios con los filtros actuales. Prueba a ampliar la búsqueda.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearch("")
                setActiveCategory("Todos")
                clearPriceFilters()
                clearLocation()
              }}
            >
              Limpiar filtros
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
