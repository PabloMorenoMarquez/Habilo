import type { Metadata } from "next"
import OpinaForm from "./opina-form"

export const metadata: Metadata = {
  title: "Deja tu opinión | Habilo",
  // Cada enlace es de un profesor y se comparte por WhatsApp: no debe salir en buscadores.
  robots: { index: false, follow: false },
  // El código del enlace no debe filtrarse por la cabecera Referer.
  referrer: "no-referrer",
}

export default async function OpinaPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  // Los datos se cargan en el navegador (opina-form), no aquí.
  return <OpinaForm codigo={codigo} />
}
