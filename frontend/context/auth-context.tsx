"use client"

import React, { createContext, useContext, useState, useCallback, useEffect } from "react"
import { getToken, setToken, clearToken, getMe } from "@/lib/api"
import {
  captureIfConsented,
  identifyIfConsented,
  resetAnalyticsIdentity,
} from "@/lib/analytics"

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
  es_admin?: boolean
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
  es_admin?: boolean
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
    es_admin: u.es_admin ?? false,
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
}

const AuthContext = createContext<AuthContextType | null>(null)

function identifyUser(user: User) {
  // Solo IDs y rol: ni email ni nombre viajan a la analítica.
  identifyIfConsented(user.id, {
    ...(user.role ? { role: user.role } : {}),
    is_admin: user.es_admin ?? false,
  })
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const getStoredRole = (): UserRole => {
    if (typeof window === "undefined") return null
    const stored = localStorage.getItem(ROLE_KEY)
    return stored === "cliente" || stored === "profesional" ? stored : null
  }

  const fetchAndSetUser = useCallback(async () => {
    const usuarioBackend = (await getMe()) as UsuarioBackend
    const mappedUser = mapUsuarioBackend(usuarioBackend, getStoredRole())
    setUser(mappedUser)
    return mappedUser
  }, [])

  useEffect(() => {
    const existingToken = getToken()
    if (!existingToken) {
      setIsLoading(false)
      return
    }
    fetchAndSetUser()
      .then(identifyUser)
      .catch((err) => {
        console.error("No se pudo restaurar la sesión:", err)
        clearToken()
        setUser(null)
      })
      .finally(() => setIsLoading(false))
  }, [fetchAndSetUser])

  const loginWithToken = useCallback(async (token: string) => {
    setToken(token)
    const loggedInUser = await fetchAndSetUser()

    if (user && user.id !== loggedInUser.id) {
      resetAnalyticsIdentity()
    }
    identifyUser(loggedInUser)
    captureIfConsented("login_completed")
  }, [fetchAndSetUser, user])

  const logout = useCallback(() => {
    captureIfConsented("logout_completed")
    resetAnalyticsIdentity()
    clearToken()
    localStorage.removeItem(ROLE_KEY)
    setUser(null)
  }, [])

  const selectRole = useCallback((role: "cliente" | "profesional") => {
    localStorage.setItem(ROLE_KEY, role)
    setUser((prev) => (prev ? { ...prev, role } : null))
    captureIfConsented("role_selected", { role })
  }, [])

  const refreshUser = useCallback(async () => {
    await fetchAndSetUser()
  }, [fetchAndSetUser])

  const updateLocation = useCallback((location: string) => {
    setUser((prev) => (prev ? { ...prev, location } : null))
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
        updateLocation
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