"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/context/auth-context"
import Navbar from "@/components/navbar"
import { cn } from "@/lib/utils"
import { Flag, ShieldCheck, Ban } from "lucide-react"

const TABS = [
  { href: "/admin/reportes", label: "Reportes", icon: Flag },
  { href: "/admin/proveedores", label: "Verificaciones", icon: ShieldCheck },
  { href: "/admin/usuarios", label: "Usuarios", icon: Ban },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.replace("/")
      return
    }
    if (!user?.es_admin) {
      router.replace("/home")
    }
  }, [isAuthenticated, isLoading, user, router])

  if (isLoading || !user?.es_admin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-5xl mx-auto px-4 py-8">
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Panel de administración</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona reportes, verificaciones de proveedores y usuarios.
          </p>
        </div>

        <div className="flex gap-1 border-b border-border">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const active = pathname?.startsWith(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon size={16} />
                {tab.label}
              </Link>
            )
          })}
        </div>

        {children}
      </main>
    </div>
  )
}