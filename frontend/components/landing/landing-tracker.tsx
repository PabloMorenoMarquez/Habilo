"use client"

import { useEffect } from "react"
import posthog from "posthog-js"
import { storeUtmFromUrl } from "@/lib/utm"

const isPostHogConfigured = Boolean(
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN && process.env.NEXT_PUBLIC_POSTHOG_HOST
)

export default function LandingTracker() {
  useEffect(() => {
    storeUtmFromUrl(window.location.search)

    const ref = new URLSearchParams(window.location.search).get("ref")
    if (ref && isPostHogConfigured) {
      posthog.capture("referral_visit", { code: ref })
    }
  }, [])

  return null
}
