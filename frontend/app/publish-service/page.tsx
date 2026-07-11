"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { crearServicio, getCategorias, ApiError, type Categoria } from "@/lib/api"
import { getBrowserLocation } from "@/lib/geocode"

export default function PublishServicePage() {
  const router = useRouter()

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [categoriaId, setCategoriaId] = useState("")
  const [titulo, setTitulo] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [precio, setPrecio] = useState("")
  const [tipoPrecio, setTipoPrecio] = useState<"fijo" | "hora">("fijo")

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)

  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar categorías reales al entrar (igual que en home/page.tsx)
  useEffect(() => {
    getCategorias()
      .then(setCategorias)
      .catch(() => setError("No se pudieron cargar las categorías"))
  }, [])

  // Pedimos la ubicación una vez, al montar la página (reutiliza geocode.ts)
  useEffect(() => {
    getBrowserLocation().then((loc) => {
      if (loc) {
        setCoords(loc)
      } else {
        setLocationError(
          "No se pudo obtener tu ubicación. Revisa los permisos del navegador."
        )
      }
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!categoriaId) {
      setError("Selecciona una categoría")
      return
    }
    if (!coords) {
      setError("Necesitamos tu ubicación para publicar el servicio")
      return
    }

    setEnviando(true)
    try {
      await crearServicio({
        categoria_id: categoriaId,
        titulo,
        descripcion: descripcion || undefined,
        precio: parseFloat(precio),
        tipo_precio: tipoPrecio,
        latitud: coords.lat,
        longitud: coords.lng,
      })
      router.push("/dashboard")
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        // El backend indica que el usuario no tiene perfil de proveedor todavía
        router.push("/select-role")
        return
      }
      setError(err instanceof Error ? err.message : "Error al publicar el servicio")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Publicar un servicio</h1>

      {locationError && (
        <p className="text-amber-600 text-sm mb-4">{locationError}</p>
      )}
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Categoría</label>
          <select
            className="w-full border rounded-md p-2"
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
          >
            <option value="">Selecciona una categoría</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Título</label>
          <input
            className="w-full border rounded-md p-2"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
            maxLength={100}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Descripción</label>
          <textarea
            className="w-full border rounded-md p-2"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={4}
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Precio (€)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full border rounded-md p-2"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              required
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Tipo de precio</label>
            <select
              className="w-full border rounded-md p-2"
              value={tipoPrecio}
              onChange={(e) => setTipoPrecio(e.target.value as "fijo" | "hora")}
            >
              <option value="fijo">Precio fijo</option>
              <option value="hora">Por hora</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={enviando || !coords}
          className="w-full bg-black text-white rounded-md p-2 disabled:opacity-50"
        >
          {enviando ? "Publicando..." : "Publicar servicio"}
        </button>
      </form>
    </div>
  )
}