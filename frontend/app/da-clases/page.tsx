import type { Metadata } from "next"
import Link from "next/link"
import { RedesSociales } from "@/components/redes-sociales"
import { BadgeEuro, MessageCircle, Search, UserRound } from "lucide-react"
import LandingTeacherCta from "@/components/landing/landing-teacher-cta"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/brand/logo"
import { fetchPublic } from "@/lib/server-api"

export const revalidate = 300

export const metadata: Metadata = {
  title: "Da clases particulares en Talavera de la Reina | Habilo",
  description:
    "Publica tus clases particulares en Talavera gratis y sin comisión. Las familias te contactan directamente y tú pones el precio y el horario.",
  alternates: { canonical: "/da-clases" },
  openGraph: {
    title: "Da clases particulares en Talavera de la Reina | Habilo",
    description: "Publica tus clases gratis y sin comisión. Las familias te contactan directamente.",
    url: "/da-clases",
    siteName: "Habilo",
    locale: "es_ES",
    type: "website",
  },
}

const VENTAJAS = [
  {
    icono: BadgeEuro,
    titulo: "Gratis y sin comisión",
    texto: "Durante el piloto, publicar y recibir alumnos no cuesta nada. Lo que cobras es para ti.",
  },
  {
    icono: MessageCircle,
    titulo: "Te contactan directamente",
    texto: "Las familias te escriben desde tu anuncio. Acordáis la clase y el pago entre vosotros.",
  },
  {
    icono: Search,
    titulo: "Un perfil que aparece en Google",
    texto: "Si lo autorizas, tu perfil con tus materias y tu zona se puede encontrar en buscadores.",
  },
  {
    icono: UserRound,
    titulo: "Tú decides",
    texto:
      "Precio, horario, materias y zona los eliges tú, y puedes cambiarlos o borrar tu perfil cuando quieras.",
  },
]

const PASOS = [
  "Entra con tu cuenta de Google.",
  "Indica tu ciudad, qué enseñas y a qué niveles.",
  "Publica tu primer anuncio con precio y horario.",
]

const PREGUNTAS = [
  {
    p: "¿Cuánto cuesta?",
    r: "Nada. Durante la fase piloto Habilo es gratis para profesores y no cobra comisión por las clases.",
  },
  {
    p: "¿Se publican mi teléfono o mi email?",
    r: "No. Las familias te escriben a través de Habilo y tú decides si compartes tu contacto.",
  },
  {
    p: "¿Tengo que dar clase solo en Talavera?",
    r: "Empezamos por Talavera de la Reina y alrededores, pero puedes indicar que también das clases online.",
  },
  {
    p: "¿Puedo ofrecer otros servicios además de clases?",
    r: "Sí. Habilo es un marketplace de profesionales; las clases particulares son por donde empezamos.",
  },
]

interface ResumenPublico {
  profesores_activos: number
}

export default async function DaClasesPage() {
  const resumen = await fetchPublic<ResumenPublico>("/servicio/resumen")
  const profesores = resumen?.profesores_activos ?? 0

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
          <Link href="/" aria-label="Habilo, inicio" className="text-2xl">
            <Logo />
          </Link>
          <Button asChild variant="ghost">
            <Link href="/login">Iniciar sesión</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="bg-primary px-4 py-16 text-primary-foreground md:py-24">
          <div className="mx-auto max-w-3xl space-y-6 text-center">
            <h1 className="text-3xl font-bold text-balance md:text-5xl">
              Da clases particulares en Talavera de la Reina
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-primary-foreground/80">
              Publica tus clases gratis, sin comisión, y deja que las familias de tu zona te
              encuentren.
            </p>
            <div className="flex flex-col items-center gap-3">
              <LandingTeacherCta
                origen="teacher_page_hero"
                destino="/login"
                texto="Crear mi perfil gratis"
              />
              <p className="text-sm text-primary-foreground/70">
                {profesores > 0
                  ? `Ya hay ${profesores} profesores en Habilo. Se tarda unos dos minutos.`
                  : "Se tarda unos dos minutos."}
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="ventajas" className="px-4 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 id="ventajas" className="text-center text-2xl font-bold text-foreground md:text-3xl">
              Qué te ofrece Habilo
            </h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {VENTAJAS.map(({ icono: Icono, titulo, texto }) => (
                <div key={titulo} className="rounded-2xl border border-border bg-card p-6">
                  <div className="w-fit rounded-xl bg-primary/10 p-3 text-primary">
                    <Icono size={22} aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-semibold text-foreground">{titulo}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="pasos" className="border-y border-border bg-card px-4 py-16">
          <div className="mx-auto max-w-3xl">
            <h2 id="pasos" className="text-center text-2xl font-bold text-foreground md:text-3xl">
              Cómo empezar
            </h2>
            <ol className="mt-10 space-y-4">
              {PASOS.map((paso, i) => (
                <li key={paso} className="flex items-center gap-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  <span className="text-foreground">{paso}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="preguntas" className="px-4 py-16">
          <div className="mx-auto max-w-3xl">
            <h2 id="preguntas" className="text-center text-2xl font-bold text-foreground md:text-3xl">
              Preguntas frecuentes
            </h2>
            <dl className="mt-10 space-y-6">
              {PREGUNTAS.map(({ p, r }) => (
                <div key={p}>
                  <dt className="font-semibold text-foreground">{p}</dt>
                  <dd className="mt-1 text-muted-foreground">{r}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-12 flex justify-center">
              <LandingTeacherCta
                origen="teacher_page_footer"
                destino="/login"
                texto="Crear mi perfil gratis"
                variant="default"
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card px-4 py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <Logo className="text-xl" />
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/home" className="transition-colors hover:text-foreground">
              Buscar profesores
            </Link>
            <Link href="/blog" className="transition-colors hover:text-foreground">
              Blog
            </Link>
            <Link href="/legal/privacidad" className="transition-colors hover:text-foreground">
              Privacidad
            </Link>
          </nav>
        </div>
        <RedesSociales className="mx-auto mt-6 max-w-5xl" />
      </footer>
    </div>
  )
}
