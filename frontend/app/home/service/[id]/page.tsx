import type { Metadata } from 'next'
import ServiceDetailClient from './service-detail-client'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const res = await fetch(`${API_URL}/servicio/${params.id}`, { next: { revalidate: 300 } })
    if (!res.ok) throw new Error('not found')
    const servicio = await res.json()

    const titulo = `${servicio.titulo} — Habilo`
    const descripcion = servicio.descripcion?.slice(0, 155) || `Servicio de ${servicio.categoria_nombre || 'confianza'} en Habilo.`

    return {
      title: titulo,
      description: descripcion,
      openGraph: {
        title: titulo,
        description: descripcion,
        images: servicio.imagen_url ? [{ url: servicio.imagen_url }] : undefined,
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: titulo,
        description: descripcion,
        images: servicio.imagen_url ? [servicio.imagen_url] : undefined,
      },
    }
  } catch {
    return { title: 'Servicio — Habilo' }
  }
}

export default function ServiceDetailPage() {
  return <ServiceDetailClient />
}