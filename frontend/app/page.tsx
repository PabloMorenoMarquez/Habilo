"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { useEffect, useState, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Search, Star, Shield, Loader } from "lucide-react"
import { API_URL } from "@/lib/api"

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

const FacebookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      fill="#1877F2"
      d="M24 12.073c0-6.627-5.373-12-12-12S0 5.446 0 12.073C0 18.062 4.388 23.027 10.125 23.927v-8.437H7.078v-3.417h3.047V9.412c0-3.007 1.792-4.669 4.533-4.669 1.313 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.417h-2.796v8.437C19.612 23.027 24 18.062 24 12.073z"
    />
  </svg>
)

function LoginPageInner() {
  const { isAuthenticated, isLoading, role, loginWithToken } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isProcessingToken, setIsProcessingToken] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  useEffect(() => {
    const token = searchParams.get("token")
    if (!token) return

    setIsProcessingToken(true)
    loginWithToken(token)
      .then(() => {
        router.replace("/")
      })
      .catch((err) => {
        console.error("Error al iniciar sesión:", err)
        setLoginError("No se pudo iniciar sesión. Inténtalo de nuevo.")
      })
      .finally(() => setIsProcessingToken(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    if (isLoading || isProcessingToken) return
    if (isAuthenticated && role) {
      router.replace(role === "cliente" ? "/home" : "/dashboard")
    } else if (isAuthenticated && !role) {
      router.replace("/select-role")
    }
  }, [isAuthenticated, role, isLoading, isProcessingToken, router])

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/auth/google/login`
  }

  const handleFacebookLogin = () => {
    window.location.href = `${API_URL}/auth/facebook/login`
  }

  const showSpinner = isLoading || isProcessingToken

  return (
    <main className="min-h-screen flex flex-col lg:flex-row">
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-12 text-primary-foreground">
        <div>
          <span className="text-2xl font-bold font-sans tracking-tight">ServiMarket</span>
        </div>
        <div className="space-y-8">
          <h1 className="text-5xl font-bold leading-tight text-balance">
            El marketplace de servicios que conecta talento con oportunidad
          </h1>
          <p className="text-primary-foreground/70 text-lg leading-relaxed">
            Miles de profesionales verificados esperan para ayudarte. Encuentra al experto perfecto o publica tus servicios hoy.
          </p>
          <div className="grid grid-cols-1 gap-4">
            {[
              { icon: <Search size={20} />, label: "Encuentra servicios en segundos" },
              { icon: <Shield size={20} />, label: "Profesionales verificados" },
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
          +12.000 profesionales · +48.000 servicios realizados
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden text-center">
            <span className="text-3xl font-bold text-primary font-sans tracking-tight">ServiMarket</span>
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
            <span className="text-primary cursor-pointer hover:underline">Términos de servicio</span>{" "}
            y{" "}
            <span className="text-primary cursor-pointer hover:underline">Política de privacidad</span>.
          </p>
        </div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  )
}