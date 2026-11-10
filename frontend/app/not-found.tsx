import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="space-y-2">
        <p className="text-sm font-medium text-primary">Error 404</p>
        <h1 className="text-3xl font-bold text-foreground text-balance">
          No encontramos esta página
        </h1>
        <p className="text-muted-foreground max-w-md">
          Puede que el enlace haya cambiado o que el servicio ya no esté disponible.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/">Volver al inicio</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/home">Ver servicios</Link>
        </Button>
      </div>
    </main>
  )
}
