"use client"

import { useEffect } from 'react'
import { useAuthStore } from './stores/auth-store'

export function Providers({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize)
  const setupVisibilityListener = useAuthStore((state) => state.setupVisibilityListener)

  useEffect(() => {
    initialize()
    const cleanup = setupVisibilityListener()
    return cleanup
  }, [initialize, setupVisibilityListener])

  return <>{children}</>
}
