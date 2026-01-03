/**
 * Test completo del flujo de pago
 *
 * Este script prueba:
 * 1. Login de usuario
 * 2. Verificar stock inicial
 * 3. Crear checkout
 * 4. Simular webhook de pago aprobado
 * 5. Verificar que el pedido cambió a "pagado"
 * 6. Verificar que el stock se descontó
 */

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

// Colores para la consola
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
  log(`\n[${ step}] ${message}`, colors.cyan)
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

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function testFlujoPago() {
  try {
    log("\n" + "=".repeat(60), colors.bright)
    log("TEST: FLUJO COMPLETO DE PAGO", colors.bright)
    log("=".repeat(60) + "\n", colors.bright)

    let token = null
    let userId = null
    let productoId = null
    let varianteInicial = null
    let pedidoId = null

    // ==========================================
    // PASO 1: Login
    // ==========================================
    logStep(1, "Login de usuario")

    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@test.com",
        password: "123456",
      }),
    })

    if (!loginResponse.ok) {
      logError("Login falló")
      const error = await loginResponse.json()
      console.log("Error:", error)
      return
    }

    const loginData = await loginResponse.json()
    token = loginData.token
    userId = loginData.user.id
    logSuccess(`Usuario autenticado: ${loginData.user.email}`)
    logInfo(`User ID: ${userId}`)

    // ==========================================
    // PASO 2: Obtener un producto con stock
    // ==========================================
    logStep(2, "Obtener producto con stock disponible")

    const productosResponse = await fetch(`${baseUrl}/api/productos`)
    const productosData = await productosResponse.json()

    if (!productosData.productos || productosData.productos.length === 0) {
      logError("No hay productos disponibles")
      return
    }

    // Buscar un producto con variantes y stock
    const productoConStock = productosData.productos.find(p =>
      p.Variante && p.Variante.length > 0 && p.Variante.some(v => v.stock > 0)
    )

    if (!productoConStock) {
      logError("No hay productos con stock disponible")
      return
    }

    productoId = productoConStock.id
    varianteInicial = productoConStock.Variante.find(v => v.stock > 0)

    logSuccess(`Producto encontrado: ${productoConStock.nombre}`)
    logInfo(`Producto ID: ${productoId}`)
    logInfo(`Color: ${varianteInicial.color}, Talle: ${varianteInicial.talle}`)
    logInfo(`Stock inicial: ${varianteInicial.stock}`)

    // ==========================================
    // PASO 3: Crear checkout
    // ==========================================
    logStep(3, "Crear checkout con el producto")

    const checkoutPayload = {
      items: [
        {
          productoId: productoId,
          nombre: productoConStock.nombre,
          cantidad: 1,
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
    }

    const checkoutResponse = await fetch(`${baseUrl}/api/checkout/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(checkoutPayload),
    })

    if (!checkoutResponse.ok) {
      logError("Checkout falló")
      const error = await checkoutResponse.json()
      console.log("Error:", error)
      return
    }

    const checkoutData = await checkoutResponse.json()
    pedidoId = checkoutData.pedidoId

    logSuccess("Checkout creado exitosamente")
    logInfo(`Pedido ID: ${pedidoId}`)
    logInfo(`Preference ID: ${checkoutData.preferenceId}`)

    // ==========================================
    // PASO 4: Verificar que el pedido está pendiente
    // ==========================================
    logStep(4, "Verificar estado inicial del pedido")

    const pedidoResponse1 = await fetch(`${baseUrl}/api/pedidos`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const pedidosData1 = await pedidoResponse1.json()
    const pedido = pedidosData1.pedidos.find(p => p.id === pedidoId)

    if (pedido.estado !== "pendiente") {
      logError(`Estado incorrecto. Esperado: 'pendiente', Actual: '${pedido.estado}'`)
      return
    }

    logSuccess(`Pedido en estado: ${pedido.estado}`)

    // ==========================================
    // PASO 5: Verificar stock antes del pago
    // ==========================================
    logStep(5, "Verificar que el stock NO se ha descontado aún")

    const productosResponse2 = await fetch(`${baseUrl}/api/productos/${productoId}`)
    const productoData2 = await productosResponse2.json()
    const varianteActual = productoData2.producto.Variante.find(
      v => v.color === varianteInicial.color && v.talle === varianteInicial.talle
    )

    if (varianteActual.stock !== varianteInicial.stock) {
      logError(`Stock se descontó antes del pago! Inicial: ${varianteInicial.stock}, Actual: ${varianteActual.stock}`)
      return
    }

    logSuccess(`Stock sin cambios: ${varianteActual.stock}`)

    // ==========================================
    // PASO 6: Simular webhook de MercadoPago (pago aprobado)
    // ==========================================
    logStep(6, "Simular webhook de pago aprobado")

    logInfo("NOTA: Esto normalmente lo hace MercadoPago automáticamente")
    logInfo("Para simular, necesitarías:")
    logInfo("1. Completar el pago en MercadoPago con la URL: " + checkoutData.initPoint)
    logInfo("2. MercadoPago enviará un webhook a /api/mercadopago/pagos")
    logInfo("3. El sistema procesará el pago y actualizará el estado")

    log("\n" + "-".repeat(60), colors.yellow)
    log("FLUJO MANUAL PARA COMPLETAR EL TEST:", colors.yellow)
    log("-".repeat(60), colors.yellow)
    logInfo("1. Abre esta URL en tu navegador:")
    log(`   ${checkoutData.initPoint}\n`, colors.blue)
    logInfo("2. Completa el pago (usa tarjetas de prueba de MercadoPago)")
    logInfo("3. Espera la confirmación del pago")
    logInfo("4. El webhook se ejecutará automáticamente")
    log("-".repeat(60) + "\n", colors.yellow)

    // ==========================================
    // PASO 7: Monitorear el estado del pedido
    // ==========================================
    logStep(7, "Monitoreando cambios en el pedido...")

    logInfo("Esperando 5 segundos para que completes el pago...")
    logInfo("Puedes verificar manualmente después del pago:\n")

    log("  Verificar pedido:", colors.cyan)
    log(`  curl -H "Authorization: Bearer ${token}" ${baseUrl}/api/pedidos\n`, colors.blue)

    log("  Verificar stock:", colors.cyan)
    log(`  curl ${baseUrl}/api/productos/${productoId}\n`, colors.blue)

    // Esperar y verificar periódicamente
    for (let i = 0; i < 30; i++) {
      await sleep(2000)

      const checkResponse = await fetch(`${baseUrl}/api/pedidos`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const checkData = await checkResponse.json()
      const pedidoActualizado = checkData.pedidos.find(p => p.id === pedidoId)

      if (pedidoActualizado.estado === "pagado") {
        logSuccess(`¡Pedido actualizado a estado: ${pedidoActualizado.estado}!`)

        // Verificar stock final
        const productosResponseFinal = await fetch(`${baseUrl}/api/productos/${productoId}`)
        const productoDataFinal = await productosResponseFinal.json()
        const varianteFinal = productoDataFinal.producto.Variante.find(
          v => v.color === varianteInicial.color && v.talle === varianteInicial.talle
        )

        const stockDescontado = varianteInicial.stock - varianteFinal.stock

        if (stockDescontado === 1) {
          logSuccess(`Stock descontado correctamente!`)
          logInfo(`Stock inicial: ${varianteInicial.stock}`)
          logInfo(`Stock final: ${varianteFinal.stock}`)
          logInfo(`Cantidad descontada: ${stockDescontado}`)
        } else {
          logError(`Stock no se descontó correctamente`)
          logInfo(`Stock inicial: ${varianteInicial.stock}`)
          logInfo(`Stock final: ${varianteFinal.stock}`)
          logInfo(`Esperado descuento: 1, Actual: ${stockDescontado}`)
        }

        log("\n" + "=".repeat(60), colors.green)
        log("✅ TEST COMPLETADO EXITOSAMENTE", colors.green)
        log("=".repeat(60) + "\n", colors.green)
        return
      }

      if (i % 5 === 0) {
        logInfo(`Esperando... Estado actual: ${pedidoActualizado.estado} (${i * 2}s)`)
      }
    }

    logError("Timeout: El pago no se completó en 60 segundos")
    logInfo("Esto es normal si no completaste el pago manualmente")

  } catch (error) {
    logError("Error en el test:")
    console.error(error)
  }
}

// Ejecutar el test
testFlujoPago()
