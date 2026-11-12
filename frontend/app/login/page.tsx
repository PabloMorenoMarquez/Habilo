import type { Metadata } from "next"
import LoginPageClient from "./login-client"

export const metadata: Metadata = {
  title: "Iniciar sesión | Habilo",
  robots: { index: false, follow: true },
  // El callback OAuth puede traer un token en la URL: no debe filtrarse por
  // la cabecera Referer de los subrecursos.
  referrer: "no-referrer",
}

export default function LoginPage() {
  return <LoginPageClient />
}
