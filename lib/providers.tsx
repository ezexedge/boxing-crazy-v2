"use client"

import { useEffect, useState } from 'react'
import { useAuthStore } from './stores/auth-store'
import { useCartStore } from './stores/cart-store'
import { Loader2 } from 'lucide-react'

export function Providers({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize)
  const setupVisibilityListener = useAuthStore((state) => state.setupVisibilityListener)
  const validateAllOrders = useCartStore((state) => state.validateAllOrders)
  const validateCartItems = useCartStore((state) => state.validateCartItems)
  const isValidatingOrders = useCartStore((state) => state.isValidatingOrders)
  const user = useAuthStore((state) => state.user)
  const isLoading = useAuthStore((state) => state.isLoading)
  const [hasValidated, setHasValidated] = useState(false)

  useEffect(() => {
    initialize()
    const cleanup = setupVisibilityListener()
    return cleanup
  }, [initialize, setupVisibilityListener])

  // Validar todos los pedidos y items del carrito cuando el usuario está autenticado
  useEffect(() => {
    if (user && !hasValidated && !isLoading) {
      Promise.all([validateAllOrders(), validateCartItems()]).then(() => {
        setHasValidated(true)
      })
    }
  }, [user, hasValidated, isLoading, validateAllOrders, validateCartItems])

  // Validar items del carrito incluso si no hay usuario
  useEffect(() => {
    if (!user && !isLoading) {
      validateCartItems()
    }
  }, [user, isLoading, validateCartItems])

  // Mostrar spinner mientras se validan los pedidos
  if (user && !hasValidated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
      </div>
    )
  }

  return <>{children}</>
}
