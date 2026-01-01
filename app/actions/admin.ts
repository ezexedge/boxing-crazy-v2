"use server"

import { prisma } from "@/lib/db"
import { verifyToken } from "@/lib/auth"
import { randomUUID } from "crypto"

/**
 * Verifica si un usuario es admin
 */
async function isAdmin(token: string): Promise<boolean> {
  const payload = verifyToken(token)
  return payload !== null && payload.role === "admin"
}

// ========================================
// PRODUCTOS - Operaciones Admin
// ========================================

/**
 * Obtiene todos los productos (Admin)
 */
export async function adminGetProductos(token: string) {
  try {
    if (!(await isAdmin(token))) {
      return { success: false, error: "No autorizado" }
    }

    const productos = await prisma.producto.findMany({
      include: {
        Variante: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return { success: true, productos }
  } catch (error) {
    console.error("[Server Action] adminGetProductos error:", error)
    return { success: false, error: "Error al obtener productos" }
  }
}

/**
 * Crea un nuevo producto (Admin)
 */
export async function adminCreateProducto(
  token: string,
  data: {
    nombre: string
    descripcion: string
    precio: number
    categoria: string
    genero: string
    imagenes: string[]
    imagenPortada?: string
    variantes: Array<{ color: string; talle: string; stock: number }>
  }
) {
  try {
    if (!(await isAdmin(token))) {
      return { success: false, error: "No autorizado" }
    }

    // Validación
    if (!Array.isArray(data.variantes) || data.variantes.length === 0) {
      return { success: false, error: "Debe incluir al menos una variante" }
    }

    const producto = await prisma.producto.create({
      data: {
        id: randomUUID(),
        nombre: data.nombre,
        descripcion: data.descripcion,
        precio: Number(data.precio),
        categoria: data.categoria,
        genero: data.genero,
        imagenes: data.imagenes || [],
        imagenPortada: data.imagenPortada || data.imagenes?.[0] || null,
        updatedAt: new Date(),
        Variante: {
          create: data.variantes.map((v) => ({
            id: randomUUID(),
            color: v.color,
            talle: v.talle,
            stock: Number(v.stock),
            updatedAt: new Date(),
          })),
        },
      },
      include: {
        Variante: true,
      },
    })

    return { success: true, producto }
  } catch (error) {
    console.error("[Server Action] adminCreateProducto error:", error)
    return { success: false, error: "Error al crear producto" }
  }
}

/**
 * Actualiza un producto existente (Admin)
 */
export async function adminUpdateProducto(
  token: string,
  productoId: string,
  data: {
    nombre: string
    descripcion: string
    precio: number
    categoria: string
    genero: string
    imagenes: string[]
    imagenPortada?: string
    variantes: Array<{ color: string; talle: string; stock: number }>
  }
) {
  try {
    if (!(await isAdmin(token))) {
      return { success: false, error: "No autorizado" }
    }

    // Transacción atómica: borra y recrea las variantes
    const [, producto] = await prisma.$transaction([
      prisma.variante.deleteMany({
        where: { productoId },
      }),
      prisma.producto.update({
        where: { id: productoId },
        data: {
          nombre: data.nombre,
          descripcion: data.descripcion,
          precio: Number(data.precio),
          categoria: data.categoria,
          genero: data.genero,
          imagenes: data.imagenes || [],
          imagenPortada: data.imagenPortada || data.imagenes?.[0] || null,
          updatedAt: new Date(),
          Variante: {
            create: (data.variantes || []).map((v) => ({
              id: randomUUID(),
              color: v.color,
              talle: v.talle,
              stock: Number(v.stock),
              updatedAt: new Date(),
            })),
          },
        },
        include: { Variante: true },
      }),
    ])

    return { success: true, producto }
  } catch (error) {
    console.error("[Server Action] adminUpdateProducto error:", error)
    return { success: false, error: "Error al actualizar producto" }
  }
}

/**
 * Elimina un producto (Admin)
 */
export async function adminDeleteProducto(token: string, productoId: string) {
  try {
    if (!(await isAdmin(token))) {
      return { success: false, error: "No autorizado" }
    }

    await prisma.producto.delete({
      where: { id: productoId },
    })

    return { success: true, message: "Producto eliminado correctamente" }
  } catch (error) {
    console.error("[Server Action] adminDeleteProducto error:", error)
    return { success: false, error: "Error al eliminar producto" }
  }
}

// ========================================
// PEDIDOS - Operaciones Admin
// ========================================

/**
 * Obtiene todos los pedidos (Admin)
 */
export async function adminGetPedidos(token: string) {
  try {
    if (!(await isAdmin(token))) {
      return { success: false, error: "No autorizado" }
    }

    const pedidos = await prisma.pedido.findMany({
      include: {
        User: {
          select: {
            nombre: true,
            apellido: true,
            email: true,
          },
        },
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
    console.error("[Server Action] adminGetPedidos error:", error)
    return { success: false, error: "Error al obtener pedidos" }
  }
}

/**
 * Actualiza el estado de un pedido (Admin)
 */
export async function adminUpdatePedidoEstado(
  token: string,
  pedidoId: string,
  estado: "pendiente" | "pagado" | "enviado" | "entregado"
) {
  try {
    if (!(await isAdmin(token))) {
      return { success: false, error: "No autorizado" }
    }

    const pedido = await prisma.pedido.update({
      where: { id: pedidoId },
      data: { estado },
      include: {
        User: {
          select: {
            nombre: true,
            apellido: true,
            email: true,
          },
        },
        PedidoItem: {
          include: {
            Producto: true,
          },
        },
      },
    })

    return { success: true, pedido }
  } catch (error) {
    console.error("[Server Action] adminUpdatePedidoEstado error:", error)
    return { success: false, error: "Error al actualizar estado del pedido" }
  }
}

/**
 * Elimina un pedido (Admin)
 */
export async function adminDeletePedido(token: string, pedidoId: string) {
  try {
    if (!(await isAdmin(token))) {
      return { success: false, error: "No autorizado" }
    }

    await prisma.pedido.delete({
      where: { id: pedidoId },
    })

    return { success: true, message: "Pedido eliminado correctamente" }
  } catch (error) {
    console.error("[Server Action] adminDeletePedido error:", error)
    return { success: false, error: "Error al eliminar pedido" }
  }
}

// ========================================
// ESTADÍSTICAS - Dashboard Admin
// ========================================

/**
 * Obtiene estadísticas del dashboard (Admin)
 */
export async function adminGetStats(token: string) {
  try {
    if (!(await isAdmin(token))) {
      return { success: false, error: "No autorizado" }
    }

    const [totalProductos, totalPedidos, pedidosPagados, ventasTotal] = await Promise.all([
      prisma.producto.count(),
      prisma.pedido.count(),
      prisma.pedido.count({ where: { estado: "pagado" } }),
      prisma.pedido.aggregate({
        where: { estado: "pagado" },
        _sum: { total: true },
      }),
    ])

    return {
      success: true,
      stats: {
        totalProductos,
        totalPedidos,
        pedidosPagados,
        ventasTotal: ventasTotal._sum.total || 0,
      },
    }
  } catch (error) {
    console.error("[Server Action] adminGetStats error:", error)
    return { success: false, error: "Error al obtener estadísticas" }
  }
}

/**
 * Obtiene estadísticas avanzadas (Admin)
 */
export async function adminGetAdvancedStats(token: string) {
  try {
    if (!(await isAdmin(token))) {
      return { success: false, error: "No autorizado" }
    }

    const [
      productosMasVendidos,
      ventasPorCategoria,
      ventasPorMes,
      stockBajo,
    ] = await Promise.all([
      // Productos más vendidos
      prisma.pedidoItem.groupBy({
        by: ["productoId"],
        _sum: { cantidad: true },
        _count: { productoId: true },
        orderBy: { _sum: { cantidad: "desc" } },
        take: 5,
      }),
      // Ventas por categoría
      prisma.producto.groupBy({
        by: ["categoria"],
        _count: { id: true },
      }),
      // Ventas del último mes
      prisma.pedido.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
          estado: "pagado",
        },
        select: {
          total: true,
          createdAt: true,
        },
      }),
      // Productos con stock bajo
      prisma.variante.findMany({
        where: {
          stock: {
            lte: 5,
          },
        },
        include: {
          Producto: {
            select: {
              nombre: true,
            },
          },
        },
      }),
    ])

    return {
      success: true,
      stats: {
        productosMasVendidos,
        ventasPorCategoria,
        ventasPorMes,
        stockBajo,
      },
    }
  } catch (error) {
    console.error("[Server Action] adminGetAdvancedStats error:", error)
    return { success: false, error: "Error al obtener estadísticas avanzadas" }
  }
}

// ========================================
// USUARIOS - Operaciones Admin
// ========================================

/**
 * Obtiene todos los usuarios (Admin)
 */
export async function adminGetUsers(token: string) {
  try {
    if (!(await isAdmin(token))) {
      return { success: false, error: "No autorizado" }
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        role: true,
        createdAt: true,
        _count: {
          select: { Pedido: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return { success: true, users }
  } catch (error) {
    console.error("[Server Action] adminGetUsers error:", error)
    return { success: false, error: "Error al obtener usuarios" }
  }
}

/**
 * Actualiza el rol de un usuario (Admin)
 */
export async function adminUpdateUserRole(
  token: string,
  userId: string,
  role: "user" | "admin"
) {
  try {
    if (!(await isAdmin(token))) {
      return { success: false, error: "No autorizado" }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        role: true,
      },
    })

    return { success: true, user }
  } catch (error) {
    console.error("[Server Action] adminUpdateUserRole error:", error)
    return { success: false, error: "Error al actualizar rol de usuario" }
  }
}
