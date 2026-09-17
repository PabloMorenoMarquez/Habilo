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
      alternates: { canonical: `/home/service/${params.id}` },
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

type ServiceStructuredData = {
  id: string
  titulo: string
  descripcion?: string | null
  categoria_nombre?: string | null
  precio?: string | number | null
  tipo_precio?: string | null
  imagen_url?: string | null
  proveedor_nombre?: string | null
  proveedor_valoracion_media?: number | null
  proveedor_num_valoraciones?: number | null
  latitud?: number | null
  longitud?: number | null
}

async function getServiceStructuredData(id: string): Promise<ServiceStructuredData | null> {
  try {
    const res = await fetch(`${API_URL}/servicio/${id}`, { next: { revalidate: 300 } })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default async function ServiceDetailPage({ params }: { params: { id: string } }) {
  const servicio = await getServiceStructuredData(params.id)
  const ratingCount = servicio?.proveedor_num_valoraciones ?? 0
  const structuredData = servicio
    ? {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: servicio.titulo,
        description: servicio.descripcion || `Servicio de ${servicio.categoria_nombre || 'profesional'} en España.`,
        serviceType: servicio.categoria_nombre || 'Servicios profesionales',
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://habilo.es'}/home/service/${servicio.id}`,
        ...(servicio.imagen_url ? { image: servicio.imagen_url } : {}),
        provider: {
          '@type': 'LocalBusiness',
          name: servicio.proveedor_nombre || 'Profesional en Habilo',
          ...(servicio.latitud != null && servicio.longitud != null
            ? { geo: { '@type': 'GeoCoordinates', latitude: servicio.latitud, longitude: servicio.longitud } }
            : {}),
        },
        ...(servicio.precio
          ? {
              offers: {
                '@type': 'Offer',
                price: servicio.precio,
                priceCurrency: 'EUR',
                priceSpecification: servicio.tipo_precio === 'hora' ? { '@type': 'UnitPriceSpecification', unitText: 'hora' } : undefined,
              },
            }
          : {}),
        ...(ratingCount > 0 && servicio.proveedor_valoracion_media != null
          ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: servicio.proveedor_valoracion_media,
                reviewCount: ratingCount,
              },
            }
            : {}),
          }
        : null

  return (
    <>
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      <ServiceDetailClient />
    </>
  )
}