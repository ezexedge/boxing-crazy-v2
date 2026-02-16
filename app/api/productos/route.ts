import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: Request) {
  try {
    console.log("[v0] GET /api/productos - Starting request")

    const { searchParams } = new URL(request.url)
    const categoria = searchParams.get("categoria")
    const genero = searchParams.get("genero")

    console.log("[v0] Query params:", { categoria, genero })

    const where: any = { activo: true }
    if (categoria) where.categoria = categoria
    if (genero) where.genero = genero

    console.log("[v0] Fetching productos from database...")

    const productos = await prisma.producto.findMany({
      where,
      include: {
        Variante: true,
      },
      orderBy: { createdAt: "desc" },
    })

    console.log("[v0] Found productos:", productos.length)

    return NextResponse.json({ productos })
  } catch (error) {
    console.error("[v0] Get productos error:", error)
    return NextResponse.json({ error: "Error al obtener productos" }, { status: 500 })
  }
}
