"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Search, Star, Shield, Loader } from "lucide-react"
import { API_URL, clearToken } from "@/lib/api"
import { captureIfConsented } from "@/lib/analytics"
import { Logo } from "@/components/brand/logo"

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

// La app de Meta sigue en modo desarrollo: solo sus administradores pueden entrar y el
// resto ve un error de Facebook. Para publicarla Meta exige verificar una empresa
// registrada, que Habilo aún no tiene. Volver a `true` cuando la app esté publicada.
const FACEBOOK_LOGIN_ACTIVO = false

const FacebookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      fill="#1877F2"
      d="M24 12.073c0-6.627-5.373-12-12-12S0 5.446 0 12.073C0 18.062 4.388 23.027 10.125 23.927v-8.437H7.078v-3.417h3.047V9.412c0-3.007 1.792-4.669 4.533-4.669 1.313 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.417h-2.796v8.437C19.612 23.027 24 18.062 24 12.073z"
    />
  </svg>
)

/**
 * Extrae el token de la URL y borra el parámetro de la barra de direcciones
 * antes de que se ejecute cualquier efecto de autenticación o analítica. El
 * `ref` se conserva para que LandingTracker mantenga la atribución.
 */
function extraerTokenYLimpiarUrl(): string | null {
  if (typeof window === "undefined") return null
  const params = new URLSearchParams(window.location.search)
  const token = params.get("token")
  if (!token) return null

  params.delete("token")
  const query = params.toString()
  const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`
  window.history.replaceState(window.history.state, "", url)
  return token
}

// Token recibido de la vuelta de OAuth, pendiente de usar. Vive fuera del componente a
// propósito: en producción React puede descartar el primer renderizado (hidratación del
// Suspense de useSearchParams) y volver a montar con hooks nuevos. Un useRef se perdía con
// ese renderizado descartado mientras la URL ya estaba limpia, y el usuario se quedaba en
// el login sin error (2026-11-21).
let tokenPendiente: string | null = null

function LoginPageInner() {
  const { isAuthenticated, isLoading, role, loginWithToken } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isProcessingToken, setIsProcessingToken] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  // Se limpia la URL en el propio renderizado, antes de cualquier efecto de analítica.
  if (typeof window !== "undefined") {
    const token = extraerTokenYLimpiarUrl()
    if (token) tokenPendiente = token
  }

  useEffect(() => {
    const token = tokenPendiente
    if (!token) return
    tokenPendiente = null

    setIsProcessingToken(true)
    loginWithToken(token)
      .then(() => router.replace("/login"))
      .catch((err) => {
        console.error("Error al iniciar sesión:", err)
        clearToken()
        setLoginError("No se pudo iniciar sesión. Inténtalo de nuevo.")
      })
      .finally(() => setIsProcessingToken(false))
  }, [loginWithToken, router])

  useEffect(() => {
    if (isLoading || isProcessingToken) return
    if (isAuthenticated && role) {
      router.replace(role === "cliente" ? "/home" : "/dashboard")
    } else if (isAuthenticated && !role) {
      router.replace("/select-role")
    }
  }, [isAuthenticated, role, isLoading, isProcessingToken, router])

  useEffect(() => {
    const ref = searchParams.get("ref")
    if (ref) {
      try {
        localStorage.setItem("habilo_referido_codigo", ref)
      } catch {
        // Almacenamiento bloqueado: el login sigue funcionando sin referido.
      }
    }
  }, [searchParams])

  const handleGoogleLogin = () => {
    captureIfConsented("signup_started", { provider: "google" })
    window.location.href = `${API_URL}/auth/google/login`
  }

  const handleFacebookLogin = () => {
    captureIfConsented("signup_started", { provider: "facebook" })
    window.location.href = `${API_URL}/auth/facebook/login`
  }

  const showSpinner = isLoading || isProcessingToken

  return (
    <main className="min-h-screen flex flex-col lg:flex-row">
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-12 text-primary-foreground">
        <div>
          <Logo tone="onPrimary" className="text-3xl" />
        </div>
        <div className="space-y-8">
          <h1 className="text-5xl font-bold leading-tight text-balance">
            El marketplace de servicios que conecta talento con oportunidad
          </h1>
          <p className="text-primary-foreground/70 text-lg leading-relaxed">
            Profesionales de tu zona, listos para ayudarte. Encuentra al experto que necesitas o publica tus servicios hoy.
          </p>
          <div className="grid grid-cols-1 gap-4">
            {[
              { icon: <Search size={20} />, label: "Encuentra servicios en segundos" },
              { icon: <Shield size={20} />, label: "Perfiles claros y contacto directo" },
              { icon: <Star size={20} />, label: "Valoraciones reales de clientes" },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-3 text-primary-foreground/85">
                <div className="p-2 rounded-lg bg-primary-foreground/10">{icon}</div>
                <span className="font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="text-primary-foreground/50 text-sm">
          En fase piloto — sé de los primeros en unirte
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden text-center">
            <Logo className="text-4xl" />
            <p className="text-muted-foreground mt-2">El marketplace de servicios</p>
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-foreground">Bienvenido de nuevo</h2>
            <p className="text-muted-foreground leading-relaxed">
              Accede a tu cuenta para encontrar servicios o gestionar tu actividad profesional.
            </p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={handleGoogleLogin}
              variant="outline"
              disabled={showSpinner}
              className="w-full h-12 text-base gap-3 border-border rounded-full flex items-center justify-center bg-background hover:bg-white hover:border-[#4285F4] hover:shadow-[0_8px_30px_rgb(66,133,244,0.12)] hover:-translate-y-1 hover:scale-[1.01] transition-all duration-300 active:scale-95 shadow-sm group cursor-pointer"
            >
              <div className="group-hover:scale-110 transition-transform duration-300">
                <GoogleIcon />
              </div>
              <span className="font-medium group-hover:text-[#4285F4] transition-colors duration-300">Continuar con Google</span>
            </Button>

            {FACEBOOK_LOGIN_ACTIVO ? (
              <Button
                onClick={handleFacebookLogin}
                variant="outline"
                disabled={showSpinner}
                className="w-full h-12 text-base gap-3 border-border rounded-full flex items-center justify-center bg-background hover:bg-white hover:border-[#1877F2] hover:shadow-[0_8px_30px_rgb(24,119,242,0.12)] hover:-translate-y-1 hover:scale-[1.01] transition-all duration-300 active:scale-95 shadow-sm group cursor-pointer"
              >
                <div className="group-hover:scale-110 transition-transform duration-300">
                  <FacebookIcon />
                </div>
                <span className="font-medium group-hover:text-[#1877F2] transition-colors duration-300">Continuar con Facebook</span>
              </Button>
            ) : (
              // Las cuentas se identifican por el correo: con Google y el mismo correo
              // se entra en la cuenta que se creó con Facebook.
              <p className="text-center text-sm text-muted-foreground leading-relaxed">
                ¿Te registraste con Facebook? Entra con Google usando el mismo correo, o escríbenos a{" "}
                <a href="mailto:soporte@habilo.es" className="text-primary hover:underline">soporte@habilo.es</a>.
              </p>
            )}

            {showSpinner && (
              <div className="flex items-center justify-center py-2">
                <Loader size={18} className="animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Iniciando sesión...</span>
              </div>
            )}

            {loginError && (
              <p className="text-center text-sm text-destructive">{loginError}</p>
            )}
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Al continuar, aceptas nuestros{" "}
            <Link href="/legal/terminos-y-condiciones" className="text-primary hover:underline">Términos de servicio</Link>{" "}
            y{" "}
            <Link href="/legal/privacidad" className="text-primary hover:underline">Política de privacidad</Link>{" "}
            y el{" "}
            <Link href="/legal/aviso-legal" className="text-primary hover:underline">Aviso legal</Link>.
          </p>
        </div>
      </div>
    </main>
  )
}

export default function LoginPageClient() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  )
}
