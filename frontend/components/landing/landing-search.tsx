"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { captureIfConsented } from "@/lib/analytics"

export default function LandingSearch() {
  const router = useRouter()
  const [query, setQuery] = useState("")

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    captureIfConsented("landing_cta_clicked", { cta: "search" })
    const texto = query.trim()
    router.push(texto ? `/home?q=${encodeURIComponent(texto)}` : "/home")
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className="mx-auto flex w-full max-w-2xl flex-col gap-3 sm:flex-row"
    >
      <label htmlFor="landing-search" className="sr-only">
        Materia o servicio
      </label>
      <div className="relative flex-1">
        <Search
          size={20}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id="landing-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Matemáticas, inglés, física..."
          className="h-14 rounded-xl border-border bg-card pl-12 text-base text-foreground shadow-lg placeholder:text-muted-foreground"
        />
      </div>
      <Button type="submit" variant="secondary" size="lg" className="h-14 rounded-xl px-6 text-base">
        Buscar profesor
      </Button>
    </form>
  )
}
