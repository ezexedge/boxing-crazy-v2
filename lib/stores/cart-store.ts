import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem } from '../types'

interface CartState {
  items: CartItem[]
  isInitialized: boolean
  addItem: (item: CartItem) => void
  removeItem: (productoId: string, color?: string, talle?: string) => void
  updateQuantity: (productoId: string, cantidad: number, color?: string, talle?: string) => void
  clearCart: () => void
  checkForPaidOrders: () => Promise<void>
  total: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isInitialized: false,

      addItem: (newItem: CartItem) => {
        set((state) => {
          const existingIndex = state.items.findIndex(
            (item) =>
              item.productoId === newItem.productoId &&
              item.color === newItem.color &&
              item.talle === newItem.talle
          )

          if (existingIndex > -1) {
            const updated = [...state.items]
            updated[existingIndex].cantidad += newItem.cantidad
            return { items: updated }
          }

          return { items: [...state.items, newItem] }
        })
      },

      removeItem: (productoId: string, color?: string, talle?: string) => {
        set((state) => ({
          items: state.items.filter(
            (item) =>
              !(
                item.productoId === productoId &&
                item.color === color &&
                item.talle === talle
              )
          ),
        }))
      },

      updateQuantity: (productoId: string, cantidad: number, color?: string, talle?: string) => {
        if (cantidad <= 0) {
          get().removeItem(productoId, color, talle)
          return
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.productoId === productoId &&
            item.color === color &&
            item.talle === talle
              ? { ...item, cantidad }
              : item
          ),
        }))
      },

      clearCart: () => {
        set({ items: [] })
      },

      checkForPaidOrders: async () => {
        try {
          const token = localStorage.getItem('authToken')
          if (!token) return

          const response = await fetch('/api/pedidos', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })

          if (response.ok) {
            const data = await response.json()
            const pedidos = data.pedidos || []

            // Verificar si hay pedidos pagados en las últimas 24 horas
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
            const recentPaidOrders = pedidos.filter(
              (p: any) =>
                p.estado === 'pagado' && new Date(p.createdAt) > twentyFourHoursAgo
            )

            // Si hay pedidos pagados recientes, limpiar el carrito
            if (recentPaidOrders.length > 0) {
              get().clearCart()
            }
          }
        } catch (error) {
          console.error('Error al verificar pedidos:', error)
        }
      },

      total: () => {
        return get().items.reduce((sum, item) => sum + item.precio * item.cantidad, 0)
      },
    }),
    {
      name: 'cart-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isInitialized = true
        }
      },
    }
  )
)
