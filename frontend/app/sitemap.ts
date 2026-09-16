import type { MetadataRoute } from 'next'
import { getCategorias } from '@/lib/api'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://habilo.es'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const estaticas: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/home`, changeFrequency: 'hourly', priority: 0.9 },
  ]

  try {
    const categorias = await getCategorias()
    const urlsCategorias: MetadataRoute.Sitemap = categorias.map((c) => ({
      url: `${SITE_URL}/home?categoria=${c.id}`,
      changeFrequency: 'daily',
      priority: 0.6,
    }))
    return [...estaticas, ...urlsCategorias]
  } catch {
    return estaticas
  }
}