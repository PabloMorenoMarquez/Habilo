// hooks/use-paginacion.ts
"use client"

import { useState, useCallback } from "react"
import type { Paginado } from "@/lib/api"

export function usePaginacion<T>(
  fetcher: (offset: number) => Promise<Paginado<T>>,
  limit = 20
) {
  const [items, setItems] = useState<T[]>([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(
    async (reset = false) => {
      setCargando(true)
      setError(null)
      const desde = reset ? 0 : offset
      try {
        const data = await fetcher(desde)
        setItems((prev) => (reset ? data.items : [...prev, ...data.items]))
        setOffset(desde + limit)
        setHasMore(data.has_more)
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar")
      } finally {
        setCargando(false)
      }
    },
    [fetcher, offset, limit]
  )

  return { items, cargando, hasMore, error, cargar, setItems }
}