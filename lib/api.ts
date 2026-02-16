import { MercadoPagoConfig, Preference, Payment } from "mercadopago"
import { prisma } from "@/lib/db"
import { randomUUID } from "crypto"
import { revalidatePath } from "next/cache"

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
      // Verificar que los productos estén activos y tengan stock antes de crear el pedido
      for (const item of items) {
        // Verificar que el producto esté activo (no eliminado)
        const producto = await prisma.producto.findFirst({
          where: {
            id: item.productoId,
            activo: true,
          },
        })

        if (!producto) {
          throw new Error(`El producto ${item.nombre} ya no está disponible`)
        }

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
        // Guardamos el pedidoId en metadata para vincularlo en la verificación
        metadata: {
          pedidoId: pedido.id,
        },
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

        // Usar una transacción para evitar race conditions
        // Solo actualizar el pedido si sigue en estado pendiente
        const updated = await prisma.$transaction(async (tx) => {
          // Verificar nuevamente dentro de la transacción
          const currentPedido = await tx.pedido.findUnique({
            where: { id: pedidoId },
            select: { estado: true },
          })

          // Si ya fue procesado por otra request, cancelar
          if (!currentPedido || currentPedido.estado !== "pendiente") {
            console.log("[API] Pedido already processed in transaction:", pedidoId)
            return null
          }

          // Verificar que los productos estén activos y tengan stock ANTES de actualizar el pedido
          const stockErrors: string[] = []
          for (const item of pedido.PedidoItem) {
            // Verificar que el producto esté activo (no eliminado)
            const producto = await tx.producto.findFirst({
              where: {
                id: item.productoId,
                activo: true,
              },
            })

            if (!producto) {
              stockErrors.push(`Producto ${item.productoId} ya no está disponible`)
              continue
            }

            if (item.color && item.talle) {
              const variante = await tx.variante.findFirst({
                where: {
                  productoId: item.productoId,
                  color: item.color,
                  talle: item.talle,
                },
              })

              if (!variante) {
                stockErrors.push(
                  `Producto ${item.productoId} (${item.color}, ${item.talle}) ya no existe`
                )
              } else if (variante.stock < item.cantidad) {
                stockErrors.push(
                  `Stock insuficiente para ${item.productoId} (${item.color}, ${item.talle}). Disponible: ${variante.stock}, solicitado: ${item.cantidad}`
                )
              }
            }
          }

          // Si hay errores de stock, marcar pedido como fallido en lugar de pagado
          if (stockErrors.length > 0) {
            console.error("[API] Stock validation errors:", stockErrors)

            await tx.pedido.update({
              where: { id: pedidoId },
              data: {
                estado: "fallido",
                updatedAt: new Date(),
              },
            })

            console.log("[API] Pedido marked as 'fallido' due to stock issues:", pedidoId)
            return { success: false, stockErrors }
          }

          // Actualizar estado del pedido a pagado
          await tx.pedido.update({
            where: { id: pedidoId },
            data: {
              estado: nuevoEstado,
              updatedAt: new Date(),
            },
          })

          console.log("[API] Pedido updated to 'pagado':", pedidoId)

          // Reducir stock
          for (const item of pedido.PedidoItem) {
            if (item.color && item.talle) {
              await tx.variante.updateMany({
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
              console.log(
                `[API] Stock reduced for ${item.productoId} - ${item.color} - ${item.talle} by ${item.cantidad}`
              )
            }
          }

          return { success: true }
        })

        // Si la transacción retornó null, significa que el pedido ya fue procesado
        if (!updated) {
          return { pedidoId, status: "pagado", alreadyProcessed: true }
        }

        // Si hubo errores de stock, retornar error
        if (typeof updated === "object" && "stockErrors" in updated && !updated.success) {
          return {
            pedidoId,
            status: "fallido",
            error: "Stock insuficiente",
            stockErrors: updated.stockErrors,
          }
        }

        // Revalidar páginas para que muestren el stock actualizado
        revalidatePath("/")
        revalidatePath("/producto/[id]", "page")
        console.log("[API] Cache revalidated for home and product pages")
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

    /**
     * Verifica el pago por pedidoId buscando en MercadoPago
     * Útil cuando no tenemos el paymentId pero sí el pedidoId
     */
    async verifyByPedidoId(pedidoId: string) {
      const pedido = await prisma.pedido.findUnique({
        where: { id: pedidoId },
        include: { PedidoItem: true },
      })

      if (!pedido) {
        throw new Error("Pedido no encontrado")
      }

      if (!pedido.mercadopagoId) {
        throw new Error("Pedido sin preferencia de pago asociada")
      }

      // Si el pedido ya fue procesado, retornar su estado actual
      if (pedido.estado !== "pendiente") {
        console.log("[API] Pedido already processed:", pedidoId, "Estado:", pedido.estado)
        return { pedidoId, status: pedido.estado, alreadyProcessed: true }
      }

      // Buscar el pago asociado a esta preferencia en MercadoPago
      const paymentClient = new Payment(mercadopago)

      try {
        // Buscar pagos recientes que puedan estar asociados a este pedido
        // Ampliar ventana de búsqueda a 30 minutos antes y 5 minutos después
        const searchResult = await paymentClient.search({
          options: {
            criteria: "desc",
            range: "date_created",
            begin_date: new Date(pedido.createdAt.getTime() - 30 * 60000).toISOString(), // 30 min antes
            end_date: new Date(Date.now() + 5 * 60000).toISOString(), // 5 min después de ahora
          },
        })

        console.log("[API] Found payments:", searchResult.results?.length || 0)

        // Buscar pago que coincida con el pedidoId en metadata o con la preferenceId
        const payment = searchResult.results?.find(
          (p: any) =>
            p.metadata?.pedidoId === pedidoId ||
            p.metadata?.pedido_id === pedidoId ||
            p.additional_info?.items?.some((item: any) => item.id === pedido.mercadopagoId) ||
            // También buscar por preference_id si está disponible
            p.additional_info?.preference_id === pedido.mercadopagoId
        )

        if (payment) {
          console.log("[API] Payment found for pedidoId:", pedidoId, "paymentId:", payment.id, "status:", payment.status)
          // Procesar el pago encontrado
          return await this.processWebhook(String(payment.id))
        } else {
          console.log("[API] No payment found for pedidoId:", pedidoId, "in", searchResult.results?.length || 0, "payments")
          return { pedidoId, status: pedido.estado, verified: false }
        }
      } catch (error) {
        console.error("[API] Error searching for payment:", error)
        throw error
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
