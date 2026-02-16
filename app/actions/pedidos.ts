"use server"

import { prisma } from "@/lib/db"
import { mercadopago } from "@/lib/mercadopago"
import { CartItem } from "@/lib/types"
import { randomUUID } from "crypto"

/**
 * Crea un pedido y genera la preferencia de MercadoPago
 */
export async function createCheckout(userId: string, items: CartItem[]) {
  try {
    // Validar input
    if (!items || items.length === 0) {
      return { success: false, error: "El carrito está vacío" }
    }

    if (!userId) {
      return { success: false, error: "Usuario no autenticado" }
    }

    // Verificar que los productos estén activos y tengan stock
    for (const item of items) {
      // Verificar que el producto esté activo (no eliminado)
      const producto = await prisma.producto.findFirst({
        where: {
          id: item.productoId,
          activo: true,
        },
      })

      if (!producto) {
        return {
          success: false,
          error: `El producto ${item.nombre} ya no está disponible`,
        }
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
          return {
            success: false,
            error: `Stock insuficiente para ${item.nombre} (${item.color}, ${item.talle})`,
          }
        }
      }
    }

    // Calcular total
    const total = items.reduce((sum, item) => sum + item.precio * item.cantidad, 0)

    // Crear pedido en la base de datos
    const pedidoId = randomUUID()
    const pedido = await prisma.pedido.create({
      data: {
        id: pedidoId,
        userId,
        total,
        estado: "pendiente",
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

    // Crear preferencia de MercadoPago
    const preference = await mercadopago.preference.create({
      body: {
        items: items.map((item) => ({
          id: item.productoId,
          title: item.nombre,
          quantity: item.cantidad,
          unit_price: item.precio,
          currency_id: "ARS",
        })),
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success?pedidoId=${pedido.id}`,
          failure: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/failure`,
          pending: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/pending`,
        },
        auto_return: "approved",
        external_reference: pedido.id,
        notification_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/mercadopago`,
      },
    })

    // Actualizar pedido con ID de MercadoPago
    await prisma.pedido.update({
      where: { id: pedido.id },
      data: { mercadopagoId: preference.id },
    })

    return {
      success: true,
      preferenceId: preference.id,
      initPoint: preference.init_point,
      pedidoId: pedido.id,
    }
  } catch (error) {
    console.error("[Server Action] createCheckout error:", error)
    return { success: false, error: "Error al crear el checkout" }
  }
}

/**
 * Obtiene un pedido por ID
 */
export async function getPedidoById(pedidoId: string, userId?: string) {
  try {
    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: {
        PedidoItem: {
          include: {
            Producto: true,
          },
        },
        User: {
          select: {
            id: true,
            email: true,
            nombre: true,
            apellido: true,
          },
        },
      },
    })

    if (!pedido) {
      return { success: false, error: "Pedido no encontrado" }
    }

    // Verificar que el usuario tenga acceso (si no es admin)
    if (userId && pedido.userId !== userId) {
      // Aquí deberías verificar si el usuario es admin
      // Por ahora solo permitimos al dueño del pedido
      return { success: false, error: "No tienes permiso para ver este pedido" }
    }

    return { success: true, pedido }
  } catch (error) {
    console.error("[Server Action] getPedidoById error:", error)
    return { success: false, error: "Error al obtener pedido" }
  }
}

/**
 * Obtiene todos los pedidos de un usuario
 */
export async function getPedidosByUserId(userId: string) {
  try {
    const pedidos = await prisma.pedido.findMany({
      where: { userId },
      include: {
        PedidoItem: {
          include: {
            Producto: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return { success: true, pedidos }
  } catch (error) {
    console.error("[Server Action] getPedidosByUserId error:", error)
    return { success: false, error: "Error al obtener pedidos" }
  }
}

/**
 * Actualiza el estado de un pedido
 */
export async function updatePedidoEstado(
  pedidoId: string,
  estado: "pendiente" | "pagado" | "enviado" | "entregado"
) {
  try {
    const pedido = await prisma.pedido.update({
      where: { id: pedidoId },
      data: { estado },
    })

    return { success: true, pedido }
  } catch (error) {
    console.error("[Server Action] updatePedidoEstado error:", error)
    return { success: false, error: "Error al actualizar estado del pedido" }
  }
}

/**
 * Confirma el pago de un pedido (llamado por webhook)
 */
export async function confirmarPagoPedido(pedidoId: string) {
  try {
    // Actualizar estado del pedido
    const pedido = await prisma.pedido.update({
      where: { id: pedidoId },
      data: { estado: "pagado" },
      include: {
        PedidoItem: true,
      },
    })

    // Reducir stock de variantes
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
      }
    }

    return { success: true, pedido }
  } catch (error) {
    console.error("[Server Action] confirmarPagoPedido error:", error)
    return { success: false, error: "Error al confirmar pago" }
  }
}

/**
 * Cancela un pedido
 */
export async function cancelarPedido(pedidoId: string, userId: string) {
  try {
    // Obtener pedido
    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
    })

    if (!pedido) {
      return { success: false, error: "Pedido no encontrado" }
    }

    // Verificar que el usuario sea el dueño
    if (pedido.userId !== userId) {
      return { success: false, error: "No tienes permiso para cancelar este pedido" }
    }

    // Solo se puede cancelar si está pendiente
    if (pedido.estado !== "pendiente") {
      return { success: false, error: "Solo se pueden cancelar pedidos pendientes" }
    }

    // Eliminar pedido
    await prisma.pedido.delete({
      where: { id: pedidoId },
    })

    return { success: true, message: "Pedido cancelado correctamente" }
  } catch (error) {
    console.error("[Server Action] cancelarPedido error:", error)
    return { success: false, error: "Error al cancelar pedido" }
  }
}
