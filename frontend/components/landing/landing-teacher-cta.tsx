"use client"

import { useRouter } from "next/navigation"
import { GraduationCap } from "lucide-react"
import posthog from "posthog-js"
import { Button } from "@/components/ui/button"

const isPostHogConfigured = Boolean(
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN && process.env.NEXT_PUBLIC_POSTHOG_HOST
)

export default function LandingTeacherCta() {
  const router = useRouter()

  const handleClick = () => {
    if (isPostHogConfigured) {
      posthog.capture("landing_cta_clicked", { cta: "teacher" })
    }
    router.push("/login")
  }

  return (
    <Button variant="secondary" size="lg" className="gap-2 rounded-xl px-6" onClick={handleClick}>
      <GraduationCap size={20} />
      Soy profesor
    </Button>
  )
}
