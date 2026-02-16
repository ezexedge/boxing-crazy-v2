/**
 * Script de prueba para validar el flujo de validación de pedidos
 */

const BASE_URL = 'http://localhost:3000'

// Credenciales de prueba
const testUser = {
  email: 'test@example.com',
  password: 'Test1234!',
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function login() {
  console.log('🔐 Iniciando sesión...')
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser),
  })

  if (!response.ok) {
    throw new Error('Error al iniciar sesión')
  }

  const data = await response.json()
  console.log('✅ Sesión iniciada correctamente')
  return data.token
}

async function getPedidos(token) {
  console.log('\n📋 Obteniendo pedidos...')
  const response = await fetch(`${BASE_URL}/api/pedidos`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Error al obtener pedidos')
  }

  const data = await response.json()
  console.log(`📦 Total de pedidos: ${data.pedidos.length}`)

  // Mostrar resumen de pedidos
  data.pedidos.forEach((pedido, index) => {
    console.log(`  ${index + 1}. Pedido ${pedido.id.slice(0, 8)} - Estado: ${pedido.estado} - Total: $${pedido.total}`)
  })

  return data.pedidos
}

async function verifyPendingOrders(token, pedidos) {
  const pendientes = pedidos.filter(p => p.estado === 'pendiente')

  if (pendientes.length === 0) {
    console.log('\n✅ No hay pedidos pendientes para verificar')
    return
  }

  console.log(`\n🔍 Verificando ${pendientes.length} pedido(s) pendiente(s)...`)

  for (const pedido of pendientes) {
    console.log(`  Verificando pedido ${pedido.id.slice(0, 8)}...`)

    const response = await fetch(`${BASE_URL}/api/payment/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ pedidoId: pedido.id }),
    })

    if (response.ok) {
      const result = await response.json()
      console.log(`  ✅ Estado: ${result.status}`)

      if (result.status === 'pagado') {
        console.log(`  💰 Pedido pagado - Stock actualizado`)
      }
    } else {
      const error = await response.json()
      console.log(`  ❌ Error: ${error.error}`)
    }

    await sleep(500) // Pequeña pausa entre verificaciones
  }
}

async function checkStock(token, productoId, color, talle) {
  console.log(`\n📊 Verificando stock de producto ${productoId} (${color}, ${talle})...`)

  const response = await fetch(`${BASE_URL}/api/productos/${productoId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Error al obtener producto')
  }

  const producto = await response.json()
  const variante = producto.Variante?.find(v => v.color === color && v.talle === talle)

  if (variante) {
    console.log(`  Stock disponible: ${variante.stock} unidades`)
    return variante.stock
  } else {
    console.log('  ❌ Variante no encontrada')
    return 0
  }
}

async function main() {
  try {
    console.log('🚀 Iniciando prueba de validación de pedidos\n')
    console.log('='.repeat(60))

    // 1. Login
    const token = await login()

    // 2. Obtener pedidos
    const pedidos = await getPedidos(token)

    // 3. Verificar pedidos pendientes (simula lo que hace validateAllOrders)
    await verifyPendingOrders(token, pedidos)

    // 4. Obtener pedidos actualizados
    console.log('\n🔄 Obteniendo pedidos actualizados...')
    const pedidosActualizados = await getPedidos(token)

    // 5. Mostrar resumen final
    console.log('\n' + '='.repeat(60))
    console.log('📊 RESUMEN FINAL')
    console.log('='.repeat(60))

    const estadisticas = pedidosActualizados.reduce((acc, p) => {
      acc[p.estado] = (acc[p.estado] || 0) + 1
      return acc
    }, {})

    Object.entries(estadisticas).forEach(([estado, cantidad]) => {
      console.log(`  ${estado}: ${cantidad}`)
    })

    console.log('\n✅ Prueba completada exitosamente')
  } catch (error) {
    console.error('\n❌ Error en la prueba:', error.message)
    process.exit(1)
  }
}

main()
