"use client"

import { useEffect } from "react"
import { captureIfConsented } from "@/lib/analytics"
import { storeUtmFromUrl } from "@/lib/utm"

export default function LandingTracker() {
  useEffect(() => {
    storeUtmFromUrl(window.location.search)

    const ref = new URLSearchParams(window.location.search).get("ref")
    if (ref) {
      captureIfConsented("referral_visit", { code: ref.slice(0, 100) })
    }
  }, [])

  return null
}
