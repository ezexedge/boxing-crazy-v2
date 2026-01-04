"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { User } from "./types"

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, nombre: string, apellido: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastVerified, setLastVerified] = useState<number>(0)

  useEffect(() => {
    // Load token from localStorage on mount
    const storedToken = localStorage.getItem("token")
    if (storedToken) {
      setToken(storedToken)
      fetchUser(storedToken)
    } else {
      setIsLoading(false)
    }
  }, [])

  // Verify token is still valid when user interacts with the page
  useEffect(() => {
    if (!token) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && token) {
        const now = Date.now()
        const fiveMinutes = 5 * 60 * 1000

        // Only verify if it's been more than 5 minutes since last verification
        if (now - lastVerified > fiveMinutes) {
          fetchUser(token)
          setLastVerified(now)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [token, lastVerified])

  const fetchUser = async (authToken: string) => {
    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setLastVerified(Date.now())
      } else if (response.status === 401) {
        // Token is invalid or expired
        console.warn("[Auth] Token invalid or expired, clearing session")
        localStorage.removeItem("token")
        setToken(null)
        setUser(null)
      } else {
        // Server error or other issue - keep token and retry later
        console.error("[Auth] Server error fetching user, status:", response.status)
        // Don't clear token on server errors
      }
    } catch (error) {
      // Network error - keep token and retry later
      console.error("[Auth] Network error fetching user:", error)
      // Don't clear token on network errors
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || "Error al iniciar sesión")
    }

    const data = await response.json()
    setToken(data.token)
    setUser(data.user)
    localStorage.setItem("token", data.token)
  }

  const register = async (email: string, password: string, nombre: string, apellido: string) => {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, nombre, apellido }),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || "Error al registrar")
    }

    const data = await response.json()
    setToken(data.token)
    setUser(data.user)
    localStorage.setItem("token", data.token)
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem("token")
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
