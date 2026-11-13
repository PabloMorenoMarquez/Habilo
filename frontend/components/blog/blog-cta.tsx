"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { captureIfConsented } from "@/lib/analytics"

export default function BlogCta({
  href,
  slug,
  children,
}: {
  href: string
  slug: string
  children: React.ReactNode
}) {
  return (
    <Button asChild size="lg">
      <Link
        href={href}
        onClick={() => captureIfConsented("landing_cta_clicked", { cta: "blog", slug })}
      >
        {children}
      </Link>
    </Button>
  )
}
