"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Search, Briefcase, ArrowRight, CheckCircle } from "lucide-react"

export default function SelectRolePage() {
  const { isAuthenticated, role, selectRole } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/")
    } else if (role) {
      router.replace(role === "cliente" ? "/home" : "/dashboard")
    }
  }, [isAuthenticated, role, router])

  const handleSelect = (r: "cliente" | "profesional") => {
    selectRole(r)
    router.push(r === "cliente" ? "/home" : "/dashboard")
  }

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-10">
        <div className="text-center space-y-3">
          <span className="text-2xl font-bold text-primary tracking-tight">ServiMarket</span>
          <h1 className="text-3xl font-bold text-foreground">
            ¿Cómo quieres usar ServiMarket?
          </h1>
          <p className="text-muted-foreground text-lg">
            Puedes cambiar esto en cualquier momento desde tu perfil.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Cliente card */}
          <button
            onClick={() => handleSelect("cliente")}
            className="group flex flex-col gap-6 p-8 bg-card border-2 border-border rounded-2xl text-left transition-all hover:border-primary hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="p-4 rounded-xl bg-primary/10 w-fit group-hover:bg-primary group-hover:text-primary-foreground transition-colors text-primary">
              <Search size={28} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">Soy Cliente</h2>
              <p className="text-muted-foreground leading-relaxed">
                Busco profesionales para contratar servicios. Quiero encontrar el experto adecuado para mis necesidades.
              </p>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                "Busca entre miles de servicios",
                "Compara precios y valoraciones",
                "Contrata de forma segura",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-primary shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-2 text-primary font-semibold text-sm mt-auto">
              Empezar como cliente <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Profesional card */}
          <button
            onClick={() => handleSelect("profesional")}
            className="group flex flex-col gap-6 p-8 bg-card border-2 border-border rounded-2xl text-left transition-all hover:border-accent hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="p-4 rounded-xl bg-accent/10 w-fit group-hover:bg-accent group-hover:text-accent-foreground transition-colors text-accent">
              <Briefcase size={28} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">Soy Profesional</h2>
              <p className="text-muted-foreground leading-relaxed">
                Ofrezco servicios y quiero conseguir más clientes. Quiero publicar mis servicios y hacer crecer mi negocio.
              </p>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                "Publica tus servicios gratis",
                "Gestiona pedidos y clientes",
                "Cobra de forma segura",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-accent shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-2 text-accent font-semibold text-sm mt-auto">
              Empezar como profesional <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Puedes tener ambos roles activos y cambiar entre ellos en cualquier momento.
        </p>
      </div>
    </main>
  )
}
