"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader, ShieldCheck, ShieldAlert, FileText, Upload, Eye } from "lucide-react"
import { getSignedUrlDocumento, confirmarDocumento, getMiDocumentoUrl, ApiError } from "@/lib/api"
import { subirDocumentoProveedor } from "@/lib/storage"

interface DocumentoIdentidadProps {
  verificado: boolean | null
  tieneDocumento: boolean
  motivoRechazo: string | null
  onDocumentoSubido: () => void
}

export default function DocumentoIdentidad({
  verificado,
  tieneDocumento,
  motivoRechazo,
  onDocumentoSubido,
}: DocumentoIdentidadProps) {
  const [subiendo, setSubiendo] = useState(false)
  const [abriendoDocumento, setAbriendoDocumento] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSeleccionarArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    setError(null)
    setSubiendo(true)
    try {
      const { path, token } = await getSignedUrlDocumento()
      const ok = await subirDocumentoProveedor(path, token, file)
      if (!ok) {
        setError("No se pudo subir el documento. Inténtalo de nuevo.")
        return
      }
      await confirmarDocumento(path)
      onDocumentoSubido()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo subir el documento")
    } finally {
      setSubiendo(false)
    }
  }

  const handleVerDocumento = async () => {
    setAbriendoDocumento(true)
    setError(null)
    try {
      const { url } = await getMiDocumentoUrl()
      window.open(url, "_blank", "noopener,noreferrer")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo abrir el documento")
    } finally {
      setAbriendoDocumento(false)
    }
  }

  const pendienteRevision = tieneDocumento && !verificado && !motivoRechazo

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
      <div className="flex items-center gap-4">
        <div
          className={`p-2.5 rounded-xl bg-secondary ${
            verificado ? "text-emerald-500" : pendienteRevision ? "text-amber-500" : "text-muted-foreground"
          }`}
        >
          {verificado ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            {verificado
              ? "Identidad verificada"
              : pendienteRevision
                ? "Documento en revisión"
                : "Verificación de identidad pendiente"}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {verificado
              ? "Tu cuenta ha superado la verificación de identidad."
              : pendienteRevision
                ? "Nuestro equipo está revisando tu documento. Te avisaremos del resultado."
                : motivoRechazo
                  ? `No se pudo verificar: ${motivoRechazo}. Vuelve a subir el documento.`
                  : "Sube un documento de identidad para dar más confianza a tus clientes."}
          </p>
          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
      </div>

      <div className="flex gap-2 shrink-0">
        {tieneDocumento && (
          <Button variant="outline" size="sm" onClick={handleVerDocumento} disabled={abriendoDocumento}>
            {abriendoDocumento ? <Loader size={16} className="animate-spin mr-2" /> : <Eye size={16} className="mr-2" />}
            Ver mi documento
          </Button>
        )}
        {!verificado && !pendienteRevision && (
          <label>
            <Button asChild size="sm" disabled={subiendo}>
              <span>
                {subiendo ? <Loader size={16} className="animate-spin mr-2" /> : <Upload size={16} className="mr-2" />}
                {motivoRechazo ? "Volver a subir" : "Subir documento"}
              </span>
            </Button>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={handleSeleccionarArchivo}
              disabled={subiendo}
              className="hidden"
            />
          </label>
        )}
      </div>
    </div>
  )
}