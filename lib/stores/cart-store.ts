import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem } from '../types'

interface CartState {
  items: CartItem[]
  isInitialized: boolean
  isValidatingOrders: boolean
  invalidItems: Array<CartItem & { reason: string; message: string }>
  addItem: (item: CartItem) => void
  removeItem: (productoId: string, color?: string, talle?: string) => void
  updateQuantity: (productoId: string, cantidad: number, color?: string, talle?: string) => void
  clearCart: () => void
  checkForPaidOrders: () => Promise<void>
  validateAllOrders: () => Promise<void>
  validateCartItems: () => Promise<void>
  total: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isInitialized: false,
      isValidatingOrders: false,
      invalidItems: [],

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
          const token = localStorage.getItem('token')
          if (!token) return

          const cartItems = get().items
          if (cartItems.length === 0) return

          const response = await fetch('/api/pedidos', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })

          if (response.ok) {
            const data = await response.json()
            const pedidos = data.pedidos || []

            // Buscar si algún item del carrito está en algún pedido (no solo pagados)
            const itemsToRemove: Array<{ productoId: string; color?: string; talle?: string }> = []

            cartItems.forEach((cartItem) => {
              const existsInOrder = pedidos.some((pedido: any) =>
                pedido.PedidoItem?.some(
                  (item: any) =>
                    item.productoId === cartItem.productoId &&
                    item.color === cartItem.color &&
                    item.talle === cartItem.talle
                )
              )

              if (existsInOrder) {
                itemsToRemove.push({
                  productoId: cartItem.productoId,
                  color: cartItem.color,
                  talle: cartItem.talle,
                })
              }
            })

            // Eliminar los items que ya están en pedidos
            itemsToRemove.forEach((item) => {
              get().removeItem(item.productoId, item.color, item.talle)
            })

            if (itemsToRemove.length > 0) {
              console.log(`[Cart] Removed ${itemsToRemove.length} items that are already in orders`)
            }
          }
        } catch (error) {
          console.error('Error al verificar pedidos:', error)
        }
      },

      validateAllOrders: async () => {
        try {
          set({ isValidatingOrders: true })

          const token = localStorage.getItem('token')
          if (!token) {
            set({ isValidatingOrders: false })
            return
          }

          // Obtener todos los pedidos del usuario
          const response = await fetch('/api/pedidos', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })

          if (!response.ok) {
            set({ isValidatingOrders: false })
            return
          }

          const data = await response.json()
          const pedidos = data.pedidos || []

          // Filtrar pedidos pendientes
          const pedidosPendientes = pedidos.filter((p: any) => p.estado === 'pendiente')

          console.log(`[Cart] Validando ${pedidosPendientes.length} pedidos pendientes...`)

          // Verificar cada pedido pendiente
          for (const pedido of pedidosPendientes) {
            try {
              console.log(`[Cart] Verificando pedido ${pedido.id}...`)

              const verifyResponse = await fetch('/api/payment/verify', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ pedidoId: pedido.id }),
              })

              if (verifyResponse.ok) {
                const result = await verifyResponse.json()
                console.log(`[Cart] Estado del pedido ${pedido.id}: ${result.status}`)
              }
            } catch (error) {
              console.error(`[Cart] Error al verificar pedido ${pedido.id}:`, error)
            }
          }

          // Limpiar carrito después de validar
          await get().checkForPaidOrders()

          console.log('[Cart] Validación de pedidos completada')
        } catch (error) {
          console.error('[Cart] Error al validar pedidos:', error)
        } finally {
          set({ isValidatingOrders: false })
        }
      },

      validateCartItems: async () => {
        try {
          const cartItems = get().items
          if (cartItems.length === 0) {
            set({ invalidItems: [] })
            return
          }

          console.log('[Cart] Validando items del carrito...')

          const response = await fetch('/api/cart/validate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ items: cartItems }),
          })

          if (!response.ok) {
            console.error('[Cart] Error al validar items')
            return
          }

          const { validItems, invalidItems } = await response.json()

          // Actualizar items inválidos para mostrar al usuario
          set({ invalidItems })

          // Remover items inválidos del carrito
          if (invalidItems.length > 0) {
            console.log(`[Cart] Removiendo ${invalidItems.length} items inválidos...`)

            invalidItems.forEach((item: any) => {
              get().removeItem(item.productoId, item.color, item.talle)
            })
          }

          // Actualizar precios de items válidos si cambiaron
          validItems.forEach((validItem: any) => {
            const currentItem = get().items.find(
              (item) =>
                item.productoId === validItem.productoId &&
                item.color === validItem.color &&
                item.talle === validItem.talle
            )

            if (currentItem && currentItem.precio !== validItem.precio) {
              console.log(
                `[Cart] Actualizando precio de ${validItem.nombre}: ${currentItem.precio} -> ${validItem.precio}`
              )
              set((state) => ({
                items: state.items.map((item) =>
                  item.productoId === validItem.productoId &&
                  item.color === validItem.color &&
                  item.talle === validItem.talle
                    ? { ...item, precio: validItem.precio }
                    : item
                ),
              }))
            }
          })

          console.log('[Cart] Validación de items completada')
        } catch (error) {
          console.error('[Cart] Error al validar items del carrito:', error)
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
