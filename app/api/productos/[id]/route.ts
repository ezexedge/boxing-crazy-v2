import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const producto = await prisma.producto.findFirst({
      where: {
        id,
        activo: true
      },
      include: {
        Variante: true,
      },
    })

    if (!producto) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ producto })
  } catch (error) {
    console.error("[v0] Get producto error:", error)
    return NextResponse.json({ error: "Error al obtener producto" }, { status: 500 })
  }
}
