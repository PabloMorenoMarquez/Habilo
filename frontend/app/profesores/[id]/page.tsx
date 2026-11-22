import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, BadgeCheck, Clock, GraduationCap, MapPin, Star } from 'lucide-react'
import Navbar from '@/components/navbar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PublicProfileContact } from '@/components/public-profile-contact'
import { fetchPublicResponse } from '@/lib/server-api'
import { formatCategoryName } from '@/lib/category'
import { fraseRevisionResenas } from '@/lib/resenas'
import type { PerfilPublicoCompleto, ResenaPublica, ServicioResumen } from '@/lib/api'
import { formatearHorario } from '@/lib/horario'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://habilo.es').replace(/\/+$/, '')


// Reseñas de alumnos por enlace: quién la escribe y desde cuándo da clase con el profesor.
const RELACION_LABELS: Record<string, string> = {
  alumno: 'alumno/a',
  padre_madre: 'madre/padre de alumno',
}

const ANTIGUEDAD_LABELS: Record<string, string> = {
  menos_3_meses: 'menos de 3 meses',
  '3_12_meses': 'de 3 a 12 meses',
  mas_1_ano: 'más de 1 año',
}

function detallesResenaAlumno(resena: ResenaPublica): string[] {
  return [
    resena.relacion ? RELACION_LABELS[resena.relacion] : undefined,
    resena.antiguedad ? ANTIGUEDAD_LABELS[resena.antiguedad] : undefined,
  ].filter((detalle): detalle is string => Boolean(detalle))
}

// «Nombre de pila» = primera palabra del nombre público.
function nombreDePila(nombrePublico: string): string {
  return nombrePublico.trim().split(/\s+/)[0] || nombrePublico
}

type ProfesorPageProps = {
  params: Promise<{ id: string }>
}

async function getPerfil(id: string) {
  // Sin caché: un 404 o un 5xx transitorio no debe quedar cacheado por ISR.
  return fetchPublicResponse<PerfilPublicoCompleto>(`/proveedor/${id}`, 0)
}

function valoracionNumerica(perfil: PerfilPublicoCompleto): number | null {
  if (perfil.num_valoraciones <= 0 || perfil.valoracion_media == null) return null
  const valor = Number(perfil.valoracion_media)
  return Number.isFinite(valor) ? valor : null
}

function formatearPrecio(servicio: ServicioResumen): string | null {
  const precio = Number(servicio.precio)
  if (!Number.isFinite(precio)) return null
  return `${precio}€${servicio.tipo_precio === 'hora' ? '/hora' : ''}`
}

function descripcionMetadata(perfil: PerfilPublicoCompleto): string {
  if (!perfil.perfil_publico) return 'Perfil de profesional en Habilo.'
  if (perfil.descripcion) return perfil.descripcion.slice(0, 155)
  const materias = perfil.materias.length > 0 ? ` de ${perfil.materias.join(', ')}` : ''
  const ubicacion = perfil.ciudad ? ` en ${perfil.ciudad}` : ''
  return `Clases particulares${materias}${ubicacion}.`
}

export async function generateMetadata({ params }: ProfesorPageProps): Promise<Metadata> {
  const { id } = await params
  const { data: perfil } = await getPerfil(id)
  const canonical = `${SITE_URL}/profesores/${id}`

  if (!perfil) {
    return {
      title: 'Perfil profesional | Habilo',
      description: 'Consulta el perfil de este profesional y contacta con él en Habilo.',
      alternates: { canonical },
      robots: { index: false, follow: true },
    }
  }

  const ubicacion = perfil.ciudad ? ` en ${perfil.ciudad}` : ''
  const titulo = `${perfil.nombre_publico} — Clases particulares${ubicacion} | Habilo`
  const descripcion = descripcionMetadata(perfil)

  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical },
    robots: perfil.perfil_publico
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      title: titulo,
      description: descripcion,
      type: 'profile',
      ...(perfil.avatar_publico ? { images: [{ url: perfil.avatar_publico }] } : {}),
    },
  }
}

export default async function ProfesorPage({ params }: ProfesorPageProps) {
  const { id } = await params
  const { status, data } = await getPerfil(id)

  if (status === 404) {
    notFound()
  }

  // Un fallo de red o del servidor no debe romper el SSR: mostramos un estado
  // honesto y el metadata ya marca la página como noindex.
  const perfil = status >= 200 && status < 300 ? data : null

  if (!perfil) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">No se pudo cargar el perfil</h1>
          <p className="text-muted-foreground mb-6">
            Ha ocurrido un problema al cargar este perfil. Inténtalo de nuevo en unos minutos.
          </p>
          <Button asChild variant="outline">
            <Link href="/home">Volver al inicio</Link>
          </Button>
        </main>
      </div>
    )
  }

  const rating = valoracionNumerica(perfil)
  const horario = formatearHorario(perfil.horario)
  const tieneHorario = Boolean(horario)
  const experiencia =
    perfil.experiencia_años != null && perfil.experiencia_años > 0
      ? `${perfil.experiencia_años} ${perfil.experiencia_años === 1 ? 'año' : 'años'} de experiencia`
      : null

  const structuredData =
    perfil.perfil_publico
      ? {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Person',
              '@id': `${SITE_URL}/profesores/${perfil.id}#person`,
              name: perfil.nombre_publico,
              ...(perfil.avatar_publico ? { image: perfil.avatar_publico } : {}),
              ...(perfil.ciudad
                ? { address: { '@type': 'PostalAddress', addressLocality: perfil.ciudad } }
                : {}),
              ...(rating != null
                ? {
                    aggregateRating: {
                      '@type': 'AggregateRating',
                      ratingValue: rating,
                      reviewCount: perfil.num_valoraciones,
                    },
                  }
                : {}),
            },
            ...perfil.servicios.map((servicio) => {
              const precio = formatearPrecio(servicio)
              return {
                '@type': 'Service',
                '@id': `${SITE_URL}/home/service/${servicio.id}#service`,
                name: servicio.titulo,
                url: `${SITE_URL}/home/service/${servicio.id}`,
                provider: { '@id': `${SITE_URL}/profesores/${perfil.id}#person` },
                ...(servicio.descripcion ? { description: servicio.descripcion } : {}),
                ...(servicio.categoria_nombre
                  ? { serviceType: formatCategoryName(servicio.categoria_nombre) }
                  : {}),
                ...(precio
                  ? {
                      offers: {
                        '@type': 'Offer',
                        price: servicio.precio,
                        priceCurrency: 'EUR',
                      },
                    }
                  : {}),
              }
            }),
          ],
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
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <Link
            href="/home"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm"
          >
            <ArrowLeft size={16} /> Volver a servicios
          </Link>

          {!perfil.perfil_publico && (
            <p className="mb-6 rounded-2xl border border-border bg-secondary/60 p-4 text-sm text-foreground">
              Este profesional aún no ha activado su perfil público.
            </p>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <section className="p-6 rounded-2xl border border-border bg-card">
                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={perfil.avatar_publico || undefined} alt={perfil.nombre_publico} />
                    <AvatarFallback className="text-2xl">
                      {perfil.nombre_publico.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
                        {perfil.nombre_publico}
                      </h1>
                      {perfil.perfil_publico && perfil.verificado === true && (
                        <Badge variant="secondary" className="gap-1 font-normal">
                          <BadgeCheck size={14} aria-hidden="true" /> Verificado
                        </Badge>
                      )}
                    </div>

                    {perfil.perfil_publico && rating != null && (
                      <div className="flex items-center gap-1 text-sm">
                        <Star size={16} className="fill-amber-400 text-amber-400" aria-hidden="true" />
                        <span className="font-semibold">{rating.toFixed(1)}</span>
                        <span className="text-muted-foreground">
                          ({perfil.num_valoraciones}{' '}
                          {perfil.num_valoraciones === 1 ? 'valoración' : 'valoraciones'})
                        </span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {(perfil.ciudad || perfil.zona) && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={14} aria-hidden="true" />
                          {[perfil.zona, perfil.ciudad].filter(Boolean).join(', ')}
                        </span>
                      )}
                      {perfil.perfil_publico && experiencia && (
                        <span className="inline-flex items-center gap-1">
                          <GraduationCap size={14} aria-hidden="true" />
                          {experiencia}
                        </span>
                      )}
                      {perfil.perfil_publico && perfil.radio_km_disponible > 0 && (
                        <span>Se desplaza hasta {perfil.radio_km_disponible} km</span>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {perfil.perfil_publico && (
                <>
                  <section className="space-y-3">
                    <h2 className="text-lg font-semibold text-foreground">Sobre mí</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      {perfil.descripcion || 'Sin descripción.'}
                    </p>
                  </section>

                  {(perfil.materias.length > 0 || perfil.niveles.length > 0) && (
                    <section className="space-y-3">
                      {perfil.materias.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-xs font-medium text-muted-foreground">Materias</span>
                          <div className="flex flex-wrap gap-1.5">
                            {perfil.materias.map((materia) => (
                              <Badge key={materia} variant="outline" className="font-normal">
                                {materia}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {perfil.niveles.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-xs font-medium text-muted-foreground">Niveles</span>
                          <div className="flex flex-wrap gap-1.5">
                            {perfil.niveles.map((nivel) => (
                              <Badge key={nivel} variant="secondary" className="font-normal">
                                {nivel}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </section>
                  )}

                  {tieneHorario && (
                    <section className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-card">
                      <div className="p-2 rounded-lg bg-secondary text-primary shrink-0">
                        <Clock size={18} aria-hidden="true" />
                      </div>
                      <div className="space-y-1">
                        <h2 className="text-sm font-semibold text-foreground">Horario habitual</h2>
                        <p className="text-sm text-muted-foreground">
                          {horario}
                        </p>
                      </div>
                    </section>
                  )}

                  <section className="space-y-3">
                    <h2 className="text-lg font-semibold text-foreground">Servicios</h2>
                    {perfil.servicios.length === 0 ? (
                      <p className="text-muted-foreground">Todavía no hay servicios publicados.</p>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-4">
                        {perfil.servicios.map((servicio) => {
                          const precio = formatearPrecio(servicio)
                          return (
                            <Link
                              key={servicio.id}
                              href={`/home/service/${servicio.id}`}
                              className="flex flex-col gap-2 p-5 rounded-2xl border border-border bg-card hover:border-primary/60 transition-colors"
                            >
                              {servicio.categoria_nombre && (
                                <Badge variant="secondary" className="self-start text-xs font-normal">
                                  {formatCategoryName(servicio.categoria_nombre)}
                                </Badge>
                              )}
                              <h3 className="font-semibold text-foreground">{servicio.titulo}</h3>
                              {servicio.descripcion && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {servicio.descripcion}
                                </p>
                              )}
                              {precio && (
                                <span className="mt-auto pt-1 text-lg font-bold text-primary">
                                  {precio}
                                </span>
                              )}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </section>

                  <section className="space-y-3">
                    <div className="space-y-1">
                      <h2 className="text-lg font-semibold text-foreground">Reseñas</h2>
                      <p className="text-sm text-muted-foreground">
                        {fraseRevisionResenas(perfil.resenas)}
                      </p>
                    </div>
                    {perfil.resenas.length === 0 ? (
                      <p className="text-muted-foreground">Todavía no hay reseñas.</p>
                    ) : (
                      <div className="space-y-3">
                        {perfil.resenas.map((resena, index) => (
                          <article
                            key={`${resena.origen ?? 'habilo'}-${resena.autor_nombre}-${resena.fecha ?? index}`}
                            className="p-5 rounded-2xl border border-border bg-card space-y-2"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-foreground">
                                <span className="font-medium">{resena.autor_nombre}</span>
                                {resena.origen === 'alumno' &&
                                  detallesResenaAlumno(resena).map((detalle) => (
                                    <span key={detalle} className="text-sm text-muted-foreground">
                                      {' · '}
                                      {detalle}
                                    </span>
                                  ))}
                              </span>
                              <span className="inline-flex items-center gap-1 text-sm shrink-0">
                                <Star
                                  size={14}
                                  className="fill-amber-400 text-amber-400"
                                  aria-hidden="true"
                                />
                                <span className="font-semibold">{resena.puntuacion}</span>
                              </span>
                            </div>
                            {resena.comentario && (
                              <p className="text-sm text-muted-foreground">{resena.comentario}</p>
                            )}
                            {resena.origen === 'alumno' ? (
                              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <BadgeCheck size={12} aria-hidden="true" />
                                Alumno/a de {nombreDePila(perfil.nombre_publico)} antes de Habilo · revisada por Habilo
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground">Clase reservada en Habilo</p>
                            )}
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>

            <aside className="lg:col-span-1">
              <div className="sticky top-24 p-6 rounded-2xl border border-border bg-card shadow-sm space-y-5">
                <div className="space-y-1">
                  <h2 className="font-semibold text-foreground">¿Necesitas clases?</h2>
                  <p className="text-sm text-muted-foreground">
                    Cuéntale qué necesitas. No hace falta crear cuenta.
                  </p>
                </div>
                <PublicProfileContact
                  perfilId={perfil.id}
                  profesionalNombre={perfil.nombre_publico}
                />
              </div>
            </aside>
          </div>
        </main>
      </div>
    </>
  )
}
