import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { formatFecha, getAllPosts } from "@/lib/blog"

const TITULO = "Guías de clases particulares en Talavera | Habilo"
const DESCRIPCION =
  "Guías prácticas sobre profesores particulares, precios y cómo elegir clase en Talavera de la Reina."

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRIPCION,
  alternates: { canonical: "/blog" },
  robots: { index: true, follow: true },
  openGraph: {
    title: TITULO,
    description: DESCRIPCION,
    url: "/blog",
    siteName: "Habilo",
    locale: "es_ES",
    type: "website",
  },
}

export default function BlogIndexPage() {
  const posts = getAllPosts()

  return (
    <>
      <section className="border-b border-border bg-card px-4 py-14 md:py-20">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-semibold text-primary">Guías para familias</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-balance md:text-5xl">
            Clases particulares en Talavera, explicadas sin humo
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Datos reales, precios publicados y preguntas que conviene hacer antes de pagar.
          </p>
          <Button asChild className="mt-6">
            <Link href="/home">Buscar profesor</Link>
          </Button>
        </div>
      </section>

      <section className="px-4 py-12 md:py-16">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="flex flex-col rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
            >
              <span className="w-fit rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                {post.categoria}
              </span>
              <h2 className="mt-4 text-xl font-semibold leading-snug text-balance">
                <Link
                  href={`/blog/${post.slug}`}
                  className="transition-colors hover:text-primary"
                >
                  {post.titulo}
                </Link>
              </h2>
              <p className="mt-3 text-muted-foreground">{post.descripcion}</p>
              <p className="mt-4 text-sm text-muted-foreground">
                <time dateTime={post.fecha}>{formatFecha(post.fecha)}</time>
                {" · "}
                {post.tiempoLectura} min de lectura
              </p>
              <Link
                href={`/blog/${post.slug}`}
                aria-label={`Leer guía: ${post.titulo}`}
                className="mt-5 w-fit text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                Leer guía
              </Link>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
