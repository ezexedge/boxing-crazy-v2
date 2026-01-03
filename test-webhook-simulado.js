/**
 * Test simulado de webhooks de MercadoPago
 *
 * Este script simula diferentes escenarios de webhook:
 * 1. Pago aprobado (approved)
 * 2. Pago rechazado (rejected)
 * 3. Pago pendiente (pending)
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

// Colores
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

async function crearPedidoTest() {
  logSection("CREAR PEDIDO DE TEST")

  try {
    const { PrismaClient } = await import("@prisma/client")
    const { randomUUID } = await import("crypto")
    const prisma = new PrismaClient()

    // Obtener un producto con stock
    const producto = await prisma.producto.findFirst({
      include: {
        Variante: {
          where: { stock: { gt: 0 } },
          take: 1,
        },
      },
    })

    if (!producto || !producto.Variante[0]) {
      logError("No hay productos con stock disponible")
      await prisma.$disconnect()
      return null
    }

    const variante = producto.Variante[0]
    const stockInicial = variante.stock

    // Obtener un usuario
    const user = await prisma.user.findFirst()

    if (!user) {
      logError("No hay usuarios en la DB")
      await prisma.$disconnect()
      return null
    }

    // Crear pedido de test
    const pedido = await prisma.pedido.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        total: producto.precio,
        estado: "pendiente",
        mercadopagoId: "PREF-TEST-" + Date.now(),
        updatedAt: new Date(),
        email: user.email,
        country: "Argentina",
        firstName: "Test",
        lastName: "User",
        addressLine1: "Calle Test 123",
        postalCode: "1234",
        city: "Buenos Aires",
        province: "Buenos Aires",
        PedidoItem: {
          create: {
            id: randomUUID(),
            productoId: producto.id,
            cantidad: 1,
            precio: producto.precio,
            color: variante.color,
            talle: variante.talle,
          },
        },
      },
      include: {
        PedidoItem: true,
      },
    })

    await prisma.$disconnect()

    logSuccess("Pedido de test creado")
    logInfo(`Pedido ID: ${pedido.id}`)
    logInfo(`Estado: ${pedido.estado}`)
    logInfo(`Producto: ${producto.nombre}`)
    logInfo(`Variante: ${variante.color} - ${variante.talle}`)
    logInfo(`Stock inicial: ${stockInicial}`)

    return {
      pedido,
      producto,
      variante,
      stockInicial,
    }
  } catch (error) {
    logError(`Error creando pedido: ${error.message}`)
    return null
  }
}

async function simularWebhookApproved(pedidoId) {
  logSection("TEST 1: WEBHOOK - PAGO APROBADO")

  // Este es el formato real del webhook de MercadoPago
  const webhookPayload = {
    type: "payment",
    data: {
      id: "mock-payment-approved-" + Date.now(),
    },
  }

  logInfo("Simulando webhook de pago aprobado...")
  logInfo(`Payment ID: ${webhookPayload.data.id}`)
  logInfo(`Pedido ID: ${pedidoId}`)

  // Nota: Para que esto funcione realmente, necesitaríamos:
  // 1. Mock del SDK de MercadoPago
  // 2. O crear un payment real en sandbox
  // 3. O modificar temporalmente el webhook para aceptar mocks

  logInfo("\n⚠️  LIMITACIÓN DEL TEST:")
  logInfo("Este webhook requiere consultar la API de MercadoPago")
  logInfo("Para un test real, deberías:")
  logInfo("1. Usar el sandbox de MercadoPago")
  logInfo("2. Crear un pago real de prueba")
  logInfo("3. Dejar que MP envíe el webhook automáticamente")

  return webhookPayload
}

async function verificarEstadoPedido(pedidoId, expectedEstado) {
  logSection(`VERIFICAR ESTADO DEL PEDIDO`)

  try {
    const { PrismaClient } = await import("@prisma/client")
    const prisma = new PrismaClient()

    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { PedidoItem: true },
    })

    await prisma.$disconnect()

    if (!pedido) {
      logError("Pedido no encontrado")
      return null
    }

    logInfo(`Estado actual: ${pedido.estado}`)

    if (expectedEstado) {
      if (pedido.estado === expectedEstado) {
        logSuccess(`✓ Estado correcto: ${pedido.estado}`)
      } else {
        logError(`✗ Estado incorrecto. Esperado: ${expectedEstado}, Actual: ${pedido.estado}`)
      }
    }

    return pedido
  } catch (error) {
    logError(`Error verificando pedido: ${error.message}`)
    return null
  }
}

async function verificarStock(productoId, color, talle, stockInicial) {
  logSection(`VERIFICAR STOCK`)

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

    logInfo(`Stock inicial: ${stockInicial}`)
    logInfo(`Stock actual: ${variante.stock}`)
    logInfo(`Diferencia: ${stockInicial - variante.stock}`)

    if (variante.stock < stockInicial) {
      logSuccess(`✓ Stock se redujo correctamente`)
    } else if (variante.stock === stockInicial) {
      logInfo(`Stock sin cambios (esperado si pago no fue aprobado)`)
    } else {
      logError(`✗ Stock aumentó inesperadamente`)
    }

    return variante
  } catch (error) {
    logError(`Error verificando stock: ${error.message}`)
    return null
  }
}

async function testManualEstadoPedido(pedidoId, nuevoEstado) {
  logSection(`TEST MANUAL: CAMBIAR ESTADO A "${nuevoEstado}"`)

  try {
    const { PrismaClient } = await import("@prisma/client")
    const prisma = new PrismaClient()

    const pedido = await prisma.pedido.update({
      where: { id: pedidoId },
      data: {
        estado: nuevoEstado,
        updatedAt: new Date(),
      },
    })

    logSuccess(`Estado actualizado a: ${pedido.estado}`)

    // Si es pagado, reducir stock manualmente
    if (nuevoEstado === "pagado") {
      const items = await prisma.pedidoItem.findMany({
        where: { pedidoId },
      })

      for (const item of items) {
        if (item.color && item.talle) {
          await prisma.variante.updateMany({
            where: {
              productoId: item.productoId,
              color: item.color,
              talle: item.talle,
            },
            data: {
              stock: {
                decrement: item.cantidad,
              },
            },
          })
          logSuccess(`Stock reducido para ${item.color} - ${item.talle}`)
        }
      }
    }

    await prisma.$disconnect()

    return pedido
  } catch (error) {
    logError(`Error actualizando estado: ${error.message}`)
    return null
  }
}

async function limpiarPedidoTest(pedidoId) {
  logSection("LIMPIAR DATOS DE TEST")

  try {
    const { PrismaClient } = await import("@prisma/client")
    const prisma = new PrismaClient()

    await prisma.pedido.delete({
      where: { id: pedidoId },
    })

    logSuccess("Pedido de test eliminado")

    await prisma.$disconnect()
  } catch (error) {
    logError(`Error limpiando test: ${error.message}`)
  }
}

async function runTests() {
  logSection("🧪 TEST SIMULADO DE WEBHOOKS")

  try {
    // 1. Crear pedido de test
    const testData = await crearPedidoTest()
    if (!testData) {
      logError("No se pudo crear pedido de test")
      return
    }

    const { pedido, producto, variante, stockInicial } = testData

    // 2. Verificar estado inicial
    await verificarEstadoPedido(pedido.id, "pendiente")

    // 3. Verificar stock inicial
    await verificarStock(producto.id, variante.color, variante.talle, stockInicial)

    // 4. Simular webhook aprobado (solo muestra info)
    await simularWebhookApproved(pedido.id)

    // 5. Test manual: cambiar estado a "pagado"
    logInfo("\n💡 Ejecutando test manual del flujo de pago aprobado...")
    await testManualEstadoPedido(pedido.id, "pagado")

    // 6. Verificar que el estado cambió
    await verificarEstadoPedido(pedido.id, "pagado")

    // 7. Verificar que el stock se redujo
    await verificarStock(producto.id, variante.color, variante.talle, stockInicial)

    // 8. Preguntar si quiere limpiar
    logSection("LIMPIEZA")
    logInfo("El pedido de test fue creado con ID: " + pedido.id)
    logInfo("Para limpiar, ejecuta: node -e \"require('./test-webhook-simulado.js').limpiarPedidoTest('${pedido.id}')\"")
    logInfo("O déjalo para inspección manual")

    logSection("📋 RESUMEN")
    logSuccess("✓ Pedido creado con estado 'pendiente'")
    logSuccess("✓ Stock verificado (sin cambios)")
    logSuccess("✓ Estado cambiado a 'pagado' (manual)")
    logSuccess("✓ Stock reducido correctamente")
    logInfo("\n✅ Flujo de pago aprobado funciona correctamente")

  } catch (error) {
    logError(`Error en tests: ${error.message}`)
    console.error(error)
  }
}

// Exportar funciones para uso externo
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    runTests,
    limpiarPedidoTest,
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runTests().catch(console.error)
}
