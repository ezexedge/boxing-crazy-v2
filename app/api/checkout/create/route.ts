import { NextResponse } from "next/server"
import { getTokenFromRequest, verifyToken } from "@/lib/auth"
import { Preference } from "mercadopago"
import { MercadoPagoConfig } from "mercadopago"
import { billingAddressSchema } from "@/lib/validations/billing"

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || "",
})

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

    // Create MercadoPago preference (no creamos el pedido todavía)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    if (!baseUrl) {
      return NextResponse.json({ error: "NEXT_PUBLIC_BASE_URL no configurada" }, { status: 500 })
    }
    const isProduction = baseUrl.startsWith("https://")

    const preferenceData: any = {
      items: items.map((item: any) => ({
        id: String(item.productoId),
        title: item.nombre,
        quantity: Number(item.cantidad),
        unit_price: Number(item.precio),
        currency_id: "ARS",
      })),
      payer: {
        name: validatedAddress.firstName,
        surname: validatedAddress.lastName,
        email: validatedAddress.email,
      },
      back_urls: {
        success: `${baseUrl}/checkout/success`,
        failure: `${baseUrl}/checkout/failure`,
        pending: `${baseUrl}/checkout/pending`,
      },
      // Guardamos toda la info en metadata para crear el pedido en el webhook
      metadata: {
        userId: payload.userId,
        items: JSON.stringify(items),
        billingAddress: JSON.stringify(validatedAddress),
      },
    }

    // Solo agregar notification_url en producción (URLs públicas)
    if (isProduction) {
      preferenceData.notification_url = `${baseUrl}/api/webhooks/mercadopago`
    }

    console.log("[Checkout] Creating preference with data:", JSON.stringify(preferenceData, null, 2))

    // Crear la preferencia usando el patrón recomendado
    const preference = await new Preference(client).create({ body: preferenceData })

    console.log("[Checkout] Preference created successfully:", {
      id: preference.id,
      init_point: preference.init_point,
    })

    return NextResponse.json({
      preferenceId: preference.id,
      initPoint: preference.init_point,
    })
  } catch (error) {
    console.error("Create checkout error:", error)
    return NextResponse.json({ error: "Error al crear el checkout" }, { status: 500 })
  }
}
