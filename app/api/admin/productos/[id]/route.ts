import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getTokenFromRequest, verifyToken } from "@/lib/auth"
import { randomUUID } from "crypto"

// ✅ Obtener producto por ID (opcional)
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const token = getTokenFromRequest(request)
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload || payload.role !== "admin")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    const producto = await prisma.producto.findUnique({
      where: { id },
      include: { Variante: true },
    })

    if (!producto)
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })

    return NextResponse.json({ producto })
  } catch (error) {
    console.error("[v0] Get producto error:", error)
    return NextResponse.json({ error: "Error al obtener producto" }, { status: 500 })
  }
}

// ✅ Actualizar producto con variantes
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const token = getTokenFromRequest(request)
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload || payload.role !== "admin")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    const data = await request.json()
    console.log("🟦 Actualizando producto:", id, data)

    // 🔄 Si solo se está restaurando el producto (activo: true)
    if (Object.keys(data).length === 1 && data.activo === true) {
      const producto = await prisma.producto.update({
        where: { id },
        data: {
          activo: true,
          updatedAt: new Date(),
        },
        include: { Variante: true },
      })
      console.log("✅ Producto restaurado:", producto)
      return NextResponse.json({ producto })
    }

    // 🚀 Transacción atómica: borra y recrea las variantes
    const [, producto] = await prisma.$transaction([
      prisma.variante.deleteMany({
        where: { productoId: id },
      }),
      prisma.producto.update({
        where: { id },
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
            create: (data.variantes || []).map((v: any) => ({
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

    console.log("✅ Producto actualizado:", producto)
    return NextResponse.json({ producto })
  } catch (error) {
    console.error("[v0] Update producto error:", error)
    return NextResponse.json({ error: "Error al actualizar producto" }, { status: 500 })
  }
}

// ✅ Eliminar producto (borrado lógico)
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const token = getTokenFromRequest(request)
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload || payload.role !== "admin")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    await prisma.producto.update({
      where: { id },
      data: {
        activo: false,
        updatedAt: new Date()
      },
    })

    console.log("🗑️ Producto desactivado (borrado lógico):", id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Delete producto error:", error)
    return NextResponse.json({ error: "Error al eliminar producto" }, { status: 500 })
  }
}
