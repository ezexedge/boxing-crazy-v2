const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testStockConsistency() {
  try {
    console.log('🔍 Verificando consistencia de stock...\n')

    // Obtener todos los productos con variantes
    const productos = await prisma.producto.findMany({
      include: {
        Variante: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    console.log(`📦 Total productos: ${productos.length}\n`)

    // Analizar cada producto
    for (const producto of productos) {
      const variantes = producto.Variante || []
      const totalVariantes = variantes.length
      const stockTotal = variantes.reduce((sum, v) => sum + v.stock, 0)
      const variantesConStock = variantes.filter(v => v.stock > 0).length

      // Lógica de product-card (página principal)
      const hasStockMainPage = variantes.some(v => v.stock > 0)

      // Lógica de product-details (página de producto)
      const hasStockDetailPage = stockTotal > 0

      const inconsistente = hasStockMainPage !== hasStockDetailPage

      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`📦 ${producto.nombre} (ID: ${producto.id})`)
      console.log(`   Total variantes: ${totalVariantes}`)
      console.log(`   Stock total: ${stockTotal}`)
      console.log(`   Variantes con stock: ${variantesConStock}`)
      console.log(`   `)
      console.log(`   Página principal dice: ${hasStockMainPage ? '✅ EN STOCK' : '❌ AGOTADO'}`)
      console.log(`   Página detalle dice: ${hasStockDetailPage ? '✅ EN STOCK' : '❌ AGOTADO'}`)

      if (inconsistente) {
        console.log(`   ⚠️  INCONSISTENCIA DETECTADA!`)
      } else {
        console.log(`   ✓ Consistente`)
      }

      // Mostrar detalles de variantes
      if (variantes.length > 0) {
        console.log(`   \n   Variantes:`)
        variantes.forEach(v => {
          console.log(`      - Color: ${v.color}, Talle: ${v.talle || 'N/A'}, Stock: ${v.stock}`)
        })
      }
      console.log('')
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ Análisis completado')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testStockConsistency()
