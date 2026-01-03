import { MercadoPagoConfig, Preference, Payment } from "mercadopago"
import { prisma } from "@/lib/db"
import { randomUUID } from "crypto"

// Configuración de MercadoPago
export const mercadopago = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
})

interface CheckoutItem {
  productoId: string
  nombre: string
  cantidad: number
  precio: number
  color?: string
  talle?: string
}

interface BillingAddress {
  email: string
  country: string
  firstName: string
  lastName: string
  company?: string
  addressLine1: string
  addressLine2?: string
  postalCode: string
  city: string
  province: string
  phone?: string
}

const api = {
  checkout: {
    /**
     * Crea una preferencia de pago en MercadoPago y un pedido en la DB
     */
    async submit(userId: string, items: CheckoutItem[], billingAddress: BillingAddress) {
      // Verificar stock antes de crear el pedido
      for (const item of items) {
        if (item.color && item.talle) {
          const variante = await prisma.variante.findFirst({
            where: {
              productoId: item.productoId,
              color: item.color,
              talle: item.talle,
            },
          })

          if (!variante || variante.stock < item.cantidad) {
            throw new Error(`Stock insuficiente para ${item.nombre} (${item.color}, ${item.talle})`)
          }
        }
      }

      // Calcular total
      const total = items.reduce((sum, item) => sum + item.precio * item.cantidad, 0)

      // Crear el pedido con estado "pendiente"
      const pedido = await prisma.pedido.create({
        data: {
          id: randomUUID(),
          userId,
          total,
          estado: "pendiente",
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
            create: items.map((item) => ({
              id: randomUUID(),
              productoId: item.productoId,
              cantidad: item.cantidad,
              precio: item.precio,
              color: item.color,
              talle: item.talle,
            })),
          },
        },
      })

      console.log("[API] Pedido created:", pedido.id)

      // Crear preferencia en MercadoPago
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
      if (!baseUrl) {
        throw new Error("NEXT_PUBLIC_BASE_URL no configurada")
      }
      const isProduction = baseUrl.startsWith("https://")

      const preferenceData: any = {
        items: items.map((item) => ({
          id: String(item.productoId),
          title: item.nombre,
          quantity: Number(item.cantidad),
          unit_price: Number(item.precio),
          currency_id: "ARS",
        })),
        payer: {
          name: billingAddress.firstName,
          surname: billingAddress.lastName,
          email: billingAddress.email,
        },
        back_urls: {
          success: `${baseUrl}/checkout/success?pedidoId=${pedido.id}`,
          failure: `${baseUrl}/checkout/failure?pedidoId=${pedido.id}`,
          pending: `${baseUrl}/checkout/pending?pedidoId=${pedido.id}`,
        },
        // Guardamos el pedidoId en metadata para vincularlo en el webhook
        metadata: {
          pedidoId: pedido.id,
        },
      }

      // Solo agregar notification_url en producción (URLs públicas)
      if (isProduction) {
        preferenceData.notification_url = `${baseUrl}/api/mercadopago/pagos`
      }

      console.log("[API] Creating preference with data:", JSON.stringify(preferenceData, null, 2))

      // Crear la preferencia usando el patrón recomendado
      const preference = await new Preference(mercadopago).create({ body: preferenceData })

      console.log("[API] Preference created successfully:", {
        id: preference.id,
        init_point: preference.init_point,
      })

      // Actualizar pedido con mercadopagoId (preferenceId)
      await prisma.pedido.update({
        where: { id: pedido.id },
        data: { mercadopagoId: preference.id },
      })

      // Devolvemos el init point (url de pago) para que el usuario pueda pagar
      return {
        preferenceId: preference.id,
        initPoint: preference.init_point!,
        pedidoId: pedido.id,
      }
    },
  },

  payment: {
    /**
     * Procesa la notificación de pago de MercadoPago
     * Actualiza el estado del pedido y reduce stock si fue aprobado
     */
    async processWebhook(paymentId: string) {
      const paymentClient = new Payment(mercadopago)

      // Verificar el pago con la API de MercadoPago
      const payment = await paymentClient.get({ id: paymentId })

      console.log("[API] Payment status:", payment.status)
      console.log("[API] Payment ID:", payment.id)
      console.log("[API] Metadata:", payment.metadata)

      // Obtener pedidoId del metadata
      const metadata = payment.metadata as any
      const pedidoId = metadata.pedidoId || metadata.pedido_id

      if (!pedidoId) {
        throw new Error("No pedidoId in payment metadata")
      }

      // Buscar el pedido
      const pedido = await prisma.pedido.findUnique({
        where: { id: pedidoId },
        include: { PedidoItem: true },
      })

      if (!pedido) {
        throw new Error(`Pedido not found: ${pedidoId}`)
      }

      // Si el pedido ya fue procesado (no está pendiente), no hacer nada
      if (pedido.estado !== "pendiente") {
        console.log("[API] Pedido already processed:", pedidoId, "Estado:", pedido.estado)
        return { pedidoId, status: pedido.estado, alreadyProcessed: true }
      }

      // Actualizar estado según el resultado del pago
      let nuevoEstado = "pendiente"

      if (payment.status === "approved") {
        nuevoEstado = "pagado"

        // Actualizar estado del pedido
        await prisma.pedido.update({
          where: { id: pedidoId },
          data: {
            estado: nuevoEstado,
            updatedAt: new Date(),
          },
        })

        console.log("[API] Pedido updated to 'pagado':", pedidoId)

        // Reducir stock solo si el pago fue aprobado
        for (const item of pedido.PedidoItem) {
          if (item.color && item.talle) {
            // Verificar stock antes de decrementar
            const variante = await prisma.variante.findFirst({
              where: {
                productoId: item.productoId,
                color: item.color,
                talle: item.talle,
              },
            })

            if (variante && variante.stock >= item.cantidad) {
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
              console.log(`[API] Stock reduced for ${item.productoId} - ${item.color} - ${item.talle}`)
            } else {
              console.error(
                `[API] Stock insuficiente para ${item.productoId} - ${item.color} - ${item.talle}. Stock disponible: ${variante?.stock || 0}, solicitado: ${item.cantidad}`
              )
            }
          }
        }
      } else if (payment.status === "rejected" || payment.status === "cancelled") {
        nuevoEstado = "fallido"

        // Actualizar estado del pedido
        await prisma.pedido.update({
          where: { id: pedidoId },
          data: {
            estado: nuevoEstado,
            updatedAt: new Date(),
          },
        })

        console.log("[API] Pedido updated to 'fallido':", pedidoId)
      } else if (payment.status === "pending" || payment.status === "in_process") {
        // Mantener como pendiente
        console.log("[API] Payment still pending:", pedidoId)
      }

      return { pedidoId, status: nuevoEstado, alreadyProcessed: false }
    },

    /**
     * Verifica el estado de un pago directamente
     */
    async getStatus(paymentId: string) {
      const paymentClient = new Payment(mercadopago)
      const payment = await paymentClient.get({ id: paymentId })

      return {
        id: payment.id,
        status: payment.status,
        statusDetail: payment.status_detail,
        metadata: payment.metadata,
      }
    },
  },

  pedido: {
    /**
     * Obtiene un pedido por ID
     */
    async get(pedidoId: string) {
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

      return pedido
    },

    /**
     * Obtiene todos los pedidos de un usuario
     */
    async listByUser(userId: string) {
      const pedidos = await prisma.pedido.findMany({
        where: {
          userId,
        },
        include: {
          PedidoItem: {
            include: {
              Producto: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      })

      return pedidos
    },
  },
}

export default api
