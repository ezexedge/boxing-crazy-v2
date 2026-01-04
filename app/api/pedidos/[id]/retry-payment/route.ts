import { NextResponse } from "next/server"
import { getTokenFromRequest, verifyToken } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { mercadopago } from "@/lib/api"
import { Preference } from "mercadopago"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Verify authentication
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { id: pedidoId } = await params

    // Obtener el pedido
    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: {
        PedidoItem: {
          include: {
            Producto: true,
          },
        },
      },
    })

    if (!pedido) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 })
    }

    // Verificar que el pedido pertenece al usuario
    if (pedido.userId !== payload.userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    // Solo permitir reintentar pago si el pedido está pendiente, fallido o cancelado
    if (!["pendiente", "fallido", "cancelado"].includes(pedido.estado)) {
      return NextResponse.json(
        { error: "Este pedido no puede ser pagado nuevamente" },
        { status: 400 }
      )
    }

    // Verificar stock antes de crear nueva preferencia
    for (const item of pedido.PedidoItem) {
      if (item.color && item.talle) {
        const variante = await prisma.variante.findFirst({
          where: {
            productoId: item.productoId,
            color: item.color,
            talle: item.talle,
          },
        })

        if (!variante || variante.stock < item.cantidad) {
          return NextResponse.json(
            {
              error: `Stock insuficiente para ${item.Producto.nombre} (${item.color}, ${item.talle})`,
            },
            { status: 400 }
          )
        }
      }
    }

    // Crear nueva preferencia en MercadoPago
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    if (!baseUrl) {
      throw new Error("NEXT_PUBLIC_BASE_URL no configurada")
    }
    const isProduction = baseUrl.startsWith("https://")

    const preferenceData: any = {
      items: pedido.PedidoItem.map((item) => ({
        id: String(item.productoId),
        title: item.Producto.nombre,
        quantity: Number(item.cantidad),
        unit_price: Number(item.precio),
        currency_id: "ARS",
      })),
      payer: {
        name: pedido.firstName,
        surname: pedido.lastName,
        email: pedido.email,
      },
      back_urls: {
        success: `${baseUrl}/checkout/success?pedidoId=${pedido.id}`,
        failure: `${baseUrl}/checkout/failure?pedidoId=${pedido.id}`,
        pending: `${baseUrl}/checkout/pending?pedidoId=${pedido.id}`,
      },
      metadata: {
        pedidoId: pedido.id,
      },
    }

    // Solo agregar notification_url en producción
    if (isProduction) {
      preferenceData.notification_url = `${baseUrl}/api/mercadopago/pagos`
    }

    console.log("[API] Creating retry payment preference for pedido:", pedidoId)

    const preference = await new Preference(mercadopago).create({ body: preferenceData })

    console.log("[API] Retry payment preference created:", {
      id: preference.id,
      init_point: preference.init_point,
    })

    // Actualizar pedido con nuevo mercadopagoId y volver a estado pendiente
    await prisma.pedido.update({
      where: { id: pedido.id },
      data: {
        mercadopagoId: preference.id,
        estado: "pendiente",
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      preferenceId: preference.id,
      initPoint: preference.init_point!,
      pedidoId: pedido.id,
    })
  } catch (error) {
    console.error("Retry payment error:", error)
    const errorMessage = error instanceof Error ? error.message : "Error al reintentar el pago"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
