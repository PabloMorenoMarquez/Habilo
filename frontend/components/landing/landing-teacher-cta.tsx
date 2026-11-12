"use client"

import { useRouter } from "next/navigation"
import { GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { captureIfConsented } from "@/lib/analytics"

export default function LandingTeacherCta() {
  const router = useRouter()

  const handleClick = () => {
    captureIfConsented("landing_cta_clicked", { cta: "teacher" })
    router.push("/login")
  }

  return (
    <Button variant="secondary" size="lg" className="gap-2 rounded-xl px-6" onClick={handleClick}>
      <GraduationCap size={20} />
      Soy profesor
    </Button>
  )
}
