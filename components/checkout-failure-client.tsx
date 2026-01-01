"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { XCircle } from "lucide-react"

export function CheckoutFailureClient() {
  const router = useRouter()

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto text-center">
        <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-4">Pago Fallido</h1>
        <p className="text-neutral-600 mb-6">Hubo un problema al procesar tu pago. Por favor intenta nuevamente.</p>
        <div className="space-y-2">
          <Button className="w-full" onClick={() => router.push("/carrito")}>
            Volver al Carrito
          </Button>
          <Button variant="outline" className="w-full bg-transparent" onClick={() => router.push("/")}>
            Volver a la Tienda
          </Button>
        </div>
      </div>
    </main>
  )
}
