import type { MetadataRoute } from 'next'
import { getCategorias } from '@/lib/api'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://habilo.es'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const estaticas: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/home`, changeFrequency: 'hourly', priority: 0.9 },
  ]

  try {
    const [categorias, serviciosResponse] = await Promise.all([
      getCategorias(),
      fetch(`${API_URL}/servicio/sitemap`, { next: { revalidate: 300 } }),
    ])
    const urlsCategorias: MetadataRoute.Sitemap = categorias.map((c) => ({
      url: `${SITE_URL}/home?categoria=${c.id}`,
      changeFrequency: 'daily',
      priority: 0.6,
    }))
    const servicios = serviciosResponse.ok ? await serviciosResponse.json() : []
    const urlsServicios: MetadataRoute.Sitemap = servicios.map((servicio: { id: string; fecha_creacion?: string }) => ({
      url: `${SITE_URL}/home/service/${servicio.id}`,
      lastModified: servicio.fecha_creacion ? new Date(servicio.fecha_creacion) : undefined,
      changeFrequency: 'weekly',
      priority: 0.8,
    }))
    return [...estaticas, ...urlsCategorias, ...urlsServicios]
  } catch {
    return estaticas
  }
}