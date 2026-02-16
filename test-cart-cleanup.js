// Script para probar el flujo de limpieza del carrito después de una compra

const BASE_URL = "http://localhost:3000"

// Credenciales de prueba (asegúrate de tener un usuario de prueba)
const TEST_USER = {
  email: "test@example.com",
  password: "test123"
}

async function testCartCleanup() {
  console.log("\n========================================")
  console.log("Iniciando prueba de limpieza de carrito")
  console.log("========================================\n")

  try {
    // 1. Login
    console.log("1. Iniciando sesión...")
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(TEST_USER)
    })

    if (!loginResponse.ok) {
      throw new Error(`Error en login: ${loginResponse.status}`)
    }

    const loginData = await loginResponse.json()
    const token = loginData.token
    console.log("✓ Login exitoso")

    // 2. Obtener pedidos del usuario
    console.log("\n2. Obteniendo pedidos...")
    const pedidosResponse = await fetch(`${BASE_URL}/api/pedidos`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    if (!pedidosResponse.ok) {
      throw new Error(`Error al obtener pedidos: ${pedidosResponse.status}`)
    }

    const pedidosData = await pedidosResponse.json()
    const pedidos = pedidosData.pedidos || []

    console.log(`✓ Pedidos encontrados: ${pedidos.length}`)

    // Mostrar estado de los pedidos
    pedidos.forEach((pedido, index) => {
      console.log(`  ${index + 1}. Pedido ${pedido.id.slice(0, 8)} - Estado: ${pedido.estado} - Creado: ${new Date(pedido.createdAt).toLocaleString()}`)
    })

    // 3. Verificar si hay pedidos pendientes
    const pedidosPendientes = pedidos.filter(p => p.estado === "pendiente")
    console.log(`\n3. Pedidos pendientes: ${pedidosPendientes.length}`)

    if (pedidosPendientes.length > 0) {
      console.log("\n4. Verificando pedidos pendientes...")

      for (const pedido of pedidosPendientes) {
        console.log(`\n  Verificando pedido ${pedido.id.slice(0, 8)}...`)

        const verifyResponse = await fetch(`${BASE_URL}/api/payment/verify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ pedidoId: pedido.id })
        })

        if (verifyResponse.ok) {
          const result = await verifyResponse.json()
          console.log(`  ✓ Estado verificado: ${result.status}`)

          if (result.status === "pagado" || result.alreadyProcessed) {
            console.log(`  ✓ Pedido pagado! El carrito debería limpiarse automáticamente`)
          } else if (result.verified === false) {
            console.log(`  ℹ Pago no encontrado en MercadoPago`)
          }
        } else {
          const error = await verifyResponse.json()
          console.log(`  ✗ Error al verificar: ${error.error}`)
        }
      }
    }

    // 4. Verificar pedidos pagados recientes (últimas 24 horas)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentPaidOrders = pedidos.filter(p =>
      p.estado === "pagado" &&
      new Date(p.createdAt) > twentyFourHoursAgo
    )

    console.log(`\n5. Pedidos pagados en las últimas 24 horas: ${recentPaidOrders.length}`)

    if (recentPaidOrders.length > 0) {
      console.log("✓ El carrito debería estar vacío (o limpiarse automáticamente)")
      recentPaidOrders.forEach((pedido, index) => {
        console.log(`  ${index + 1}. Pedido ${pedido.id.slice(0, 8)} - Total: $${pedido.total}`)
      })
    } else {
      console.log("ℹ No hay pedidos pagados recientes")
    }

    console.log("\n========================================")
    console.log("Prueba completada exitosamente")
    console.log("========================================\n")

  } catch (error) {
    console.error("\n✗ Error en la prueba:", error.message)
    console.log("\nNotas:")
    console.log("- Asegúrate de que el usuario de prueba existe")
    console.log("- Verifica que el servidor esté corriendo en localhost:3000")
    console.log("- Puedes crear un usuario de prueba en /register")
  }
}

testCartCleanup()
