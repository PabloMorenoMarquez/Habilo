import Link from "next/link"
import type { ReactNode } from "react"

type LegalDocumentProps = {
  title: string
  children: ReactNode
}

export function LegalDocument({ title, children }: LegalDocumentProps) {
  return (
    <main className="min-h-screen bg-background px-5 py-8 sm:px-8 sm:py-12">
      <article className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10">
        <header className="mb-10 border-b border-border pb-8">
          <Link href="/" className="text-xl font-bold tracking-tight text-primary hover:underline">
            Habilo
          </Link>
          <p className="mt-8 text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">Información legal</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{title}</h1>
          <p className="mt-3 text-muted-foreground">Habilo — Plataforma de servicios de proximidad</p>
        </header>

        <div className="space-y-8 text-[0.97rem] leading-7 text-foreground [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:leading-tight [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3">
          {children}
        </div>

        <nav aria-label="Información legal" className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-6 text-sm text-primary">
          <Link href="/legal/privacidad" className="hover:underline">Política de privacidad</Link>
          <Link href="/legal/terminos-y-condiciones" className="hover:underline">Términos y condiciones</Link>
          <Link href="/legal/aviso-legal" className="hover:underline">Aviso legal</Link>
        </nav>
      </article>
    </main>
  )
}