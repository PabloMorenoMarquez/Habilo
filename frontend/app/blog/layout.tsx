import Link from "next/link"
import { Button } from "@/components/ui/button"
import "./blog.css"
import { Logo } from "@/components/brand/logo"

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
          <Link href="/" aria-label="Habilo, inicio" className="text-2xl">
            <Logo />
          </Link>

          <nav className="flex items-center gap-4 text-sm text-muted-foreground sm:gap-6">
            <Link href="/home" className="hidden transition-colors hover:text-foreground sm:inline">
              Buscar profesores
            </Link>
            <Link href="/blog" className="transition-colors hover:text-foreground">
              Guías
            </Link>
          </nav>

          <Button asChild>
            <Link href="/login">Iniciar sesión</Link>
          </Button>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-border bg-card px-4 py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <Logo className="text-xl" />
            <p className="mt-1 text-sm text-muted-foreground">
              Clases particulares con profesores reales.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/home" className="transition-colors hover:text-foreground">
              Buscar profesores
            </Link>
            <Link href="/blog" className="transition-colors hover:text-foreground">
              Guías
            </Link>
            <Link href="/legal/aviso-legal" className="transition-colors hover:text-foreground">
              Aviso legal
            </Link>
            <Link href="/legal/privacidad" className="transition-colors hover:text-foreground">
              Privacidad
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
