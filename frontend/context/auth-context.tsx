"use client"

import React, { createContext, useContext, useState, useCallback } from "react"
import servicesData from "@/data/services.json"

export type UserRole = "cliente" | "profesional" | null

export interface User {
  id: string
  name: string
  email: string
  avatar: string
  role: UserRole
  bio?: string
  location?: string
  rating?: number
  reviewCount?: number
  joinedAt: string
  googleId?: string
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

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  role: UserRole
  login: (userData?: { name: string; email: string; avatar?: string; googleId?: string }) => void
  loginWithGoogle: (googleUser: any) => void
  logout: () => void
  selectRole: (role: "cliente" | "profesional") => void
  updateLocation: (location: string) => void
  services: Service[]
  addService: (service: Service) => void
  toggleService: (id: string) => void
  deleteService: (id: string) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

const MOCK_USER: Omit<User, "role"> = {
  id: "usr_001",
  name: "María García",
  email: "maria.garcia@gmail.com",
  avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Maria",
  bio: "Profesional versátil con experiencia en múltiples sectores.",
  location: "",
  rating: 4.8,
  reviewCount: 27,
  joinedAt: "Enero 2024",
}

const INITIAL_SERVICES: Service[] = servicesData.map((s) => ({ ...s, active: true }))

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES)

  const login = useCallback((userData?: { name: string; email: string; avatar?: string; googleId?: string }) => {
    if (userData) {
      // Google login
      const newUser: User = {
        id: userData.googleId || `usr_${Date.now()}`,
        name: userData.name,
        email: userData.email,
        avatar: userData.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${userData.name}`,
        role: null,
        location: "",
        rating: 0,
        reviewCount: 0,
        joinedAt: new Date().toLocaleString("es-ES", { month: "long", year: "numeric" }),
        googleId: userData.googleId,
      }
      setUser(newUser)
    } else {
      // Demo login
      setUser({ ...MOCK_USER, role: null })
    }
  }, [])

  const loginWithGoogle = useCallback((googleUser: any) => {
    const profileData = googleUser.profileObj || googleUser
    login({
      name: profileData.name,
      email: profileData.email,
      avatar: profileData.imageUrl,
      googleId: profileData.googleId,
    })
  }, [login])

  const logout = useCallback(() => {
    setUser(null)
  }, [])

  const selectRole = useCallback((role: "cliente" | "profesional") => {
    setUser((prev) => (prev ? { ...prev, role } : null))
  }, [])

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
        role: user?.role ?? null,
        login,
        loginWithGoogle,
        logout,
        selectRole,
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
