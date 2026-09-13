"use client"

import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { LogIn } from "lucide-react"

interface AuthRequiredDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mensaje?: string
}

export function AuthRequiredDialog({ open, onOpenChange, mensaje }: AuthRequiredDialogProps) {
  const router = useRouter()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm text-center">
        <DialogHeader>
          <div className="mx-auto p-3 rounded-full bg-primary/10 text-primary w-fit mb-2">
            <LogIn size={24} />
          </div>
          <DialogTitle>Inicia sesión para continuar</DialogTitle>
          <DialogDescription>
            {mensaje || "Necesitas una cuenta para hacer esto."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={() => router.push("/")} className="w-full">
            Iniciar sesión
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full">
            Ahora no
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}