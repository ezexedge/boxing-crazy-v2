"use server"

import { prisma } from "@/lib/db"
import { Producto } from "@/lib/types"

/**
 * Obtiene todos los productos con filtros opcionales
 */
export async function getProductos(params?: {
  categoria?: string
  genero?: string
  search?: string
}) {
  try {
    const where: any = {
      activo: true, // Solo productos activos (no eliminados)
    }

    if (params?.categoria) {
      where.categoria = params.categoria
    }

    if (params?.genero) {
      where.genero = params.genero
    }

    if (params?.search) {
      where.OR = [
        { nombre: { contains: params.search, mode: "insensitive" } },
        { descripcion: { contains: params.search, mode: "insensitive" } },
      ]
    }

    const productos = await prisma.producto.findMany({
      where,
      include: {
        Variante: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return { success: true, productos }
  } catch (error) {
    console.error("[Server Action] getProductos error:", error)
    return { success: false, error: "Error al obtener productos" }
  }
}

/**
 * Obtiene un producto por ID
 */
export async function getProductoById(id: string) {
  try {
    const producto = await prisma.producto.findFirst({
      where: {
        id,
        activo: true, // Solo productos activos (no eliminados)
      },
      include: {
        Variante: {
          orderBy: { color: "asc" },
        },
      },
    })

    if (!producto) {
      return { success: false, error: "Producto no encontrado" }
    }

    return { success: true, producto }
  } catch (error) {
    console.error("[Server Action] getProductoById error:", error)
    return { success: false, error: "Error al obtener producto" }
  }
}

/**
 * Busca productos por término
 */
export async function searchProductos(query: string) {
  try {
    if (!query || query.trim() === "") {
      return { success: true, productos: [] }
    }

    const productos = await prisma.producto.findMany({
      where: {
        activo: true, // Solo productos activos (no eliminados)
        OR: [
          { nombre: { contains: query, mode: "insensitive" } },
          { descripcion: { contains: query, mode: "insensitive" } },
          { categoria: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        Variante: true,
      },
      take: 20,
      orderBy: { createdAt: "desc" },
    })

    return { success: true, productos }
  } catch (error) {
    console.error("[Server Action] searchProductos error:", error)
    return { success: false, error: "Error al buscar productos" }
  }
}

/**
 * Obtiene productos por categoría
 */
export async function getProductosPorCategoria(categoria: string) {
  try {
    const productos = await prisma.producto.findMany({
      where: {
        categoria,
        activo: true, // Solo productos activos (no eliminados)
      },
      include: {
        Variante: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return { success: true, productos }
  } catch (error) {
    console.error("[Server Action] getProductosPorCategoria error:", error)
    return { success: false, error: "Error al obtener productos por categoría" }
  }
}

/**
 * Obtiene productos por género
 */
export async function getProductosPorGenero(genero: string) {
  try {
    const productos = await prisma.producto.findMany({
      where: {
        genero,
        activo: true, // Solo productos activos (no eliminados)
      },
      include: {
        Variante: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return { success: true, productos }
  } catch (error) {
    console.error("[Server Action] getProductosPorGenero error:", error)
    return { success: false, error: "Error al obtener productos por género" }
  }
}

/**
 * Verifica disponibilidad de stock
 */
export async function checkStock(productoId: string, color: string, talle: string) {
  try {
    const variante = await prisma.variante.findFirst({
      where: {
        productoId,
        color,
        talle,
      },
    })

    if (!variante) {
      return { success: false, error: "Variante no encontrada", disponible: false }
    }

    return {
      success: true,
      disponible: variante.stock > 0,
      stock: variante.stock,
    }
  } catch (error) {
    console.error("[Server Action] checkStock error:", error)
    return { success: false, error: "Error al verificar stock", disponible: false }
  }
}
