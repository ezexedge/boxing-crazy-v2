import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { MercadoPagoConfig, Payment } from "mercadopago"
import { randomUUID } from "crypto"

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || "",
})

const paymentClient = new Payment(client)

export async function POST(request: Request) {
  try {
    const body = await request.json()

    console.log("[MercadoPago Webhook] Received:", JSON.stringify(body, null, 2))

    // Handle payment notification
    if (body.type === "payment") {
      const paymentId = body.data.id

      if (!paymentId) {
        console.error("[MercadoPago Webhook] No payment ID in webhook")
        return new Response(null, { status: 200 })
      }

      // Verify payment with MercadoPago API
      const payment = await paymentClient.get({ id: paymentId })

      console.log("[MercadoPago Webhook] Payment status:", payment.status)
      console.log("[MercadoPago Webhook] Metadata:", payment.metadata)

      // Si el pago ya existe en la DB, no lo procesamos de nuevo
      const existingOrder = await prisma.pedido.findFirst({
        where: { mercadopagoId: payment.id?.toString() },
      })

      if (existingOrder) {
        console.log("[MercadoPago Webhook] Payment already processed:", payment.id)
        return new Response(null, { status: 200 })
      }

      // Create order when payment is approved
      if (payment.status === "approved") {
        // Parseamos los datos del metadata
        const metadata = payment.metadata as any
        const items = JSON.parse(metadata.items as string)
        const billingAddress = JSON.parse(metadata.billingAddress as string || metadata.billing_address as string)
        const userId = (metadata.userId || metadata.user_id) as string

        // Calculamos el total
        const total = items.reduce((sum: number, item: any) => sum + item.precio * item.cantidad, 0)

        // Creamos el pedido
        const pedido = await prisma.pedido.create({
          data: {
            id: randomUUID(),
            userId: userId,
            total,
            estado: "pagado",
            mercadopagoId: payment.id?.toString(),
            updatedAt: new Date(),

            // Billing/Shipping address
            email: billingAddress.email,
            country: billingAddress.country,
            firstName: billingAddress.firstName,
            lastName: billingAddress.lastName,
            company: billingAddress.company || null,
            addressLine1: billingAddress.addressLine1,
            addressLine2: billingAddress.addressLine2 || null,
            postalCode: billingAddress.postalCode,
            city: billingAddress.city,
            province: billingAddress.province,
            phone: billingAddress.phone || null,

            PedidoItem: {
              create: items.map((item: any) => ({
                id: randomUUID(),
                productoId: item.productoId,
                cantidad: item.cantidad,
                precio: item.precio,
                color: item.color,
                talle: item.talle,
              })),
            },
          },
          include: {
            PedidoItem: true,
          },
        })

        console.log("[MercadoPago Webhook] Order created:", pedido.id)

        // Reduce stock for each item
        for (const item of pedido.PedidoItem) {
          if (item.color && item.talle) {
            await prisma.variante.updateMany({
              where: {
                productoId: item.productoId,
                color: item.color,
                talle: item.talle,
              },
              data: {
                stock: {
                  decrement: item.cantidad,
                },
              },
            })
            console.log(`[MercadoPago Webhook] Stock reduced for ${item.productoId} - ${item.color} - ${item.talle}`)
          }
        }
      }
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
