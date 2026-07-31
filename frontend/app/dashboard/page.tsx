"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { useEffect, useState } from "react"
import Navbar from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { reverseGeocode } from "@/lib/geocode"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import GaleriaImagenes from "@/components/galeria-imagenes"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, Pencil, MessageCircle, Star, Eye, Plus, Trash2, AlertCircle, Upload, X, Image as ImageIcon, MapPin, Loader, Navigation, ShieldCheck, ShieldAlert } from "lucide-react"
import {
  getCategorias,
  Categoria,
  crearServicio,
  getMisServicios,
  actualizarServicio,
  eliminarServicio,
  getSignedUploadUrl,
  getMiPerfilProveedor,
  ServicioDetalle,
  ApiError,
  getConversaciones,
  iniciarVerificacionIdentidad,
  getSignedUploadUrlGaleria,
  confirmarImagenServicio,
} from "@/lib/api"
import { subirImagenServicio } from "@/lib/storage"
import { geocodeCiudad, getBrowserLocation } from "@/lib/geocode"
import { loadStripe } from "@stripe/stripe-js"

const PRICE_TYPES = ["fijo", "hora"]

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function DashboardPage() {
  const { isAuthenticated, isLoading, role } = useAuth()
  const router = useRouter()

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [misServicios, setMisServicios] = useState<ServicioDetalle[]>([])
  const [cargandoServicios, setCargandoServicios] = useState(true)
  const [valoracionMedia, setValoracionMedia] = useState<number | null>(null)
  const [mensajesNoLeidos, setMensajesNoLeidos] = useState<number | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [imagenesNuevas, setImagenesNuevas] = useState<{ file: File; preview: string }[]>([])
  const [formCoords, setFormCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [creando, setCreando] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)


  const [editingService, setEditingService] = useState<ServicioDetalle | null>(null)
  const [editForm, setEditForm] = useState({ title: "", categoriaId: "", description: "", price: "", priceType: "hora" })
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editLocation, setEditLocation] = useState("")
  const [editFormCoords, setEditFormCoords] = useState<{ lat: number; lng: number } | null>(null)

  const [errorAcciones, setErrorAcciones] = useState<string | null>(null)

  const [perfilProveedor, setPerfilProveedor] = useState<any>(null)
  const [verificandoIdentidad, setVerificandoIdentidad] = useState(false)
  const [errorVerificacion, setErrorVerificacion] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: "",
    categoriaId: "",
    description: "",
    price: "",
    priceType: "hora",
    location: "",
  })

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) router.replace("/")
    else if (role === "cliente") router.replace("/home")
  }, [isAuthenticated, isLoading, role, router])

  useEffect(() => {
    getCategorias()
      .then((cats) => {
        setCategorias(cats)
        setForm((f) => ({ ...f, categoriaId: f.categoriaId || cats[0]?.id || "" }))
      })
      .catch((err) => console.error("No se pudieron cargar las categorías:", err))

    getMiPerfilProveedor()
      .then((p: any) => {
        setValoracionMedia(parseFloat(p.valoracion_media))
        setPerfilProveedor(p)
      })
      .catch(() => {})
    
    getConversaciones()
      .then((convs) => setMensajesNoLeidos(convs.reduce((acc, c) => acc + c.no_leidos, 0)))
      .catch((err) => console.error("No se pudieron cargar los mensajes sin leer:", err))

    cargarMisServicios()
  }, [])

  const cargarMisServicios = () => {
    setCargandoServicios(true)
    getMisServicios()
      .then(setMisServicios)
      .catch((err) => console.error("No se pudieron cargar tus servicios:", err))
      .finally(() => setCargandoServicios(false))
  }

  const stats = [
    { label: "Servicios activos", value: misServicios.filter((s) => s.activo).length, icon: <Eye size={20} />, color: "text-primary" },
    { label: "Valoración media", value: valoracionMedia != null ? valoracionMedia.toFixed(1) : "—", icon: <Star size={20} />, color: "text-amber-500" },
    { label: "Ingresos este mes", value: "Próximamente", icon: <TrendingUp size={20} />, color: "text-emerald-500" },
    { label: "Mensajes nuevos", value: mensajesNoLeidos != null ? mensajesNoLeidos : "—", icon: <MessageCircle size={20} />, color: "text-accent" },
  ]

  const MAX_IMAGENES_CREAR = 10

  const handleSeleccionarImagenes = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ""
    if (files.length === 0) return

    const espacioDisponible = MAX_IMAGENES_CREAR - imagenesNuevas.length
    const seleccionadas = files.slice(0, espacioDisponible)

    seleccionadas.forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagenesNuevas((prev) => [...prev, { file, preview: reader.result as string }])
      }
      reader.readAsDataURL(file)
    })
  }

  const quitarImagenNueva = (index: number) => {
    setImagenesNuevas((prev) => prev.filter((_, i) => i !== index))
  }

  const clearImage = () => {
    setImagenesNuevas([])
  }

  const resetForm = () => {
    setForm({ title: "", categoriaId: categorias[0]?.id || "", description: "", price: "", priceType: "hora", location: "" })
    setFormCoords(null)
    clearImage()
    setCreateError(null)
  }

  const useMyLocationForForm = async () => {
    const loc = await getBrowserLocation()
    if (loc) {
      setForm((f) => ({ ...f, location: "Ubicación actual" }))
      setFormCoords(loc)  
    } else {
      setCreateError("No se pudo acceder a tu ubicación.")
    }
  }

  const handleCreate = async () => {
    if (!form.title || !form.description || !form.price || !form.categoriaId) return

    setCreando(true)
    setCreateError(null)
    try {
      // 1. Resolver coordenadas: ubicación del navegador ya guardada, o geocodificar el texto
      let coords = formCoords
      if (!coords && form.location.trim()) {
        coords = await geocodeCiudad(form.location.trim())
      }
      if (!coords) {
        setCreateError("Indica una ubicación válida (ciudad) o usa tu ubicación actual.")
        setCreando(false)
        return
      }

      // 2. Crear el servicio
      const nuevo = await crearServicio({
        categoria_id: form.categoriaId,
        titulo: form.title,
        descripcion: form.description,
        precio: parseFloat(form.price),
        tipo_precio: form.priceType,
        latitud: coords.lat,
        longitud: coords.lng,
      })

      let fallosImagenes = 0
      for (const { file } of imagenesNuevas) {
        try {
          const { path, token } = await getSignedUploadUrlGaleria(nuevo.id)
          const publicUrl = await subirImagenServicio(path, token, file)
          if (publicUrl) {
            await confirmarImagenServicio(nuevo.id, publicUrl)
          } else {
            fallosImagenes++
          }
        } catch {
          fallosImagenes++
        }
      }

      resetForm()
      setDialogOpen(false)
      cargarMisServicios()
      if (fallosImagenes > 0) {
        setErrorAcciones(`El servicio se creó, pero ${fallosImagenes} imagen(es) no se pudieron subir. Puedes añadirlas editando el servicio.`)
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "No se pudo publicar el servicio."
      setCreateError(message)
    } finally {
      setCreando(false)
    }
  }

  const openEdit = (servicio: ServicioDetalle) => {
    setEditingService(servicio)
    setEditForm({
      title: servicio.titulo,
      categoriaId: servicio.categoria_id || "",
      description: servicio.descripcion || "",
      price: servicio.precio,
      priceType: servicio.tipo_precio,
    })
    setEditError(null)

     // Precargar ubicación actual (si el servicio tiene coordenadas guardadas)
    setEditFormCoords(null)
    if (servicio.latitud != null && servicio.longitud != null) {
      setEditLocation("Cargando ubicación...")
      reverseGeocode(servicio.latitud, servicio.longitud).then((label) => {
        setEditLocation(label || "Ubicación guardada")
      })
    } else {
      setEditLocation("")
    }
  }

  const closeEdit = () => {
    setEditingService(null)
    setEditError(null)
    setEditLocation("")      
    setEditFormCoords(null) 
  }

  const useMyLocationForEdit = async () => {
    const loc = await getBrowserLocation()
    if (loc) {
      setEditFormCoords(loc)
      setEditLocation("Ubicación actual")
    } else {
      setEditError("No se pudo acceder a tu ubicación.")
    }
  }

  const handleGuardarEdicion = async () => {
    if (!editingService) return
    setGuardandoEdicion(true)
    setEditError(null)
    try {
      let coords = editFormCoords
      if (!coords && editLocation.trim() && editLocation !== "Ubicación guardada") {
        coords = await geocodeCiudad(editLocation.trim())
      }

      await actualizarServicio(editingService.id, {
        categoria_id: editForm.categoriaId,
        titulo: editForm.title,
        descripcion: editForm.description,
        precio: parseFloat(editForm.price),
        tipo_precio: editForm.priceType,
        ...(coords ? { latitud: coords.lat, longitud: coords.lng } : {}),
      })
      closeEdit()
      cargarMisServicios()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "No se pudo guardar el servicio."
      setEditError(message)
    } finally {
      setGuardandoEdicion(false)
    }
  }

  const handleDelete = async (id: string) => {
    setErrorAcciones(null)
    try {
      await eliminarServicio(id)
      setMisServicios((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      setErrorAcciones(err instanceof ApiError ? err.message : "No se pudo eliminar el servicio")
    }
  }

  const handleToggle = async (servicio: ServicioDetalle) => {
    setErrorAcciones(null)
    try {
      const actualizado = await actualizarServicio(servicio.id, { activo: !servicio.activo })
      setMisServicios((prev) => prev.map((s) => (s.id === servicio.id ? actualizado : s)))
    } catch (err) {
      setErrorAcciones(err instanceof ApiError ? err.message : "No se pudo actualizar el servicio")
    }
  }

  const handleVerificarIdentidad = async () => {
    setErrorVerificacion(null)
    setVerificandoIdentidad(true)
    try {
      const { client_secret } = await iniciarVerificacionIdentidad()
      const stripe = await stripePromise
      if (!stripe) {
        setErrorVerificacion("No se pudo cargar Stripe. Inténtalo de nuevo.")
        return
      }
      const { error } = await stripe.verifyIdentity(client_secret)
      if (error) {
        setErrorVerificacion(error.message || "No se pudo completar la verificación")
      } else {
        const perfilActualizado = await getMiPerfilProveedor()
        setPerfilProveedor(perfilActualizado)
      }
    } catch (err) {
      setErrorVerificacion(err instanceof ApiError ? err.message : "No se pudo iniciar la verificación de identidad")
    } finally {
      setVerificandoIdentidad(false)
    }
  }

  const nombreCategoria = (id: string | null) => categorias.find((c) => c.id === id)?.nombre || "General"

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Panel Profesional</h1>
            <p className="text-muted-foreground text-sm mt-1">Gestiona tus servicios y pedidos</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm() }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus size={18} /> Nuevo servicio
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crear nuevo servicio</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Fotos del servicio (opcional)</Label>
                    <span className="text-xs text-muted-foreground">{imagenesNuevas.length}/{MAX_IMAGENES_CREAR}</span>
                  </div>
                  {imagenesNuevas.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      La primera foto será la portada. Podrás reordenarlas después, editando el servicio.
                    </p>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    {imagenesNuevas.map((img, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted group">
                        <img src={img.preview} alt="Preview" className="w-full h-full object-cover" />
                        {index === 0 && (
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-medium">
                            Portada
                          </span>
                        )}
                        <button
                          onClick={() => quitarImagenNueva(index)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          type="button"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}

                    {imagenesNuevas.length < MAX_IMAGENES_CREAR && (
                      <label className="relative aspect-square rounded-lg border-2 border-dashed border-border bg-muted/20 hover:bg-muted/40 flex flex-col items-center justify-center cursor-pointer transition-colors">
                        <Upload size={18} className="text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground mt-1">Añadir</span>
                        <input type="file" accept="image/*" multiple onChange={handleSeleccionarImagenes} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="title">Título del servicio</Label>
                  <Input
                    id="title"
                    placeholder="Ej. Reparación de fugas de agua"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Categoría</Label>
                    <Select value={form.categoriaId} onValueChange={(v) => setForm((f) => ({ ...f, categoriaId: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {categorias.map((c) => <SelectItem key={c.id} value={c.id} className="capitalize">{c.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tipo de precio</Label>
                    <Select value={form.priceType} onValueChange={(v) => setForm((f) => ({ ...f, priceType: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRICE_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="price">Precio (€)</Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="Ej. 50"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="location">Ubicación del servicio</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="location"
                        placeholder="Ej. Madrid, Barcelona..."
                        value={form.location}
                        onChange={(e) => { setForm((f) => ({ ...f, location: e.target.value })); setFormCoords(null) }}
                        className="pl-8"
                      />
                    </div>
                    <Button type="button" variant="outline" size="icon" onClick={useMyLocationForForm} title="Usar mi ubicación actual">
                      <Navigation size={15} />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Dónde prestas este servicio</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="desc">Descripción</Label>
                  <Textarea
                    id="desc"
                    placeholder="Describe tu servicio con detalle..."
                    rows={4}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
                {(!form.title || !form.description || !form.price) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle size={14} /> Completa todos los campos para continuar
                  </div>
                )}
                {createError && <p className="text-sm text-destructive">{createError}</p>}
                <div className="flex gap-3 pt-2">
                  <Button onClick={handleCreate} disabled={!form.title || !form.description || !form.price || creando} className="flex-1 gap-2">
                    {creando && <Loader size={16} className="animate-spin" />}
                    Publicar servicio
                  </Button>
                  <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1" disabled={creando}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={!!editingService} onOpenChange={(o) => !o && closeEdit()}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Editar servicio</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Fotos del servicio</Label>
                  {editingService && (
                    <GaleriaImagenes servicioId={editingService.id} portadaLegado={editingService.imagen_url} />
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-title">Título del servicio</Label>
                  <Input
                    id="edit-title"
                    value={editForm.title}
                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Categoría</Label>
                    <Select value={editForm.categoriaId} onValueChange={(v) => setEditForm((f) => ({ ...f, categoriaId: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {categorias.map((c) => <SelectItem key={c.id} value={c.id} className="capitalize">{c.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tipo de precio</Label>
                    <Select value={editForm.priceType} onValueChange={(v) => setEditForm((f) => ({ ...f, priceType: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRICE_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-price">Precio (€)</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    value={editForm.price}
                    onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-location">Ubicación del servicio</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="edit-location"
                        placeholder="Ej. Madrid, Barcelona..."
                        value={editLocation}
                        onChange={(e) => { setEditLocation(e.target.value); setEditFormCoords(null) }}
                        className="pl-8"
                      />
                    </div>
                    <Button type="button" variant="outline" size="icon" onClick={useMyLocationForEdit} title="Usar mi ubicación actual">
                      <Navigation size={15} />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-desc">Descripción</Label>
                  <Textarea
                    id="edit-desc"
                    rows={4}
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
                {editError && <p className="text-sm text-destructive">{editError}</p>}
                <div className="flex gap-3 pt-2">
                  <Button onClick={handleGuardarEdicion} disabled={guardandoEdicion || !editForm.title} className="flex-1 gap-2">
                    {guardandoEdicion && <Loader size={16} className="animate-spin" />}
                    Guardar cambios
                  </Button>
                  <Button variant="outline" onClick={closeEdit} className="flex-1" disabled={guardandoEdicion}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ label, value, icon, color }) => (
            <Card key={label}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`p-2.5 rounded-xl bg-secondary ${color}`}>{icon}</div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {perfilProveedor && (
          <Card>
            <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl bg-secondary ${perfilProveedor.verificado ? "text-emerald-500" : "text-amber-500"}`}>
                  {perfilProveedor.verificado ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {perfilProveedor.verificado ? "Identidad verificada" : "Verificación de identidad pendiente"}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {perfilProveedor.verificado
                      ? "Tu cuenta ha superado la verificación de identidad."
                      : perfilProveedor.motivo_rechazo
                        ? `No se pudo verificar: ${perfilProveedor.motivo_rechazo}`
                        : "Verifica tu identidad para dar más confianza a tus clientes."}
                  </p>
                  {errorVerificacion && (
                    <p className="text-xs text-destructive mt-1">{errorVerificacion}</p>
                  )}
                </div>
              </div>
              {!perfilProveedor.verificado && (
                <Button onClick={handleVerificarIdentidad} disabled={verificandoIdentidad} className="shrink-0">
                  {verificandoIdentidad ? (
                    <Loader size={16} className="animate-spin mr-2" />
                  ) : (
                    <ShieldCheck size={16} className="mr-2" />
                  )}
                  {perfilProveedor.motivo_rechazo ? "Reintentar verificación" : "Verificar identidad"}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Mis servicios</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {errorAcciones && <p className="text-sm text-destructive">{errorAcciones}</p>}
            {cargandoServicios ? (
              <div className="py-16 flex justify-center">
                <Loader className="animate-spin text-muted-foreground" size={24} />
              </div>
            ) : misServicios.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <ImageIcon size={40} className="mx-auto text-muted-foreground/40" />
                <p className="text-muted-foreground">Aún no tienes servicios publicados.</p>
                <Button onClick={() => setDialogOpen(true)} variant="outline" className="gap-2">
                  <Plus size={16} /> Crear primer servicio
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {misServicios.map((service) => (
                  <div key={service.id} className="flex items-center gap-4 px-6 py-4 hover:bg-secondary/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">{service.titulo}</p>
                        <Badge variant={service.activo ? "default" : "secondary"} className="shrink-0 text-xs">
                          {service.activo ? "Activo" : "Pausado"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span className="capitalize">{nombreCategoria(service.categoria_id)}</span>
                        <span>·</span>
                        <span className="font-medium text-primary">{service.precio}€/{service.tipo_precio}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggle(service)}
                        className="text-muted-foreground hover:text-foreground text-xs"
                      >
                        {service.activo ? "Pausar" : "Activar"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(service.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 size={15} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(service)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Pencil size={15} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}