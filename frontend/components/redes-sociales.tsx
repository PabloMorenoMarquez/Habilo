const REDES = [
  { nombre: "Instagram", href: "https://www.instagram.com/habilo.app/" },
  { nombre: "TikTok", href: "https://www.tiktok.com/@habilo.es" },
  { nombre: "YouTube", href: "https://www.youtube.com/@Habilo-app" },
]

/** Enlaces a las redes de Habilo para el pie de las páginas públicas. */
export function RedesSociales({ className = "" }: { className?: string }) {
  return (
    <p className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground ${className}`}>
      <span>Síguenos:</span>
      {REDES.map((red) => (
        <a
          key={red.nombre}
          href={red.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Habilo en ${red.nombre} (se abre en otra pestaña)`}
          className="py-1 underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          {red.nombre}
        </a>
      ))}
    </p>
  )
}
