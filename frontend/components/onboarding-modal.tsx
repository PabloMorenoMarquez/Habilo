"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Search, MessageCircle, Star } from "lucide-react"

const STORAGE_KEY = "onboarding_visto_v1"

interface Paso {
  icon: React.ReactNode
  titulo: string
  texto: string
}

const PASOS_CLIENTE: Paso[] = [
  { icon: <Search size={28} />, titulo: "Busca cerca de ti", texto: "Encuentra profesionales de tu zona por categoría o texto." },
  { icon: <MessageCircle size={28} />, titulo: "Contacta y negocia", texto: "Habla con el profesional y acordad precio y fecha en el chat." },
  { icon: <Star size={28} />, titulo: "Valora tu experiencia", texto: "Al terminar, deja tu valoración para ayudar a otros usuarios." },
]

const PASOS_PROFESIONAL: Paso[] = [
  { icon: <Search size={28} />, titulo: "Publica tus servicios", texto: "Añade título, precio y fotos para que te encuentren." },
  { icon: <MessageCircle size={28} />, titulo: "Responde solicitudes", texto: "Negocia el precio con el cliente y acepta cuando os pongáis de acuerdo." },
  { icon: <Star size={28} />, titulo: "Construye tu reputación", texto: "Las valoraciones de tus clientes aparecen en tu perfil público." },
]

export function OnboardingModal({ role }: { role: "cliente" | "profesional" }) {
  const [open, setOpen] = useState(false)
  const [paso, setPaso] = useState(0)

  useEffect(() => {
    const visto = localStorage.getItem(`${STORAGE_KEY}_${role}`)
    if (!visto) setOpen(true)
  }, [role])

  const pasos = role === "cliente" ? PASOS_CLIENTE : PASOS_PROFESIONAL

  const cerrar = () => {
    localStorage.setItem(`${STORAGE_KEY}_${role}`, "1")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && cerrar()}>
      <DialogContent className="sm:max-w-sm text-center">
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="p-4 rounded-xl bg-primary/10 text-primary">{pasos[paso].icon}</div>
          <h3 className="text-lg font-bold text-foreground">{pasos[paso].titulo}</h3>
          <p className="text-sm text-muted-foreground">{pasos[paso].texto}</p>
          <div className="flex gap-1.5">
            {pasos.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === paso ? "w-6 bg-primary" : "w-1.5 bg-muted"}`}
              />
            ))}
          </div>
          <div className="flex gap-3 w-full pt-2">
            <Button variant="ghost" className="flex-1" onClick={cerrar}>Saltar</Button>
            <Button className="flex-1" onClick={() => (paso < pasos.length - 1 ? setPaso(paso + 1) : cerrar())}>
              {paso < pasos.length - 1 ? "Siguiente" : "Empezar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}