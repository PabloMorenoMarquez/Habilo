"use client"

import React, { createContext, useContext, useState, useCallback, useEffect } from "react"
import servicesData from "@/data/services.json"
import { getToken, setToken, clearToken, getMe } from "@/lib/api"

export type UserRole = "cliente" | "profesional" | null
const ROLE_KEY = "serviclick_role"

// Forma del usuario tal y como lo devuelve el backend (UsuarioOut)
interface UsuarioBackend {
  id: string
  email: string
  nombre: string
  foto_url: string | null
  telefono: string | null
  telefono_verificado: boolean | null
  ciudad: string | null
  fecha_registro: string | null
}

// Forma que usa el resto del frontend
export interface User {
  id: string
  name: string
  email: string
  avatar: string
  role: UserRole
  location?: string
  telefono?: string | null
  fechaRegistro?: string | null
}

export interface Service {
  id: string
  title: string
  category: string
  description: string
  price: number
  priceType: string
  rating: number
  reviewCount: number
  deliveryDays: number | null
  image: string
  active: boolean
  professional: {
    id: string
    name: string
    avatar: string
    location: string
  }
  tags: string[]
  featured: boolean
}

function mapUsuarioBackend(u: UsuarioBackend, role: UserRole): User {
  return {
    id: u.id,
    name: u.nombre,
    email: u.email,
    avatar: u.foto_url || `https://api.dicebear.com/9.x/avataaars/svg?seed=${u.nombre}`,
    location: u.ciudad ?? "",
    telefono: u.telefono,
    fechaRegistro: u.fecha_registro,
    role,
  }
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  role: UserRole
  loginWithToken: (token: string) => Promise<void>
  logout: () => void
  selectRole: (role: "cliente" | "profesional") => void
  refreshUser: () => Promise<void>
  updateLocation: (location: string) => void
  services: Service[]
  addService: (service: Service) => void
  toggleService: (id: string) => void
  deleteService: (id: string) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

const INITIAL_SERVICES: Service[] = servicesData.map((s) => ({ ...s, active: true }))

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES)

  const getStoredRole = (): UserRole => {
    if (typeof window === "undefined") return null
    const stored = localStorage.getItem(ROLE_KEY)
    return stored === "cliente" || stored === "profesional" ? stored : null
  }

  const fetchAndSetUser = useCallback(async () => {
    const usuarioBackend = (await getMe()) as UsuarioBackend
    setUser(mapUsuarioBackend(usuarioBackend, getStoredRole()))
  }, [])

  useEffect(() => {
    const existingToken = getToken()
    if (!existingToken) {
      setIsLoading(false)
      return
    }
    fetchAndSetUser()
      .catch((err) => {
        console.error("No se pudo restaurar la sesión:", err)
        clearToken()
        setUser(null)
      })
      .finally(() => setIsLoading(false))
  }, [fetchAndSetUser])

  const loginWithToken = useCallback(async (token: string) => {
    setToken(token)
    await fetchAndSetUser()
  }, [fetchAndSetUser])

  const logout = useCallback(() => {
    clearToken()
    localStorage.removeItem(ROLE_KEY)
    setUser(null)
  }, [])

  const selectRole = useCallback((role: "cliente" | "profesional") => {
    localStorage.setItem(ROLE_KEY, role)
    setUser((prev) => (prev ? { ...prev, role } : null))
  }, [])

  const refreshUser = useCallback(async () => {
    await fetchAndSetUser()
  }, [fetchAndSetUser])

  const updateLocation = useCallback((location: string) => {
    setUser((prev) => (prev ? { ...prev, location } : null))
  }, [])

  const addService = useCallback((service: Service) => {
    setServices((prev) => [service, ...prev])
  }, [])

  const toggleService = useCallback((id: string) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s)))
  }, [])

  const deleteService = useCallback((id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id))
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        role: user?.role ?? null,
        loginWithToken,
        logout,
        selectRole,
        refreshUser,
        updateLocation,
        services,
        addService,
        toggleService,
        deleteService,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}