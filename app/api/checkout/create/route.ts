import { NextResponse } from "next/server"
import { getTokenFromRequest, verifyToken } from "@/lib/auth"
import { billingAddressSchema } from "@/lib/validations/billing"
import api from "@/lib/api"

export async function POST(request: Request) {
  try {
    // Verify authentication
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { items, billingAddress } = await request.json()

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "El carrito está vacío" }, { status: 400 })
    }

    // Validate billing address
    if (!billingAddress) {
      return NextResponse.json({ error: "La dirección de facturación es requerida" }, { status: 400 })
    }

    // Validate billing address with Zod
    const validationResult = billingAddressSchema.safeParse(billingAddress)

    if (!validationResult.success) {
      console.error("[Checkout] Validation errors:", validationResult.error.errors)
      return NextResponse.json(
        {
          error: "Datos de dirección inválidos",
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const validatedAddress = validationResult.data

    // Usar la API centralizada para crear el checkout
    const result = await api.checkout.submit(payload.userId, items, validatedAddress)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Create checkout error:", error)
    const errorMessage = error instanceof Error ? error.message : "Error al crear el checkout"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
