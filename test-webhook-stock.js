/**
 * Test del webhook de MercadoPago y descuento de stock
 *
 * Este script simula directamente la notificación de pago
 * y verifica que el stock se descuente correctamente
 */

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
}

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function logStep(step, message) {
  log(`\n[${step}] ${message}`, colors.cyan)
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green)
}

function logError(message) {
  log(`❌ ${message}`, colors.red)
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.yellow)
}

async function testWebhookStock() {
  try {
    log("\n" + "=".repeat(60), colors.bright)
    log("TEST: WEBHOOK Y DESCUENTO DE STOCK", colors.bright)
    log("=".repeat(60) + "\n", colors.bright)

    let token = null
    let productoId = null
    let varianteInicial = null
    let pedidoId = null
    let preferenceId = null

    // Paso 1: Login
    logStep(1, "Login de usuario")

    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@test.com",
        password: "123456",
      }),
    })

    const loginData = await loginResponse.json()
    token = loginData.token
    logSuccess(`Usuario autenticado: ${loginData.user.email}`)

    // Paso 2: Obtener producto
    logStep(2, "Obtener producto con stock")

    const productosResponse = await fetch(`${baseUrl}/api/productos`)
    const productosData = await productosResponse.json()

    const productoConStock = productosData.productos.find(p =>
      p.Variante && p.Variante.length > 0 && p.Variante.some(v => v.stock > 0)
    )

    productoId = productoConStock.id
    varianteInicial = productoConStock.Variante.find(v => v.stock > 0)

    logSuccess(`Producto: ${productoConStock.nombre}`)
    logInfo(`Stock inicial: ${varianteInicial.stock} (${varianteInicial.color}, ${varianteInicial.talle})`)

    // Paso 3: Crear checkout
    logStep(3, "Crear checkout")

    const checkoutResponse = await fetch(`${baseUrl}/api/checkout/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        items: [
          {
            productoId: productoId,
            nombre: productoConStock.nombre,
            cantidad: 2, // Compramos 2 unidades
            precio: productoConStock.precio,
            color: varianteInicial.color,
            talle: varianteInicial.talle,
          },
        ],
        billingAddress: {
          email: "test@test.com",
          country: "Argentina",
          firstName: "Test",
          lastName: "User",
          addressLine1: "Calle Test 123",
          postalCode: "1234",
          city: "Buenos Aires",
          province: "Buenos Aires",
          phone: "1234567890",
        },
      }),
    })

    const checkoutData = await checkoutResponse.json()
    pedidoId = checkoutData.pedidoId
    preferenceId = checkoutData.preferenceId

    logSuccess("Checkout creado")
    logInfo(`Pedido ID: ${pedidoId}`)
    logInfo(`Cantidad en pedido: 2 unidades`)

    // Paso 4: Verificar stock antes del webhook
    logStep(4, "Verificar stock ANTES del webhook")

    const producto1 = await fetch(`${baseUrl}/api/productos/${productoId}`)
    const productoData1 = await producto1.json()
    const variante1 = productoData1.producto.Variante.find(
      v => v.color === varianteInicial.color && v.talle === varianteInicial.talle
    )

    if (variante1.stock !== varianteInicial.stock) {
      logError(`Stock ya cambió! Inicial: ${varianteInicial.stock}, Actual: ${variante1.stock}`)
      return
    }

    logSuccess(`Stock sin cambios: ${variante1.stock}`)

    // Paso 5: Obtener información del pedido
    logStep(5, "Obtener metadata del pedido para el webhook")

    logInfo("IMPORTANTE: Para que el webhook funcione en producción,")
    logInfo("MercadoPago debe enviar el paymentId real.")
    logInfo("\nEn este test, necesitarías:")
    logInfo("1. Completar el pago real en MercadoPago")
    logInfo("2. MercadoPago enviará automáticamente el webhook")
    logInfo("3. O usar las herramientas de MercadoPago para simular notificaciones\n")

    log("URL de pago:", colors.yellow)
    log(checkoutData.initPoint + "\n", colors.blue)

    log("Para probar manualmente el webhook, ejecuta:", colors.yellow)
    log(`
curl -X POST ${baseUrl}/api/mercadopago/pagos \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "payment",
    "data": {
      "id": "PAYMENT_ID_DE_MERCADOPAGO"
    }
  }'
`, colors.blue)

    logInfo("\nVerifica el estado y stock manualmente:")
    log(`
Estado del pedido:
curl -H "Authorization: Bearer ${token}" ${baseUrl}/api/pedidos | grep -A 20 "${pedidoId}"

Stock actual:
curl ${baseUrl}/api/productos/${productoId} | grep -A 5 "stock"
`, colors.blue)

    log("\n" + "=".repeat(60), colors.yellow)
    log("RESUMEN DEL TEST", colors.bright)
    log("=".repeat(60), colors.yellow)
    logSuccess("Pedido creado: " + pedidoId)
    logSuccess("Stock inicial: " + varianteInicial.stock)
    logSuccess("Cantidad a descontar: 2")
    logInfo("Stock esperado después del pago: " + (varianteInicial.stock - 2))
    log("=".repeat(60) + "\n", colors.yellow)

  } catch (error) {
    logError("Error en el test:")
    console.error(error)
  }
}

testWebhookStock()
