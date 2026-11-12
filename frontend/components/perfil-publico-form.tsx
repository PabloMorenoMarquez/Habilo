"use client"

import { useState } from "react"
import { Loader } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { actualizarPerfilProveedor, ApiError, type MiPerfilProveedor } from "@/lib/api"

interface PerfilPublicoFormProps {
  perfil: MiPerfilProveedor
  onGuardado?: (perfil: MiPerfilProveedor) => void
}

function parseLista(valor: string): string[] {
  return valor
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

export default function PerfilPublicoForm({ perfil, onGuardado }: PerfilPublicoFormProps) {
  const [ciudad, setCiudad] = useState(perfil.ciudad ?? "")
  const [zona, setZona] = useState(perfil.zona ?? "")
  const [materias, setMaterias] = useState(perfil.materias.join(", "))
  const [niveles, setNiveles] = useState(perfil.niveles.join(", "))
  const [perfilPublico, setPerfilPublico] = useState(perfil.perfil_publico)
  const [consentimientoMarketing, setConsentimientoMarketing] = useState(
    perfil.consentimiento_marketing
  )
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guardadoOk, setGuardadoOk] = useState(false)

  function marcarEditado() {
    setError(null)
    setGuardadoOk(false)
  }

  const handleGuardar = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (guardando) return
    setGuardando(true)
    setError(null)
    setGuardadoOk(false)

    try {
      const actualizado = await actualizarPerfilProveedor({
        ciudad: ciudad.trim() || null,
        zona: zona.trim() || null,
        materias: parseLista(materias),
        niveles: parseLista(niveles),
        perfil_publico: perfilPublico,
        consentimiento_marketing: consentimientoMarketing,
      })
      setGuardadoOk(true)
      onGuardado?.({ ...perfil, ...actualizado })
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setError("Revisa los datos del perfil antes de guardar.")
      } else {
        setError("No se pudo guardar el perfil público. Inténtalo de nuevo.")
      }
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={handleGuardar} className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Perfil público</h2>
        <p className="text-sm text-muted-foreground">
          Publica tu nombre, foto, ciudad y precio en un perfil indexable. Sin tu permiso, tu
          perfil aparecerá anónimo y no se indexará.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="perfil-ciudad">Ciudad</Label>
          <Input
            id="perfil-ciudad"
            value={ciudad}
            onChange={(event) => {
              setCiudad(event.target.value)
              marcarEditado()
            }}
            placeholder="Talavera de la Reina"
            autoComplete="address-level2"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="perfil-zona">Zona</Label>
          <Input
            id="perfil-zona"
            value={zona}
            onChange={(event) => {
              setZona(event.target.value)
              marcarEditado()
            }}
            placeholder="Centro"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="perfil-materias">Materias</Label>
        <Input
          id="perfil-materias"
          value={materias}
          onChange={(event) => {
            setMaterias(event.target.value)
            marcarEditado()
          }}
          placeholder="Matemáticas, Física"
          aria-describedby="perfil-materias-ayuda"
        />
        <p id="perfil-materias-ayuda" className="text-xs text-muted-foreground">Separa cada materia con una coma.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="perfil-niveles">Niveles</Label>
        <Input
          id="perfil-niveles"
          value={niveles}
          onChange={(event) => {
            setNiveles(event.target.value)
            marcarEditado()
          }}
          placeholder="Primaria, ESO, Bachillerato"
          aria-describedby="perfil-niveles-ayuda"
        />
        <p id="perfil-niveles-ayuda" className="text-xs text-muted-foreground">Separa cada nivel con una coma.</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <Checkbox
            id="perfil-publico"
            checked={perfilPublico}
            onCheckedChange={(valor) => {
              setPerfilPublico(valor === true)
              marcarEditado()
            }}
          />
          <Label htmlFor="perfil-publico" className="text-sm font-normal leading-snug">
            Acepto publicar mi nombre, foto, ciudad y precio en mi perfil público.
          </Label>
        </div>

        <div className="flex items-start gap-3">
          <Checkbox
            id="perfil-marketing"
            checked={consentimientoMarketing}
            onCheckedChange={(valor) => {
              setConsentimientoMarketing(valor === true)
              marcarEditado()
            }}
          />
          <Label htmlFor="perfil-marketing" className="text-sm font-normal leading-snug">
            Acepto que Habilo use mi imagen o voz en redes sociales.
          </Label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={guardando} className="gap-2">
          {guardando && <Loader size={16} className="animate-spin" />}
          Guardar perfil público
        </Button>
        {guardadoOk && (
          <p role="status" className="text-sm text-emerald-600">
            Perfil público actualizado.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </form>
  )
}
