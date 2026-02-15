import { NextResponse } from "next/server"
import { getTokenFromRequest, verifyToken } from "@/lib/auth"
import api from "@/lib/api"
import { prisma } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { paymentId, pedidoId } = await request.json()

    console.log("[Payment Verify] Request:", { paymentId, pedidoId })

    if (!paymentId && !pedidoId) {
      return NextResponse.json(
        { error: "paymentId o pedidoId requerido" },
        { status: 400 }
      )
    }

    // Si viene pedidoId, verificar que el usuario sea dueño del pedido
    // (excepto si viene de las back_urls de MercadoPago que no tienen auth)
    const token = getTokenFromRequest(request)
    if (token && pedidoId) {
      const payload = verifyToken(token)
      if (payload) {
        // Verificar que el pedido pertenezca al usuario
        const pedido = await prisma.pedido.findUnique({
          where: { id: pedidoId },
          select: { userId: true },
        })

        if (pedido && pedido.userId !== payload.userId) {
          return NextResponse.json(
            { error: "No autorizado para verificar este pedido" },
            { status: 403 }
          )
        }
      }
    }

    let result
    if (paymentId) {
      // Verificar por payment ID (cuando MercadoPago pasa payment_id en la URL)
      console.log("[Payment Verify] Verifying by paymentId:", paymentId)
      result = await api.payment.processWebhook(paymentId)
    } else if (pedidoId) {
      // Verificar por pedido ID (buscar el payment en MercadoPago)
      console.log("[Payment Verify] Verifying by pedidoId:", pedidoId)
      result = await api.payment.verifyByPedidoId(pedidoId)
    }

    console.log("[Payment Verify] Result:", result)

    return NextResponse.json(result)
  } catch (error) {
    console.error("[Payment Verify] Error:", error)
    const errorMessage = error instanceof Error ? error.message : "Error al verificar pago"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
