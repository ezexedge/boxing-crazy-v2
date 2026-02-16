"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Clock, Loader2 } from "lucide-react"

export default function CheckoutPendingPage() {
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
          // Verificar el estado del pago
          const response = await fetch("/api/payment/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paymentId: actualPaymentId,
              pedidoId: pedidoIdParam,
            }),
          })

          const result = await response.json()

          console.log("[Checkout Pending] Verification result:", result)

          if (result.status === "pagado") {
            // El pago fue aprobado, redirigir a success
            router.push(`/checkout/success?pedidoId=${pedidoIdParam}`)
            return
          } else if (result.status === "fallido") {
            // El pago falló, redirigir a failure
            router.push(`/checkout/failure?pedidoId=${pedidoIdParam}`)
            return
          }
        } catch (err) {
          console.error("[Checkout Pending] Error verifying payment:", err)
        }
      }

      setVerifying(false)
    }

    verifyPayment()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (verifying) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto text-center">
            <Loader2 className="h-16 w-16 text-black mx-auto mb-4 animate-spin" />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto text-center">
          <Clock className="h-16 w-16 text-yellow-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-4">Pago Pendiente</h1>
          <p className="text-neutral-600 mb-2">
            Tu pago está siendo procesado. Te notificaremos cuando se complete.
          </p>
          {pedidoId && <p className="text-sm text-neutral-500 mb-6">Número de pedido: {pedidoId}</p>}
          <Button className="w-full" onClick={() => router.push("/")}>
            Volver a la Tienda
          </Button>
        </div>
      </main>
    </div>
  )
}
