"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { useEffect, useState } from "react"
import Navbar from "@/components/navbar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { MapPin, Calendar, Star, Edit, Mail, Briefcase, UserCheck, Loader, Phone } from "lucide-react"
import { getMiPerfilProveedor, getMisServicios, actualizarMe, ApiError, ServicioDetalle, getBloqueados, desbloquearUsuario, UsuarioBloqueado } from "@/lib/api"

function formatFecha(fecha: string | null | undefined) {
  if (!fecha) return "—"
  return new Date(fecha).toLocaleDateString("es-ES", { year: "numeric", month: "long" })
}

export default function ProfilePage() {
  const { isAuthenticated, isLoading, user, role, refreshUser } = useAuth()
  const router = useRouter()

  const [misServicios, setMisServicios] = useState<ServicioDetalle[]>([])
  const [valoracion, setValoracion] = useState<{ media: number; num: number } | null>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState({ nombre: "", telefono: "", ciudad: "" })
  const [guardando, setGuardando] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [bloqueados, setBloqueados] = useState<UsuarioBloqueado[]>([])

  const [errorBloqueados, setErrorBloqueados] = useState<string | null>(null)

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) router.replace("/")
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (user) {
      setForm({ nombre: user.name || "", telefono: user.telefono || "", ciudad: user.location || "" })
    }
  }, [user])

  useEffect(() => {
    if (role !== "profesional") return
    getMisServicios()
      .then(setMisServicios)
      .catch((err) => console.error(err))
    getMiPerfilProveedor()
      .then((p: any) => setValoracion({ media: parseFloat(p.valoracion_media), num: p.num_valoraciones }))
      .catch(() => {})
  }, [role])

  const handleGuardar = async () => {
    setGuardando(true)
    setEditError(null)
    try {
      await actualizarMe({
        nombre: form.nombre,
        telefono: form.telefono || undefined,
        ciudad: form.ciudad || undefined,
      })
      await refreshUser()
      setEditOpen(false)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "No se pudo guardar el perfil."
      setEditError(message)
    } finally {
      setGuardando(false)
    }
  }

  useEffect(() => {
    getBloqueados().then(setBloqueados).catch((err) => console.error(err))
  }, [])

  const handleDesbloquear = async (usuarioId: string) => {
    setErrorBloqueados(null)
    try {
      await desbloquearUsuario(usuarioId)
      setBloqueados((prev) => prev.filter((b) => b.usuario_id !== usuarioId))
    } catch (err) {
      setErrorBloqueados(err instanceof ApiError ? err.message : "No se pudo desbloquear al usuario")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        <Card>
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="relative shrink-0 self-start">
                <Avatar className="h-20 w-20 md:h-24 md:w-24 border-4 border-background shadow-md">
                  <AvatarImage src={user?.avatar} alt={user?.name} />
                  <AvatarFallback className="text-2xl">{user?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                {role === "profesional" && (
                  <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-primary text-primary-foreground">
                    <UserCheck size={12} />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">{user?.name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={role === "profesional" ? "default" : "secondary"} className="text-xs">
                        {role === "profesional" ? (
                          <><Briefcase size={10} className="mr-1" /> Profesional</>
                        ) : (
                          "Cliente"
                        )}
                      </Badge>
                    </div>
                  </div>
                  <Dialog open={editOpen} onOpenChange={setEditOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2 self-start">
                        <Edit size={14} /> Editar perfil
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Editar perfil</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="nombre">Nombre</Label>
                          <Input
                            id="nombre"
                            value={form.nombre}
                            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="telefono">Teléfono</Label>
                          <Input
                            id="telefono"
                            value={form.telefono}
                            onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="ciudad">Ciudad</Label>
                          <Input
                            id="ciudad"
                            value={form.ciudad}
                            onChange={(e) => setForm((f) => ({ ...f, ciudad: e.target.value }))}
                          />
                        </div>
                        {editError && <p className="text-sm text-destructive">{editError}</p>}
                        <div className="flex gap-3 pt-2">
                          <Button onClick={handleGuardar} disabled={guardando || !form.nombre} className="flex-1 gap-2">
                            {guardando && <Loader size={16} className="animate-spin" />}
                            Guardar cambios
                          </Button>
                          <Button variant="outline" onClick={() => setEditOpen(false)} className="flex-1" disabled={guardando}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Mail size={14} />
                    <span>{user?.email}</span>
                  </div>
                  {user?.telefono && (
                    <div className="flex items-center gap-1.5">
                      <Phone size={14} />
                      <span>{user.telefono}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <MapPin size={14} />
                    <span>{user?.location || "Sin ubicación"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    <span>Miembro desde {formatFecha(user?.fechaRegistro)}</span>
                  </div>
                </div>

                {role === "profesional" && valoracion && (
                  <div className="flex flex-wrap gap-6 pt-2">
                    <div className="text-center">
                      <p className="text-xl font-bold text-foreground">{valoracion.media.toFixed(1)}</p>
                      <div className="flex items-center gap-1 justify-center">
                        <Star size={12} className="fill-amber-400 text-amber-400" />
                        <p className="text-xs text-muted-foreground">Valoración</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-foreground">{valoracion.num}</p>
                      <p className="text-xs text-muted-foreground">Opiniones</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-foreground">{misServicios.length}</p>
                      <p className="text-xs text-muted-foreground">Servicios</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {role === "profesional" && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Mis servicios publicados</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border p-0">
              {misServicios.length === 0 ? (
                <p className="px-6 py-8 text-sm text-muted-foreground text-center">Aún no has publicado ningún servicio.</p>
              ) : (
                misServicios.map((service) => (
                  <div key={service.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{service.titulo}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-sm text-muted-foreground">
                        <Badge variant={service.activo ? "default" : "secondary"} className="text-xs">
                          {service.activo ? "Activo" : "Pausado"}
                        </Badge>
                        <span className="text-primary font-medium">{service.precio}€/{service.tipo_precio}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {bloqueados.length > 0 && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Usuarios bloqueados</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border p-0">
              {errorBloqueados && <p className="text-sm text-destructive">{errorBloqueados}</p>}
              {bloqueados.map((b) => (
                <div key={b.id} className="flex items-center gap-4 px-6 py-4">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={b.avatar || undefined} alt={b.nombre} />
                    <AvatarFallback>{b.nombre.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <p className="flex-1 text-sm font-medium text-foreground">{b.nombre}</p>
                  <Button variant="outline" size="sm" onClick={() => handleDesbloquear(b.usuario_id)}>
                    Desbloquear
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Configuración de cuenta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Notificaciones por email", desc: "Recibe alertas de nuevos mensajes" },
              { label: "Privacidad del perfil", desc: "Controla quién puede ver tu información" },
              { label: "Métodos de pago", desc: "Gestiona tus datos de facturación" },
            ].map(({ label, desc }) => (
              <div key={label} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <Button variant="ghost" size="sm" className="text-muted-foreground text-xs" disabled>
                  Próximamente
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}