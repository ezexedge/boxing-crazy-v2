import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getTokenFromRequest, verifyToken } from "@/lib/auth"
import { randomUUID } from "crypto"

export async function GET(request: Request) {
  try {
    const token = getTokenFromRequest(request)
    if (!token)
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload || payload.role !== "admin")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    const productos = await prisma.producto.findMany({
      include: {
        Variante: true, // 👈 Trae TODAS las variantes
      },
      orderBy: { createdAt: "desc" },
    })

    console.log("PRODUCTOS DEVUELTOS:", JSON.stringify(productos, null, 2)) // 👈 ver en consola
    return NextResponse.json({ productos })
  } catch (error) {
    console.error("[v0] Get admin productos error:", error)
    return NextResponse.json({ error: "Error al obtener productos" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const token = getTokenFromRequest(request)
    if (!token)
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload || payload.role !== "admin")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    const data = await request.json()
    console.log("DATA VARIANTES RECIBIDAS:", data.variantes) // 👈 Depuración clave

    // ✅ Validación de datos
    if (!Array.isArray(data.variantes) || data.variantes.length === 0) {
      return NextResponse.json({ error: "Debe incluir al menos una variante" }, { status: 400 })
    }

    // ✅ Creación
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
          create: data.variantes.map((v: any) => ({
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

    console.log("PRODUCTO CREADO:", producto) // 👈 Confirma que Prisma guardó las variantes
    return NextResponse.json({ producto })
  } catch (error) {
    console.error("[v0] Create producto error:", error)
    return NextResponse.json({ error: "Error al crear producto" }, { status: 500 })
  }
}
