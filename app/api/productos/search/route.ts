import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ productos: [] })
    }

    const productos = await prisma.producto.findMany({
      where: {
        activo: true,
        OR: [
          { nombre: { contains: query, mode: "insensitive" } },
          { descripcion: { contains: query, mode: "insensitive" } },
          { categoria: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        Variante: true,
      },
      take: 10,
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ productos })
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json({ error: "Error al buscar productos" }, { status: 500 })
  }
}
