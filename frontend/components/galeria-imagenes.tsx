"use client"

import { useEffect, useRef, useState } from "react"
import { Loader, Upload, X, GripVertical, ImageIcon } from "lucide-react"
import {
  ImagenServicio,
  getSignedUploadUrlGaleria,
  listarImagenesServicio,
  confirmarImagenServicio,
  eliminarImagenServicio,
  reordenarImagenesServicio,
  ApiError,
} from "@/lib/api"
import { subirImagenServicio } from "@/lib/storage"

const MAX_IMAGENES = 10

export default function GaleriaImagenes({
  servicioId,
  portadaLegado,
}: {
  servicioId: string
  portadaLegado?: string | null
}) {
  const [imagenes, setImagenes] = useState<ImagenServicio[]>([])
  const [cargando, setCargando] = useState(true)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dragIndexRef = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  useEffect(() => {
    setCargando(true)
    listarImagenesServicio(servicioId)
      .then(setImagenes)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar la galería"))
      .finally(() => setCargando(false))
  }, [servicioId])

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = "" // permite volver a seleccionar el mismo archivo si hace falta
    setError(null)
    setSubiendo(true)
    try {
      const { path, token } = await getSignedUploadUrlGaleria(servicioId)
      const publicUrl = await subirImagenServicio(path, token, file)
      if (!publicUrl) {
        setError("No se pudo subir la imagen")
        return
      }
      const nuevaImagen = await confirmarImagenServicio(servicioId, publicUrl)
      setImagenes((prev) => [...prev, nuevaImagen])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo subir la imagen")
    } finally {
      setSubiendo(false)
    }
  }

  const handleEliminar = async (imagenId: string) => {
    setError(null)
    const previas = imagenes
    setImagenes((prev) => prev.filter((img) => img.id !== imagenId)) // actualización optimista
    try {
      await eliminarImagenServicio(servicioId, imagenId)
    } catch (err) {
      setImagenes(previas) // revertimos si el backend rechaza el borrado
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar la imagen")
    }
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragIndexRef.current = index
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", String(index)) // necesario para que Firefox no cancele el drag
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault() // imprescindible para que el navegador permita soltar aquí
    e.dataTransfer.dropEffect = "move"
    if (dragOverIndex !== index) setDragOverIndex(index)
  }

  const handleDrop = async (e: React.DragEvent, index: number) => {
    e.preventDefault()
    const origen = dragIndexRef.current
    dragIndexRef.current = null
    setDragOverIndex(null)
    if (origen === null || origen === index) return

    const previas = imagenes
    const copia = [...imagenes]
    const [movida] = copia.splice(origen, 1)
    copia.splice(index, 0, movida)
    setImagenes(copia) // única actualización de orden, al soltar (no en cada dragover)

    setError(null)
    try {
      const actualizadas = await reordenarImagenesServicio(servicioId, copia.map((img) => img.id))
      setImagenes(actualizadas)
    } catch (err) {
      setImagenes(previas) // revertimos si el backend rechaza el nuevo orden
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el nuevo orden")
    }
  }

  const handleDragEnd = () => {
    dragIndexRef.current = null
    setDragOverIndex(null)
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
        <Loader size={16} className="animate-spin mr-2" />
        Cargando galería...
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Galería de fotos</p>
        <span className="text-xs text-muted-foreground">{imagenes.length}/{MAX_IMAGENES}</span>
      </div>

      {imagenes.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Arrastra una foto a la primera posición para que sea la portada.
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {imagenes.map((img, index) => (
          <div
            key={img.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`relative aspect-square rounded-lg overflow-hidden border-2 bg-muted group cursor-grab active:cursor-grabbing transition-colors ${
              dragOverIndex === index ? "border-primary" : "border-border"
            }`}
          >
            <img src={img.url} alt="" className="w-full h-full object-cover pointer-events-none" />
            {index === 0 && (
              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-medium">
                Portada
              </span>
            )}
            <button
              type="button"
              onClick={() => handleEliminar(img.id)}
              className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={12} />
            </button>
            <div className="absolute top-1 left-1 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <GripVertical size={14} />
            </div>
          </div>
        ))}

        {imagenes.length < MAX_IMAGENES && (
          <label className="relative aspect-square rounded-lg border-2 border-dashed border-border bg-muted/20 hover:bg-muted/40 flex flex-col items-center justify-center cursor-pointer transition-colors">
            {subiendo ? (
              <Loader size={20} className="animate-spin text-muted-foreground" />
            ) : (
              <>
                <Upload size={18} className="text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground mt-1">Añadir</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelected}
              disabled={subiendo}
              className="hidden"
            />
          </label>
        )}
      </div>

      {imagenes.length === 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-3">
          {portadaLegado ? (
            <>
              <img src={portadaLegado} alt="" className="w-12 h-12 rounded-md object-cover shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Esta es tu portada actual. Añade fotos a la galería y arrástralas para elegir una nueva portada.
              </p>
            </>
          ) : (
            <>
              <ImageIcon size={16} className="text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground">Todavía no has subido fotos a la galería.</p>
            </>
          )}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}