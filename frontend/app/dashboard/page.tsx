"use client"

import { useRouter } from "next/navigation"
import { useAuth, type Service } from "@/context/auth-context"
import { useEffect, useState } from "react"
import Navbar from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, MessageCircle, Star, Eye, Plus, Pencil, Trash2, AlertCircle, Upload, X, Image as ImageIcon, MapPin } from "lucide-react"

const CATEGORIES = ["Diseño", "Educación", "Tecnología", "Hogar", "Fotografía", "Deporte", "Traducción", "Finanzas"]
const PRICE_TYPES = ["fijo", "hora", "mes", "sesión", "evento", "palabra"]

export default function DashboardPage() {
  const { isAuthenticated, role, user, services, addService, toggleService, deleteService } = useAuth()
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: "",
    category: CATEGORIES[0],
    description: "",
    price: "",
    priceType: "hora",
    image: "",
    location: "",
  })

  useEffect(() => {
    if (!isAuthenticated) router.replace("/")
    else if (role === "cliente") router.replace("/home")
  }, [isAuthenticated, role, router])

  const myServices = services.filter(
    (s) => s.professional.id === user?.id || s.professional.name === user?.name
  )

  const stats = [
    { label: "Servicios activos", value: myServices.filter((s) => s.active).length, icon: <Eye size={20} />, color: "text-primary" },
    { label: "Valoración media", value: "4.9", icon: <Star size={20} />, color: "text-amber-500" },
    { label: "Mensajes nuevos", value: "3", icon: <MessageCircle size={20} />, color: "text-accent" },
    { label: "Ingresos este mes", value: "480€", icon: <TrendingUp size={20} />, color: "text-emerald-500" },
  ]

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      setImagePreview(result)
      setForm((f) => ({ ...f, image: result }))
    }
    reader.readAsDataURL(file)
  }

  const clearImage = () => {
    setImagePreview(null)
    setForm((f) => ({ ...f, image: "" }))
  }

  const handleCreate = () => {
    if (!form.title || !form.description || !form.price || !user) return

    const newService: Service = {
      id: `svc_${Date.now()}`,
      title: form.title,
      category: form.category,
      description: form.description,
      price: parseFloat(form.price),
      priceType: form.priceType,
      rating: 0,
      reviewCount: 0,
      active: true,
      image: form.image || "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&q=80",
      deliveryDays: null,
      professional: {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        location: form.location || user.location || "España",
      },
      tags: [],
      featured: false,
    }

    addService(newService)
    setForm({ title: "", category: CATEGORIES[0], description: "", price: "", priceType: "hora", image: "", location: "" })
    setImagePreview(null)
    setDialogOpen(false)
  }

  const handleDelete = (id: string) => {
    deleteService(id)
  }

  const handleToggle = (id: string) => {
    toggleService(id)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Panel Profesional</h1>
            <p className="text-muted-foreground text-sm mt-1">Gestiona tus servicios y pedidos</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                {/* Image upload */}
                <div className="space-y-2">
                  <Label>Imagen del servicio</Label>
                  {imagePreview ? (
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-border bg-muted group">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        onClick={clearImage}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        type="button"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center aspect-video rounded-xl border-2 border-dashed border-border bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors group">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                        <Upload size={32} />
                        <p className="text-sm font-medium">Sube una imagen</p>
                        <p className="text-xs">JPG, PNG o WEBP (máx. 5MB)</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="title">Título del servicio</Label>
                  <Input
                    id="title"
                    placeholder="Ej. Diseño de logo profesional"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Categoría</Label>
                    <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
                  <Label htmlFor="location">Ubicación / Sede</Label>
                  <div className="relative">
                    <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="location"
                      placeholder="Ej. Madrid, Barcelona, Valencia..."
                      value={form.location}
                      onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                      className="pl-8"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Ciudad o zona donde prestas el servicio</p>
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
                <div className="flex gap-3 pt-2">
                  <Button onClick={handleCreate} disabled={!form.title || !form.description || !form.price} className="flex-1">
                    Publicar servicio
                  </Button>
                  <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
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

        {/* Services table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Mis servicios</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {myServices.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <ImageIcon size={40} className="mx-auto text-muted-foreground/40" />
                <p className="text-muted-foreground">Aún no tienes servicios publicados.</p>
                <Button onClick={() => setDialogOpen(true)} variant="outline" className="gap-2">
                  <Plus size={16} /> Crear primer servicio
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {myServices.map((service) => (
                  <div key={service.id} className="flex items-center gap-4 px-6 py-4 hover:bg-secondary/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">{service.title}</p>
                        <Badge variant={service.active ? "default" : "secondary"} className="shrink-0 text-xs">
                          {service.active ? "Activo" : "Pausado"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span>{service.category}</span>
                        <span>·</span>
                        <span className="font-medium text-primary">{service.price}€/{service.priceType}</span>
                        {service.professional.location && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <MapPin size={11} />
                              {service.professional.location}
                            </span>
                          </>
                        )}
                        {service.reviewCount > 0 && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Star size={12} className="fill-amber-400 text-amber-400" />
                              {service.rating} ({service.reviewCount})
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggle(service.id)}
                        className="text-muted-foreground hover:text-foreground text-xs"
                      >
                        {service.active ? "Pausar" : "Activar"}
                      </Button>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                        <Pencil size={15} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(service.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 size={15} />
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
