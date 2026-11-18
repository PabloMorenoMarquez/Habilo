"use client"

import { useRouter } from "next/navigation"
import { GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { captureIfConsented } from "@/lib/analytics"

interface LandingTeacherCtaProps {
  /** Valor de `cta` en el evento, para distinguir desde dónde se pulsa. */
  origen?: string
  /** Adónde lleva el botón: la página para profesores o directamente al alta. */
  destino?: string
  texto?: string
  variant?: "default" | "secondary"
}

export default function LandingTeacherCta({
  origen = "teacher",
  destino = "/da-clases",
  texto = "Soy profesor",
  variant = "secondary",
}: LandingTeacherCtaProps) {
  const router = useRouter()

  const handleClick = () => {
    captureIfConsented("landing_cta_clicked", { cta: origen })
    router.push(destino)
  }

  return (
    <Button variant={variant} size="lg" className="gap-2 rounded-xl px-6" onClick={handleClick}>
      <GraduationCap size={20} />
      {texto}
    </Button>
  )
}
