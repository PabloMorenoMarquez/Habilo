import type { MetadataRoute } from 'next'
import { fetchPublic } from '@/lib/server-api'
import type { PerfilSitemapItem, ServicioSitemapItem } from '@/lib/api'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://habilo.es').replace(/\/+$/, '')

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const estaticas: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/home`, changeFrequency: 'hourly', priority: 0.9 },
  ]

  const [servicios, perfiles] = await Promise.all([
    fetchPublic<ServicioSitemapItem[]>('/servicio/sitemap'),
    fetchPublic<PerfilSitemapItem[]>('/proveedor/sitemap'),
  ])

  const urlsServicios: MetadataRoute.Sitemap = (servicios ?? []).map((servicio) => ({
    url: `${SITE_URL}/home/service/${servicio.id}`,
    lastModified: servicio.fecha_creacion ? new Date(servicio.fecha_creacion) : undefined,
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const urlsPerfiles: MetadataRoute.Sitemap = (perfiles ?? []).map((perfil) => ({
    url: `${SITE_URL}/profesores/${perfil.id}`,
    lastModified: perfil.fecha_creacion ? new Date(perfil.fecha_creacion) : undefined,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  return [...estaticas, ...urlsServicios, ...urlsPerfiles]
}
