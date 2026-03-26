"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { useEffect } from "react"
import Navbar from "@/components/navbar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Calendar, Star, Edit, Mail, Briefcase, UserCheck } from "lucide-react"
import servicesData from "@/data/services.json"

export default function ProfilePage() {
  const { isAuthenticated, user, role } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) router.replace("/")
  }, [isAuthenticated, router])

  const myServices = servicesData.filter((s) => s.professional.id === "pro_001" || s.professional.id === "pro_004").slice(0, 3)

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Profile header card */}
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
                  <Button variant="outline" size="sm" className="gap-2 self-start">
                    <Edit size={14} /> Editar perfil
                  </Button>
                </div>

                {/* Info pills */}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Mail size={14} />
                    <span>{user?.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin size={14} />
                    <span>{user?.location ?? "Madrid, España"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    <span>Miembro desde {user?.joinedAt}</span>
                  </div>
                </div>

                {/* Bio */}
                <p className="text-muted-foreground leading-relaxed text-sm">
                  {user?.bio ?? "Profesional versátil con experiencia en múltiples sectores."}
                </p>

                {/* Stats */}
                {role === "profesional" && (
                  <div className="flex flex-wrap gap-6 pt-2">
                    <div className="text-center">
                      <p className="text-xl font-bold text-foreground">4.9</p>
                      <div className="flex items-center gap-1 justify-center">
                        <Star size={12} className="fill-amber-400 text-amber-400" />
                        <p className="text-xs text-muted-foreground">Valoración</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-foreground">27</p>
                      <p className="text-xs text-muted-foreground">Opiniones</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-foreground">2</p>
                      <p className="text-xs text-muted-foreground">Servicios</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-foreground">98%</p>
                      <p className="text-xs text-muted-foreground">Respuesta</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services section (professional only) */}
        {role === "profesional" && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Mis servicios publicados</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border p-0">
              {myServices.map((service) => (
                <div key={service.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{service.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-sm text-muted-foreground">
                      <span>{service.category}</span>
                      <span>·</span>
                      <span className="text-primary font-medium">{service.price}€/{service.priceType}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <Star size={13} className="fill-amber-400 text-amber-400" />
                    <span className="font-medium text-foreground">{service.rating}</span>
                    <span className="text-muted-foreground">({service.reviewCount})</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Settings card */}
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
                <Button variant="ghost" size="sm" className="text-primary text-xs">
                  Gestionar
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
