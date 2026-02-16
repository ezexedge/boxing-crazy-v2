import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { items } = await request.json()

    if (!items || items.length === 0) {
      return NextResponse.json({ validItems: [], invalidItems: [] })
    }

    const validItems: any[] = []
    const invalidItems: any[] = []

    for (const item of items) {
      // Verificar si el producto existe y está activo
      const producto = await prisma.producto.findFirst({
        where: {
          id: item.productoId,
          activo: true, // Solo productos activos (no eliminados)
        },
        include: { Variante: true },
      })

      if (!producto) {
        invalidItems.push({
          ...item,
          reason: "producto_eliminado",
          message: "Este producto ya no está disponible",
        })
        continue
      }

      // Verificar si tiene variantes (color y talle)
      if (item.color && item.talle) {
        const variante = producto.Variante.find(
          (v) => v.color === item.color && v.talle === item.talle
        )

        if (!variante) {
          invalidItems.push({
            ...item,
            reason: "variante_no_existe",
            message: `Esta combinación de color y talle ya no está disponible`,
          })
          continue
        }

        if (variante.stock < item.cantidad) {
          invalidItems.push({
            ...item,
            reason: "stock_insuficiente",
            message: `Stock insuficiente. Disponible: ${variante.stock}`,
            stockDisponible: variante.stock,
          })
          continue
        }

        // Item válido
        validItems.push({
          ...item,
          stockDisponible: variante.stock,
          precio: producto.precio, // Actualizar precio por si cambió
        })
      } else {
        // Producto sin variantes
        validItems.push({
          ...item,
          precio: producto.precio,
        })
      }
    }

    return NextResponse.json({ validItems, invalidItems })
  } catch (error) {
    console.error("Cart validation error:", error)
    return NextResponse.json({ error: "Error al validar carrito" }, { status: 500 })
  }
}
