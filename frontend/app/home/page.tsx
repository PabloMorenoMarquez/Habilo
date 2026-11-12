import type { Metadata } from "next"
import HomeClient from "./home-client"
import { fetchPublic } from "@/lib/server-api"
import type { Categoria, ServicioBackend } from "@/lib/api"

export const revalidate = 300

export const metadata: Metadata = {
  title: "Clases particulares en Talavera de la Reina | Habilo",
  description: "Encuentra profesores de matemáticas, inglés, lengua y más en Talavera de la Reina.",
  alternates: { canonical: "/home" },
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; ciudad?: string }>
}) {
  const { q = "", ciudad = "" } = await searchParams
  const params = new URLSearchParams({ limit: "20" })
  if (q) params.set("texto", q)
  if (ciudad) params.set("ciudad", ciudad)

  const [servicios, categorias] = await Promise.all([
    fetchPublic<{ items: ServicioBackend[]; has_more: boolean }>(`/servicio/?${params}`),
    fetchPublic<Categoria[]>("/categorias/"),
  ])

  return (
    <HomeClient
      initialServicios={servicios?.items ?? []}
      initialHasMore={servicios?.has_more ?? false}
      initialCategorias={categorias ?? []}
      initialQuery={q}
      initialCiudad={ciudad}
    />
  )
}
