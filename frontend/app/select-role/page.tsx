"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Search, Briefcase, ArrowRight, CheckCircle, Loader } from "lucide-react"
import { getMiPerfilProveedor, crearPerfilProveedor, ApiError } from "@/lib/api"

export default function SelectRolePage() {
  const { isAuthenticated, isLoading, role, selectRole } = useAuth()
  const router = useRouter()

  const [checkingProveedor, setCheckingProveedor] = useState(false)
  const [showProviderForm, setShowProviderForm] = useState(false)
  const [descripcion, setDescripcion] = useState("")
  const [radioKm, setRadioKm] = useState("10")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.replace("/")
    } else if (role) {
      router.replace(role === "cliente" ? "/home" : "/dashboard")
    }
  }, [isAuthenticated, isLoading, role, router])

  const goToProfesional = () => {
    selectRole("profesional")
    router.push("/dashboard")
  }

  const handleSelectCliente = () => {
    selectRole("cliente")
    router.push("/home")
  }

  const handleSelectProfesional = async () => {
    setCheckingProveedor(true)
    setFormError(null)
    try {
      // ¿Ya tiene perfil de proveedor de una sesión anterior?
      await getMiPerfilProveedor()
      goToProfesional()
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        // No tiene perfil todavía: pedimos los datos mínimos para crearlo
        setShowProviderForm(true)
      } else {
        setFormError("No se pudo comprobar tu perfil de proveedor. Inténtalo de nuevo.")
      }
    } finally {
      setCheckingProveedor(false)
    }
  }

  const handleCrearPerfil = async () => {
    if (!descripcion.trim()) {
      setFormError("Cuéntanos brevemente a qué te dedicas.")
      return
    }
    const radio = Number(radioKm)
    if (!radio || radio <= 0) {
      setFormError("Indica un radio de acción válido en km.")
      return
    }

    setSubmitting(true)
    setFormError(null)
    try {
      await crearPerfilProveedor({ descripcion, radio_km_disponible: radio })
      goToProfesional()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "No se pudo crear tu perfil de proveedor."
      setFormError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (showProviderForm) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-3">
            <div className="p-4 rounded-xl bg-accent/10 w-fit mx-auto text-accent">
              <Briefcase size={28} />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Cuéntanos sobre tu servicio</h1>
            <p className="text-muted-foreground">
              Con esto creamos tu perfil de proveedor. Podrás editarlo más adelante.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej: Fontanero con 8 años de experiencia en reparaciones domésticas"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="radioKm">Radio de acción (km)</Label>
              <Input
                id="radioKm"
                type="number"
                min={1}
                value={radioKm}
                onChange={(e) => setRadioKm(e.target.value)}
              />
            </div>

            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <Button onClick={handleCrearPerfil} disabled={submitting} className="w-full h-12">
              {submitting ? <Loader size={18} className="animate-spin" /> : "Crear perfil de proveedor"}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              disabled={submitting}
              onClick={() => setShowProviderForm(false)}
            >
              Volver
            </Button>
          </div>
        </div>
      </main>
    )
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

        {formError && <p className="text-center text-sm text-destructive">{formError}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <button
            onClick={handleSelectCliente}
            disabled={checkingProveedor}
            className="group flex flex-col gap-6 p-8 bg-card border-2 border-border rounded-2xl text-left transition-all hover:border-primary hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
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
              {["Busca entre miles de servicios", "Compara precios y valoraciones", "Contrata de forma segura"].map((item) => (
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

          <button
            onClick={handleSelectProfesional}
            disabled={checkingProveedor}
            className="group flex flex-col gap-6 p-8 bg-card border-2 border-border rounded-2xl text-left transition-all hover:border-accent hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <div className="p-4 rounded-xl bg-accent/10 w-fit group-hover:bg-accent group-hover:text-accent-foreground transition-colors text-accent">
              {checkingProveedor ? <Loader size={28} className="animate-spin" /> : <Briefcase size={28} />}
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">Soy Profesional</h2>
              <p className="text-muted-foreground leading-relaxed">
                Ofrezco servicios y quiero conseguir más clientes. Quiero publicar mis servicios y hacer crecer mi negocio.
              </p>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {["Publica tus servicios gratis", "Gestiona pedidos y clientes", "Cobra de forma segura"].map((item) => (
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