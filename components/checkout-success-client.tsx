"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle, Loader2, AlertCircle } from "lucide-react"
import { useCartStore } from "@/lib/stores/cart-store"

interface CheckoutSuccessClientProps {
  pedidoId: string | null
}

export function CheckoutSuccessClient({ pedidoId }: CheckoutSuccessClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clearCart = useCartStore((state) => state.clearCart)

  const [verifying, setVerifying] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null)

  useEffect(() => {
    let retryCount = 0
    const MAX_RETRIES = 1

    async function verifyPayment() {
      // Obtener paymentId de los query params (MercadoPago lo envía)
      const paymentId = searchParams.get("payment_id")
      const collectionId = searchParams.get("collection_id")
      const actualPaymentId = paymentId || collectionId

      console.log("[Checkout Success] Verifying payment:", {
        pedidoId,
        paymentId: actualPaymentId,
        retryCount,
      })

      // Validación: debe haber al menos uno de los dos
      if (!actualPaymentId && !pedidoId) {
        setError(
          "No se pudo obtener la información del pago. Si completaste el pago, verifica en 'Mis Pedidos'."
        )
        setVerifying(false)
        return
      }

      try {
        const response = await fetch("/api/payment/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentId: actualPaymentId,
            pedidoId: pedidoId,
          }),
        })

        const result = await response.json()

        console.log("[Checkout Success] Verification result:", result)

        if (response.ok) {
          setPaymentStatus(result.status)

          if (result.status === "pagado" || result.alreadyProcessed) {
            // Pago confirmado - limpiar carrito
            clearCart()
            setVerifying(false)
          } else if (result.verified === false && retryCount < MAX_RETRIES) {
            // No se encontró el pago aún, reintentar una vez
            retryCount++
            console.log("[Checkout Success] Payment not found, retrying in 2s...")
            setTimeout(() => verifyPayment(), 2000)
          } else {
            // No se encontró después de reintentar
            if (result.verified === false) {
              setError(
                "No se pudo encontrar el pago en MercadoPago. Si completaste el pago, podrás verificarlo desde 'Mis Pedidos'."
              )
            }
            setVerifying(false)
          }
        } else {
          setError(result.error || "Error al verificar el pago")
          setVerifying(false)
        }
      } catch (err) {
        console.error("[Checkout Success] Error verifying payment:", err)
        setError(
          "Error de conexión al verificar el pago. Si completaste el pago, verifica en 'Mis Pedidos'."
        )
        setVerifying(false)
      }
    }

    verifyPayment()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (verifying) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto text-center">
          <Loader2 className="h-16 w-16 text-blue-600 mx-auto mb-4 animate-spin" />
          <h1 className="text-3xl font-bold mb-4">Verificando tu pago...</h1>
          <p className="text-neutral-600 mb-6">
            Estamos confirmando tu pago y actualizando el stock. Esto solo tomará unos segundos.
          </p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto text-center">
          <AlertCircle className="h-16 w-16 text-orange-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-4">Problema al verificar el pago</h1>
          <p className="text-neutral-600 mb-2">{error}</p>
          {pedidoId && (
            <>
              <p className="text-sm text-neutral-500 mb-6">Número de pedido: {pedidoId}</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-blue-800 font-medium mb-2">¿Qué hacer ahora?</p>
                <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                  <li>Revisa tu email de confirmación de MercadoPago</li>
                  <li>Ve a "Mis Pedidos" y haz clic en "Verificar si ya pagué"</li>
                  <li>Si el problema persiste, contacta a soporte</li>
                </ul>
              </div>
            </>
          )}
          <div className="space-y-2">
            <Button className="w-full" onClick={() => router.push("/mis-pedidos")}>
              Ver Mis Pedidos
            </Button>
            <Button variant="outline" className="w-full bg-transparent" onClick={() => router.push("/")}>
              Volver a la Tienda
            </Button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto text-center">
        <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-4">¡Pago Exitoso!</h1>
        <p className="text-neutral-600 mb-2">
          Tu pedido ha sido procesado correctamente y el stock ha sido actualizado.
        </p>
        {pedidoId && <p className="text-sm text-neutral-500 mb-6">Número de pedido: {pedidoId}</p>}
        <div className="space-y-2">
          <Button className="w-full" onClick={() => router.push("/")}>
            Volver a la Tienda
          </Button>
        </div>
      </div>
    </main>
  )
}
