import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import {
  BookOpen,
  GraduationCap,
  MessageCircle,
  Search,
  ShieldCheck,
  Wallet,
} from "lucide-react"
import ServiceCard from "@/components/service-card"
import LandingSearch from "@/components/landing/landing-search"
import LandingTeacherCta from "@/components/landing/landing-teacher-cta"
import { Button } from "@/components/ui/button"
import { fetchPublic } from "@/lib/server-api"
import { mapServicioParaTarjeta } from "@/lib/service-mapper"
import { formatCategoryName } from "@/lib/category"
import type { Categoria, Paginado, ServicioBackend } from "@/lib/api"

export const revalidate = 300

const H1 = "Clases particulares en Talavera de la Reina, con profesores reales"

export const metadata: Metadata = {
  title: "Clases particulares en Talavera de la Reina | Habilo",
  description:
    "Encuentra profesores particulares en Talavera de la Reina por materia y nivel. Compara precios y contacta directamente con el profesor, sin comisiones ocultas.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Clases particulares en Talavera de la Reina | Habilo",
    description:
      "Encuentra profesores particulares en Talavera de la Reina por materia y nivel. Compara precios y contacta directamente con el profesor.",
    url: "/",
    siteName: "Habilo",
    locale: "es_ES",
    type: "website",
  },
}

interface ResumenPublico {
  servicios_activos: number
  profesores_activos: number
  resenas: number
}

const PASOS = [
  {
    titulo: "Busca lo que necesitas",
    texto: "Escribe la materia o el servicio y revisa los profesores disponibles.",
    icono: Search,
  },
  {
    titulo: "Compara profesores",
    texto: "Revisa precio, experiencia y disponibilidad antes de decidir.",
    icono: BookOpen,
  },
  {
    titulo: "Contacta y paga directo",
    texto: "Habla con el profesor y acuerda la clase. El pago es directo, sin comisiones ocultas.",
    icono: MessageCircle,
  },
]

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; ref?: string }>
}) {
  const { token, ref } = await searchParams

  // Mantiene los callbacks OAuth antiguos o en caché que aún llegan a la portada.
  if (token) {
    const query = new URLSearchParams({ token })
    if (ref) query.set("ref", ref)
    redirect(`/login?${query.toString()}`)
  }

  const [resumen, serviciosData, categoriasData] = await Promise.all([
    fetchPublic<ResumenPublico>("/servicio/resumen"),
    fetchPublic<Paginado<ServicioBackend>>("/servicio/?limit=6"),
    fetchPublic<Categoria[]>("/categorias/"),
  ])

  const servicios = (serviciosData?.items ?? []).slice(0, 6).map(mapServicioParaTarjeta)
  const categorias = categoriasData ?? []
  const serviciosActivos = resumen?.servicios_activos ?? 0
  const profesoresActivos = resumen?.profesores_activos ?? 0
  const resenas = resumen?.resenas ?? 0
  const datosDisponibles = resumen !== null && serviciosData !== null
  const catalogoVacio = serviciosData !== null && serviciosData.items.length === 0
  const sinServicios = datosDisponibles && serviciosActivos === 0

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <Link href="/" className="text-xl font-bold tracking-tight text-primary">
            Habilo
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <Link href="#servicios" className="transition-colors hover:text-foreground">
              Servicios
            </Link>
            <Link href="#como-funciona" className="transition-colors hover:text-foreground">
              Cómo funciona
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/login">Soy profesor</Link>
            </Button>
            <Button asChild>
              <Link href="/login">Iniciar sesión</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="bg-primary px-4 py-16 text-primary-foreground md:py-24">
          <div className="mx-auto max-w-4xl space-y-8 text-center">
            <h1 className="text-3xl font-bold text-balance md:text-5xl">{H1}</h1>
            <p className="mx-auto max-w-2xl text-lg text-primary-foreground/80">
              Encuentra profesores para primaria, ESO, bachillerato y adultos. Compara precios y
              contacta directamente con el profesor que encaje contigo.
            </p>
            <LandingSearch />
            {categorias.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="text-sm text-primary-foreground/70">Explora por materia:</span>
                {categorias.slice(0, 6).map((categoria) => (
                  <Link
                    key={categoria.id}
                    href={`/home?q=${encodeURIComponent(categoria.nombre)}`}
                    className="rounded-full border border-primary-foreground/25 px-3 py-1 text-sm text-primary-foreground/85 transition-colors hover:bg-primary-foreground/10"
                  >
                    {formatCategoryName(categoria.nombre)}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <section aria-label="Datos reales de Habilo" className="border-b border-border bg-card px-4 py-10">
          <div className="mx-auto max-w-5xl">
            {!datosDisponibles ? (
              <div className="text-center">
                <h2 className="text-xl font-semibold text-foreground">
                  No pudimos cargar los servicios ahora mismo
                </h2>
                <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
                  Inténtalo de nuevo en unos minutos.
                </p>
              </div>
            ) : sinServicios ? (
              <div className="text-center">
                <h2 className="text-xl font-semibold text-foreground">
                  Estamos incorporando los primeros profesores
                </h2>
                <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
                  Todavía no hay clases publicadas. Si das clases, puedes crear tu perfil y
                  empezar a recibir alumnos.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-x-16 gap-y-8 text-center">
                <div>
                  <p className="text-3xl font-bold text-foreground">{profesoresActivos}</p>
                  <p className="text-sm text-muted-foreground">
                    {profesoresActivos === 1 ? "profesor activo" : "profesores activos"}
                  </p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">{serviciosActivos}</p>
                  <p className="text-sm text-muted-foreground">
                    {serviciosActivos === 1 ? "servicio publicado" : "servicios publicados"}
                  </p>
                </div>
                {resenas > 0 && (
                  <div>
                    <p className="text-3xl font-bold text-foreground">{resenas}</p>
                    <p className="text-sm text-muted-foreground">
                      {resenas === 1 ? "reseña de alumno" : "reseñas de alumnos"}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Wallet size={16} /> Pago directo al profesor
              </span>
              <span className="flex items-center gap-2">
                <ShieldCheck size={16} /> Sin comisiones ocultas
              </span>
            </div>
          </div>
        </section>

        <section id="servicios" className="px-4 py-16">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground md:text-3xl">
                  Servicios publicados
                </h2>
                <p className="mt-1 text-muted-foreground">
                  Una muestra de las clases que puedes encontrar hoy en Habilo.
                </p>
              </div>
              {datosDisponibles && servicios.length > 0 && (
                <Button asChild variant="outline">
                  <Link href="/home">Ver todos los servicios</Link>
                </Button>
              )}
            </div>

            {datosDisponibles && servicios.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {servicios.map((servicio) => (
                  <ServiceCard key={servicio.id} service={servicio} />
                ))}
              </div>
            ) : datosDisponibles && catalogoVacio && sinServicios ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
                <GraduationCap size={40} className="mx-auto text-muted-foreground/50" />
                <h3 className="mt-4 text-xl font-semibold text-foreground">
                  Todavía no hay clases publicadas
                </h3>
                <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                  Si das clases, publica tu perfil gratis y empieza a recibir alumnos.
                </p>
                <div className="mt-6 flex justify-center">
                  <LandingTeacherCta />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
                <BookOpen size={40} className="mx-auto text-muted-foreground/50" />
                <h3 className="mt-4 text-xl font-semibold text-foreground">
                  Catálogo no disponible
                </h3>
                <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                  No pudimos cargar los servicios ahora mismo. Inténtalo de nuevo en unos minutos.
                </p>
                <div className="mt-6 flex justify-center">
                  <Button asChild variant="outline">
                    <Link href="/home">Buscar profesor</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>

        <section id="como-funciona" className="border-y border-border bg-secondary/40 px-4 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-2xl font-bold text-foreground md:text-3xl">
              Cómo funciona
            </h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {PASOS.map((paso, indice) => {
                const Icono = paso.icono
                return (
                  <div key={paso.titulo} className="rounded-2xl border border-border bg-card p-6">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {indice + 1}
                      </span>
                      <Icono size={20} className="text-primary" />
                    </div>
                    <h3 className="mt-4 font-semibold text-foreground">{paso.titulo}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{paso.texto}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section id="soy-profesor" className="px-4 py-16">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 rounded-3xl bg-primary px-6 py-12 text-center text-primary-foreground">
            <h2 className="text-2xl font-bold text-balance md:text-3xl">
              ¿Das clases particulares?
            </h2>
            <p className="max-w-2xl text-primary-foreground/80">
              Publica tus clases, muestra tu experiencia y recibe alumnos de tu zona. Crear el
              perfil es gratis.
            </p>
            <LandingTeacherCta />
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card px-4 py-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-lg font-bold text-primary">Habilo</p>
              <p className="text-sm text-muted-foreground">
                Clases particulares con profesores reales.
              </p>
            </div>
            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <Link href="/home" className="transition-colors hover:text-foreground">
                Buscar profesores
              </Link>
              <Link href="/login" className="transition-colors hover:text-foreground">
                Soy profesor
              </Link>
              <Link href="/legal/aviso-legal" className="transition-colors hover:text-foreground">
                Aviso legal
              </Link>
              <Link href="/legal/privacidad" className="transition-colors hover:text-foreground">
                Privacidad
              </Link>
              <Link
                href="/legal/terminos-y-condiciones"
                className="transition-colors hover:text-foreground"
              >
                Términos y condiciones
              </Link>
            </nav>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            © {new Date().getFullYear()} Habilo. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
