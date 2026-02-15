"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { XCircle, Loader2 } from "lucide-react"

export function CheckoutFailureClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [verifying, setVerifying] = useState(true)
  const [pedidoId, setPedidoId] = useState<string | null>(null)

  useEffect(() => {
    async function verifyPayment() {
      const paymentId = searchParams.get("payment_id")
      const collectionId = searchParams.get("collection_id")
      const pedidoIdParam = searchParams.get("pedidoId")

      setPedidoId(pedidoIdParam)

      const actualPaymentId = paymentId || collectionId

      if (actualPaymentId || pedidoIdParam) {
        try {
          // Verificar el estado real del pago por si acaso
          const response = await fetch("/api/payment/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paymentId: actualPaymentId,
              pedidoId: pedidoIdParam,
            }),
          })

          const result = await response.json()

          console.log("[Checkout Failure] Verification result:", result)

          if (result.status === "pagado") {
            // El pago fue exitoso, redirigir a success
            router.push(`/checkout/success?pedidoId=${pedidoIdParam}`)
            return
          }
        } catch (err) {
          console.error("[Checkout Failure] Error verifying payment:", err)
        }
      }

      setVerifying(false)
    }

    verifyPayment()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (verifying) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto text-center">
          <Loader2 className="h-16 w-16 text-blue-600 mx-auto mb-4 animate-spin" />
          <h1 className="text-3xl font-bold mb-4">Verificando el estado del pago...</h1>
        </div>
      </main>
    )
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto text-center">
        <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-4">Pago Fallido</h1>
        <p className="text-neutral-600 mb-2">
          Hubo un problema al procesar tu pago. Por favor intenta nuevamente.
        </p>
        {pedidoId && <p className="text-sm text-neutral-500 mb-6">Número de pedido: {pedidoId}</p>}
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
