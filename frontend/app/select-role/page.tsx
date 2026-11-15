"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Search, Briefcase, ArrowRight, CheckCircle, Loader } from "lucide-react"
import { getMiPerfilProveedor, crearPerfilProveedor, ApiError } from "@/lib/api"
import { captureIfConsented } from "@/lib/analytics"
import { Logo } from "@/components/brand/logo"

function parseLista(valor: string): string[] {
  return valor
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

export default function SelectRolePage() {
  const { isAuthenticated, isLoading, role, selectRole } = useAuth()
  const router = useRouter()

  const [checkingProveedor, setCheckingProveedor] = useState(false)
  const [showProviderForm, setShowProviderForm] = useState(false)
  const [descripcion, setDescripcion] = useState("")
  const [radioKm, setRadioKm] = useState("10")
  const [ciudad, setCiudad] = useState("")
  const [materias, setMaterias] = useState("")
  const [niveles, setNiveles] = useState("")
  // El permiso de perfil público es un consentimiento: nunca viene marcado.
  const [perfilPublico, setPerfilPublico] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.replace("/login")
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
    if (!ciudad.trim()) {
      setFormError("Indica la ciudad en la que trabajas.")
      return
    }
    const radio = Number(radioKm)
    if (!radio || radio <= 0) {
      setFormError("Indica un radio de acción válido en km.")
      return
    }
    const listaMaterias = parseLista(materias)
    const listaNiveles = parseLista(niveles)

    setSubmitting(true)
    setFormError(null)
    try {
      const codigoReferido = localStorage.getItem("habilo_referido_codigo") || undefined
      await crearPerfilProveedor({
        descripcion,
        radio_km_disponible: radio,
        codigo_referido: codigoReferido,
        ciudad: ciudad.trim(),
        materias: listaMaterias,
        niveles: listaNiveles,
        perfil_publico: perfilPublico,
      })
      if (codigoReferido) localStorage.removeItem("habilo_referido_codigo")
      captureIfConsented("provider_profile_created", {
        service_radius_km: radio,
        public_profile: perfilPublico,
        subjects_count: listaMaterias.length,
      })
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
              Con esto creamos tu perfil. Es gratis y podrás editarlo cuando quieras.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej: Doy clases de inglés y refuerzo escolar desde hace 5 años, a domicilio y online"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ciudad">Ciudad donde trabajas</Label>
              <Input
                id="ciudad"
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                placeholder="Talavera de la Reina"
                maxLength={120}
                autoComplete="address-level2"
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

            <div className="space-y-2">
              <Label htmlFor="materias">Materias, si das clases</Label>
              <Input
                id="materias"
                value={materias}
                onChange={(e) => setMaterias(e.target.value)}
                placeholder="Matemáticas, Inglés"
                aria-describedby="materias-ayuda"
              />
              <p id="materias-ayuda" className="text-xs text-muted-foreground">
                Separa con comas. Déjalo vacío si ofreces otro tipo de servicio.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="niveles">Niveles</Label>
              <Input
                id="niveles"
                value={niveles}
                onChange={(e) => setNiveles(e.target.value)}
                placeholder="Primaria, ESO, Bachillerato"
              />
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="perfil-publico"
                  checked={perfilPublico}
                  onCheckedChange={(valor) => setPerfilPublico(valor === true)}
                  aria-describedby="perfil-publico-ayuda"
                />
                <Label htmlFor="perfil-publico" className="text-sm font-normal leading-snug">
                  Quiero un perfil público con mi nombre, foto, ciudad y precio, para que me
                  encuentren en Habilo y en Google.
                </Label>
              </div>
              <p id="perfil-publico-ayuda" className="mt-2 pl-7 text-xs text-muted-foreground">
                Si no la marcas, apareces como «Profesional de Habilo», sin nombre ni ciudad.
                Puedes cambiarlo cuando quieras desde tu panel.
              </p>
            </div>

            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <Button onClick={handleCrearPerfil} disabled={submitting} className="w-full h-12">
              {submitting ? <Loader size={18} className="animate-spin" /> : "Crear mi perfil"}
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
          <Logo className="text-3xl" />
          <h1 className="text-3xl font-bold text-foreground">
            ¿Cómo quieres usar Habilo?
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
              {["Busca entre los servicios publicados", "Compara precios y valoraciones", "Contrata de forma segura"].map((item) => (
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