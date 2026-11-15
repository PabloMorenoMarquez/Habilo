import { cn } from "@/lib/utils"

// Marca de Habilo: una h minúscula con un destello ("hábil": quien sabe hacer bien lo suyo).
// El tamaño lo marca el font-size del contenedor; los iconos de la app salen de la misma
// geometría en scripts/generate-icons.mjs.
export const BRAND_CORAL = "#FF6B4A"

interface LogoProps {
  /** `brand`: sobre fondos claros u oscuros de la interfaz. `onPrimary`: sobre el azul de marca. */
  tone?: "brand" | "onPrimary"
  className?: string
}

export function Logo({ tone = "brand", className }: LogoProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[0.28em] font-brand font-extrabold leading-none tracking-[-0.035em]",
        tone === "brand" ? "text-primary" : "text-primary-foreground",
        className,
      )}
    >
      <svg viewBox="40 18 142 154" aria-hidden="true" className="h-[1.2em] w-auto shrink-0">
        <path
          d="M58 50 V154 M58 124 C58 88 118 88 118 124 V154"
          fill="none"
          stroke="currentColor"
          strokeWidth="30"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M136 22 C140 50 150 60 178 64 C150 68 140 78 136 106 C132 78 122 68 94 64 C122 60 132 50 136 22Z"
          fill={BRAND_CORAL}
        />
      </svg>
      <span className={tone === "brand" ? "text-foreground" : undefined}>habilo</span>
    </span>
  )
}
