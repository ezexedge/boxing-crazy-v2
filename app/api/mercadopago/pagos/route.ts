import api from "@/lib/api"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    console.log("[MercadoPago Webhook] Received webhook:", JSON.stringify(body, null, 2))

    // Handle payment notification
    if (body.type === "payment") {
      const paymentId = body.data.id

      if (!paymentId) {
        console.error("[MercadoPago Webhook] No payment ID in webhook")
        return new Response(null, { status: 200 })
      }

      // Procesar el pago usando la API centralizada
      await api.payment.processWebhook(paymentId)
    }

    // IMPORTANTE: Siempre retornar 200 para confirmar recepción
    return new Response(null, { status: 200 })
  } catch (error) {
    console.error("[MercadoPago Webhook] Error:", error)
    // IMPORTANTE: Incluso en caso de error, retornar 200 para evitar reintentos
    // Los errores deben ser logueados y monitoreados, no rechazados
    return new Response(null, { status: 200 })
  }
}
