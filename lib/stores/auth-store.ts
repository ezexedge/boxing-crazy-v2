import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  lastVerified: number
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  setIsLoading: (isLoading: boolean) => void
  setLastVerified: (time: number) => void
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, nombre: string, apellido: string) => Promise<void>
  logout: () => void
  fetchUser: (authToken: string) => Promise<void>
  initialize: () => void
  setupVisibilityListener: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: true,
      lastVerified: 0,

      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setLastVerified: (time) => set({ lastVerified: time }),

      fetchUser: async (authToken: string) => {
        try {
          const response = await fetch('/api/auth/me', {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          })

          if (response.ok) {
            const data = await response.json()
            set({ user: data.user, lastVerified: Date.now() })
          } else if (response.status === 401) {
            // Token is invalid or expired
            console.warn('[Auth] Token invalid or expired, clearing session')
            localStorage.removeItem('token')
            set({ token: null, user: null })
          } else {
            // Server error or other issue - keep token and retry later
            console.error('[Auth] Server error fetching user, status:', response.status)
          }
        } catch (error) {
          // Network error - keep token and retry later
          console.error('[Auth] Network error fetching user:', error)
        } finally {
          set({ isLoading: false })
        }
      },

      login: async (email: string, password: string) => {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Error al iniciar sesión')
        }

        const data = await response.json()
        set({ token: data.token, user: data.user })
        localStorage.setItem('token', data.token)
      },

      register: async (email: string, password: string, nombre: string, apellido: string) => {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, nombre, apellido }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Error al registrar')
        }

        const data = await response.json()
        set({ token: data.token, user: data.user })
        localStorage.setItem('token', data.token)
      },

      logout: () => {
        set({ user: null, token: null })
        localStorage.removeItem('token')
      },

      initialize: () => {
        const storedToken = localStorage.getItem('token')
        if (storedToken) {
          set({ token: storedToken })
          get().fetchUser(storedToken)
        } else {
          set({ isLoading: false })
        }
      },

      setupVisibilityListener: () => {
        const handleVisibilityChange = () => {
          const { token, lastVerified, fetchUser } = get()

          if (document.visibilityState === 'visible' && token) {
            const now = Date.now()
            const fiveMinutes = 5 * 60 * 1000

            // Only verify if it's been more than 5 minutes since last verification
            if (now - lastVerified > fiveMinutes) {
              fetchUser(token)
              set({ lastVerified: now })
            }
          }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
)
