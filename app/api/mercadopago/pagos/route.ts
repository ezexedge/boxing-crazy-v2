import api from "@/lib/api"

// Deshabilitar la verificación de CSRF para webhooks externos
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

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
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })
  } catch (error) {
    console.error("[MercadoPago Webhook] Error:", error)
    // IMPORTANTE: Incluso en caso de error, retornar 200 para evitar reintentos
    // Los errores deben ser logueados y monitoreados, no rechazados
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })
  }
}

// Manejar OPTIONS para CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })
}
