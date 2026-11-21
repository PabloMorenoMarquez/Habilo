import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import BlogCta from "@/components/blog/blog-cta"
import { formatFecha, getAllPosts, getPostBySlug, getSlugs } from "@/lib/blog"

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://habilo.es").replace(/\/+$/, "")
// La llamada a la acción del final depende de a quién va dirigido el post.
const CTA = {
  familias: {
    titulo: "Compara profesores con el precio a la vista",
    texto: "Revisa los anuncios publicados y contacta directamente con el profesor.",
    href: "/home?q=clases%20particulares",
    boton: "Ver profesores disponibles",
  },
  profesores: {
    titulo: "Publica tus clases gratis en Habilo",
    texto: "Sin comisión durante la fase piloto. Las familias de tu zona te escriben directamente.",
    href: "/da-clases",
    boton: "Crear mi perfil gratis",
  },
} as const

type PostPageProps = {
  params: Promise<{ slug: string }>
}

export const dynamicParams = false

export function generateStaticParams() {
  return getSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)

  if (!post) {
    return { title: "Guía no encontrada | Habilo", robots: { index: false, follow: false } }
  }

  const title = `${post.titulo} | Habilo`
  const url = `${SITE_URL}/blog/${post.slug}`

  return {
    title,
    description: post.descripcion,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title,
      description: post.descripcion,
      url,
      siteName: "Habilo",
      locale: "es_ES",
      publishedTime: `${post.fecha}T00:00:00Z`,
    },
    twitter: { card: "summary", title, description: post.descripcion },
    robots: { index: true, follow: true },
  }
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const url = `${SITE_URL}/blog/${post.slug}`
  const otros = getAllPosts().filter((otro) => otro.slug !== post.slug)
  const organizacion = { "@type": "Organization", name: "Habilo", url: SITE_URL }

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: post.titulo,
        description: post.descripcion,
        datePublished: `${post.fecha}T00:00:00Z`,
        dateModified: `${post.fecha}T00:00:00Z`,
        inLanguage: "es-ES",
        author: organizacion,
        publisher: organizacion,
        mainEntityOfPage: url,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Guías", item: `${SITE_URL}/blog` },
          { "@type": "ListItem", position: 3, name: post.titulo, item: url },
        ],
      },
    ],
  }

  return (
    <article className="px-4 py-10 md:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <div className="mx-auto max-w-2xl">
        <nav aria-label="Migas de pan" className="text-sm text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <li>
              <Link href="/" className="transition-colors hover:text-foreground">
                Inicio
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/blog" className="transition-colors hover:text-foreground">
                Guías
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-foreground">
              {post.titulo}
            </li>
          </ol>
        </nav>

        <header className="mt-8">
          <span className="w-fit rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {post.categoria}
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-balance md:text-5xl">
            {post.titulo}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{post.descripcion}</p>
          <p className="mt-4 text-sm text-muted-foreground">
            <time dateTime={post.fecha}>{formatFecha(post.fecha)}</time>
            {" · "}
            {post.tiempoLectura} min de lectura
          </p>
        </header>

        {post.indice.length > 0 && (
          <nav
            aria-label="En esta guía"
            className="article-toc mt-8 rounded-2xl border border-border bg-card p-5 md:p-6"
          >
            <p className="text-sm font-semibold text-foreground">En esta guía</p>
            <ol className="mt-3 space-y-2 text-[0.9375rem] leading-snug">
              {post.indice.map((seccion) => (
                <li key={seccion.id}>
                  <a
                    href={`#${seccion.id}`}
                    className="text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
                  >
                    {seccion.titulo}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div
          className="article-body mt-10"
          dangerouslySetInnerHTML={{ __html: post.contenido }}
        />

        <div className="article-cta mt-10 rounded-2xl border border-border bg-card p-6">
          <p className="text-lg font-semibold">{CTA[post.publico].titulo}</p>
          <p className="mt-2 text-muted-foreground">{CTA[post.publico].texto}</p>
          <div className="mt-5">
            <BlogCta href={CTA[post.publico].href} slug={post.slug}>
              {CTA[post.publico].boton}
            </BlogCta>
          </div>
        </div>

        {otros.length > 0 && (
          <section className="mt-12 border-t border-border pt-8">
            <h2 className="text-sm font-semibold text-muted-foreground">Sigue leyendo</h2>
            <ul className="mt-3 space-y-2">
              {otros.map((otro) => (
                <li key={otro.slug}>
                  <Link
                    href={`/blog/${otro.slug}`}
                    className="text-lg font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    {otro.titulo}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  )
}
