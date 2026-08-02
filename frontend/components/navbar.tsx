"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Bell, MessageCircle, LogOut, User, ChevronDown, Briefcase, Shield, Heart } from "lucide-react"
import { getConversaciones } from "@/lib/api"

const POLL_INTERVAL = 15000 // mismo intervalo que la lista de chats, en ms

export default function Navbar() {
  const { user, role, logout, selectRole, isAuthenticated } = useAuth()
  const router = useRouter()
  const [noLeidos, setNoLeidos] = useState(0)

  const cargarNoLeidos = useCallback(() => {
    if (!isAuthenticated) return
    getConversaciones()
      .then((convs) => setNoLeidos(convs.reduce((acc, c) => acc + c.no_leidos, 0)))
      .catch((err) => console.error("No se pudieron cargar los mensajes sin leer:", err))
  }, [isAuthenticated])

  useEffect(() => {
    cargarNoLeidos()
    const interval = setInterval(cargarNoLeidos, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [cargarNoLeidos])

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const handleRoleSwitch = () => {
    const newRole = role === "cliente" ? "profesional" : "cliente"
    selectRole(newRole)
    router.push(newRole === "cliente" ? "/home" : "/dashboard")
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-card/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href={role === "profesional" ? "/dashboard" : "/home"} className="text-xl font-bold text-primary tracking-tight shrink-0">
          ServiMarket
        </Link>

        {/* Role badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          {role === "profesional" ? "Modo Profesional" : "Modo Cliente"}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 ml-auto">
          <Link href="/chats">
            <Button variant="ghost" size="icon" className="relative">
              <MessageCircle size={20} />
              {noLeidos > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center leading-none">
                  {noLeidos > 9 ? "9+" : noLeidos}
                </span>
              )}
              <span className="sr-only">Mensajes{noLeidos > 0 ? ` (${noLeidos} sin leer)` : ""}</span>
            </Button>
          </Link>
          <Button variant="ghost" size="icon">
            <Bell size={20} />
            <span className="sr-only">Notificaciones</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 pl-2 pr-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar} alt={user?.name} />
                  <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="hidden md:inline text-sm font-medium">{user?.name?.split(" ")[0]}</span>
                <ChevronDown size={14} className="text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                  <User size={15} /> Mi perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/favoritos" className="flex items-center gap-2 cursor-pointer">
                  <Heart size={15} /> Favoritos
                </Link>
              </DropdownMenuItem>
              {user?.es_admin && (
                <DropdownMenuItem asChild>
                  <Link href="/admin/reportes" className="flex items-center gap-2 cursor-pointer">
                    <Shield size={15} /> Panel de administración
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleRoleSwitch} className="flex items-center gap-2 cursor-pointer">
                <Briefcase size={15} />
                Cambiar a {role === "cliente" ? "Profesional" : "Cliente"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive flex items-center gap-2 cursor-pointer">
                <LogOut size={15} /> Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}