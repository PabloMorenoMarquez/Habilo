import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ServiceDetailClient from './service-detail-client'
import { fetchPublicResponse } from '@/lib/server-api'
import { formatCategoryName } from '@/lib/category'
import type { ServicioBackend } from '@/lib/api'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://habilo.es'

type ServiceDetailPageProps = {
  params: Promise<{ id: string }>
}

async function getServicio(id: string) {
  return fetchPublicResponse<ServicioBackend>(`/servicio/${id}`)
}

export async function generateMetadata({ params }: ServiceDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const { data: servicio } = await getServicio(id)
  const canonical = `/home/service/${id}`

  if (!servicio) {
    return {
      title: 'Servicio | Habilo',
      description: 'Consulta los detalles de este servicio y contacta con el profesional en Habilo.',
      alternates: { canonical },
      robots: { index: false, follow: true },
    }
  }

  const titulo = `${servicio.titulo} | Habilo`
  const descripcion =
    servicio.descripcion?.slice(0, 155) ||
    (servicio.categoria_nombre
      ? `Servicio de ${formatCategoryName(servicio.categoria_nombre).toLowerCase()} en Habilo.`
      : 'Consulta los detalles de este servicio y contacta con el profesional en Habilo.')

  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical },
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
}

export default async function ServiceDetailPage({ params }: ServiceDetailPageProps) {
  const { id } = await params
  const { status, data } = await getServicio(id)

  if (status === 404) {
    notFound()
  }

  // Un fallo de red o del servidor no debe romper el SSR: el cliente muestra
  // su estado de error y puede reintentar la carga.
  const servicio = status >= 200 && status < 300 ? data : null

  const ratingCount = servicio?.proveedor_num_valoraciones ?? 0
  const structuredData = servicio
    ? {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: servicio.titulo,
        description:
          servicio.descripcion ||
          (servicio.categoria_nombre
            ? `Servicio de ${formatCategoryName(servicio.categoria_nombre).toLowerCase()} en España.`
            : 'Servicio publicado en Habilo.'),
        ...(servicio.categoria_nombre
          ? { serviceType: formatCategoryName(servicio.categoria_nombre) }
          : {}),
        url: `${SITE_URL}/home/service/${servicio.id}`,
        ...(servicio.imagen_url ? { image: servicio.imagen_url } : {}),
        provider: {
          '@type': 'LocalBusiness',
          name: servicio.proveedor_nombre || 'Profesional de Habilo',
          ...(servicio.latitud != null && servicio.longitud != null
            ? { geo: { '@type': 'GeoCoordinates', latitude: servicio.latitud, longitude: servicio.longitud } }
            : {}),
        },
        ...(servicio.proveedor_ciudad ? { areaServed: { '@type': 'City', name: servicio.proveedor_ciudad } } : {}),
        ...(servicio.precio
          ? {
              offers: {
                '@type': 'Offer',
                price: servicio.precio,
                priceCurrency: 'EUR',
                priceSpecification:
                  servicio.tipo_precio === 'hora'
                    ? { '@type': 'UnitPriceSpecification', unitText: 'hora' }
                    : undefined,
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}
        />
      )}
      <ServiceDetailClient key={servicio?.id ?? id} initialServicio={servicio} />
    </>
  )
}
