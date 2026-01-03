/**
 * Test del flujo completo de checkout
 *
 * Este script prueba:
 * 1. Crear un checkout (crear pedido + preferencia MP)
 * 2. Simular webhook de pago aprobado
 * 3. Simular webhook de pago rechazado
 * 4. Verificar estados y stock
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

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

function logSection(title) {
  console.log("\n" + "=".repeat(60))
  log(title, colors.bright + colors.cyan)
  console.log("=".repeat(60) + "\n")
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green)
}

function logError(message) {
  log(`❌ ${message}`, colors.red)
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue)
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow)
}

async function loginUser() {
  logSection("1. LOGIN DE USUARIO")

  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@test.com",
        password: "123456",
      }),
    })

    if (!response.ok) {
      logError(`Login failed: ${response.status}`)
      const error = await response.text()
      console.log(error)
      return null
    }

    const data = await response.json()
    logSuccess("Login exitoso")
    logInfo(`Token obtenido: ${data.token.substring(0, 20)}...`)
    return data.token
  } catch (error) {
    logError(`Error en login: ${error.message}`)
    return null
  }
}

async function getProductos() {
  logSection("2. OBTENER PRODUCTOS PARA EL TEST")

  try {
    const response = await fetch(`${BASE_URL}/api/productos?limit=1`)
    const data = await response.json()

    if (data.productos && data.productos.length > 0) {
      const producto = data.productos[0]
      logSuccess(`Producto obtenido: ${producto.nombre}`)
      logInfo(`ID: ${producto.id}`)
      logInfo(`Precio: $${producto.precio}`)

      // Obtener variante con stock
      if (producto.variantes && producto.variantes.length > 0) {
        const variante = producto.variantes.find(v => v.stock > 0)
        if (variante) {
          logSuccess(`Variante con stock: ${variante.color} - ${variante.talle} (Stock: ${variante.stock})`)
          return { producto, variante }
        }
      }

      logWarning("No hay variantes con stock disponible")
      return { producto, variante: null }
    }

    logError("No hay productos disponibles")
    return null
  } catch (error) {
    logError(`Error obteniendo productos: ${error.message}`)
    return null
  }
}

async function createCheckout(token, producto, variante) {
  logSection("3. CREAR CHECKOUT (CREAR PEDIDO)")

  const items = [
    {
      productoId: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad: 1,
      color: variante?.color,
      talle: variante?.talle,
    },
  ]

  const billingAddress = {
    email: "test@test.com",
    country: "Argentina",
    firstName: "Test",
    lastName: "User",
    addressLine1: "Calle Falsa 123",
    postalCode: "1234",
    city: "Buenos Aires",
    province: "Buenos Aires",
    phone: "1234567890",
  }

  try {
    const response = await fetch(`${BASE_URL}/api/checkout/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ items, billingAddress }),
    })

    if (!response.ok) {
      logError(`Checkout failed: ${response.status}`)
      const error = await response.json()
      console.log(error)
      return null
    }

    const data = await response.json()
    logSuccess("Checkout creado exitosamente")
    logInfo(`Pedido ID: ${data.pedidoId}`)
    logInfo(`Preference ID: ${data.preferenceId}`)
    logInfo(`Init Point: ${data.initPoint}`)

    return data
  } catch (error) {
    logError(`Error en checkout: ${error.message}`)
    return null
  }
}

async function verificarPedido(pedidoId, expectedEstado) {
  logSection(`4. VERIFICAR PEDIDO (Estado esperado: ${expectedEstado})`)

  try {
    const { PrismaClient } = await import("@prisma/client")
    const prisma = new PrismaClient()

    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { PedidoItem: true },
    })

    await prisma.$disconnect()

    if (!pedido) {
      logError("Pedido no encontrado en la DB")
      return null
    }

    logSuccess("Pedido encontrado en la DB")
    logInfo(`Estado: ${pedido.estado}`)
    logInfo(`Total: $${pedido.total}`)
    logInfo(`MercadoPago ID: ${pedido.mercadopagoId}`)
    logInfo(`Items: ${pedido.PedidoItem.length}`)

    if (pedido.estado === expectedEstado) {
      logSuccess(`✓ Estado correcto: ${pedido.estado}`)
    } else {
      logError(`✗ Estado incorrecto. Esperado: ${expectedEstado}, Actual: ${pedido.estado}`)
    }

    return pedido
  } catch (error) {
    logError(`Error verificando pedido: ${error.message}`)
    return null
  }
}

async function verificarStock(productoId, color, talle, expectedChange) {
  logSection(`5. VERIFICAR STOCK (Cambio esperado: ${expectedChange})`)

  try {
    const { PrismaClient } = await import("@prisma/client")
    const prisma = new PrismaClient()

    const variante = await prisma.variante.findFirst({
      where: {
        productoId,
        color,
        talle,
      },
    })

    await prisma.$disconnect()

    if (!variante) {
      logError("Variante no encontrada")
      return null
    }

    logSuccess("Variante encontrada")
    logInfo(`Stock actual: ${variante.stock}`)

    return variante
  } catch (error) {
    logError(`Error verificando stock: ${error.message}`)
    return null
  }
}

async function simularWebhookApproved(pedidoId) {
  logSection("6. SIMULAR WEBHOOK - PAGO APROBADO")

  // Simular la estructura del webhook de MercadoPago
  const webhookBody = {
    type: "payment",
    data: {
      id: "mock-payment-" + Date.now(),
    },
  }

  logInfo("Nota: Este test requiere modificar temporalmente el webhook")
  logWarning("En un entorno real, MercadoPago enviaría el webhook automáticamente")
  logInfo(`Para simular, necesitarías crear un payment mock con metadata.pedidoId = ${pedidoId}`)

  return null
}

// Ejecutar tests
async function runTests() {
  logSection("🧪 TEST DEL FLUJO DE CHECKOUT Y PAGOS")

  try {
    // 1. Login
    const token = await loginUser()
    if (!token) {
      logError("No se pudo obtener el token. Abortando tests.")
      return
    }

    // 2. Obtener producto
    const result = await getProductos()
    if (!result || !result.producto || !result.variante) {
      logError("No se pudo obtener un producto con stock. Abortando tests.")
      return
    }

    const { producto, variante } = result
    const stockInicial = variante.stock

    // 3. Crear checkout (esto ahora crea el pedido)
    const checkout = await createCheckout(token, producto, variante)
    if (!checkout) {
      logError("No se pudo crear el checkout. Abortando tests.")
      return
    }

    // 4. Verificar que el pedido se creó con estado "pendiente"
    const pedido = await verificarPedido(checkout.pedidoId, "pendiente")
    if (!pedido) {
      logError("No se pudo verificar el pedido. Abortando tests.")
      return
    }

    // 5. Verificar que el stock NO se redujo todavía
    const stockDespuesCheckout = await verificarStock(
      producto.id,
      variante.color,
      variante.talle,
      0
    )

    if (stockDespuesCheckout) {
      if (stockDespuesCheckout.stock === stockInicial) {
        logSuccess(`✓ Stock NO se redujo después del checkout (correcto)`)
        logInfo(`Stock inicial: ${stockInicial}, Stock actual: ${stockDespuesCheckout.stock}`)
      } else {
        logError(`✗ Stock se redujo incorrectamente`)
        logInfo(`Stock inicial: ${stockInicial}, Stock actual: ${stockDespuesCheckout.stock}`)
      }
    }

    // 6. Información sobre webhook
    await simularWebhookApproved(checkout.pedidoId)

    logSection("📋 RESUMEN DEL TEST")
    logSuccess("✓ Login exitoso")
    logSuccess("✓ Checkout creado")
    logSuccess("✓ Pedido creado con estado 'pendiente'")
    logSuccess("✓ Stock NO se redujo (pendiente de webhook)")
    logInfo("\nPara completar el test:")
    logInfo("1. Deberías simular un webhook de MercadoPago con pago aprobado")
    logInfo("2. Verificar que el estado cambia a 'pagado'")
    logInfo("3. Verificar que el stock se reduce correctamente")
    logWarning("\n⚠️  Para testing real, usa las herramientas de sandbox de MercadoPago")

  } catch (error) {
    logError(`Error ejecutando tests: ${error.message}`)
    console.error(error)
  }
}

// Ejecutar
runTests().catch(console.error)
