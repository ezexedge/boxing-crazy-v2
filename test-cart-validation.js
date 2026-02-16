/**
 * Script de prueba para validar el flujo completo de validación del carrito
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

async function testValidationFlow() {
  console.log("🧪 Iniciando prueba de validación de carrito...\n")

  // Test 1: Validar carrito vacío
  console.log("📝 Test 1: Validar carrito vacío")
  try {
    const response = await fetch(`${BASE_URL}/api/cart/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [] }),
    })

    const data = await response.json()
    console.log("✅ Resultado:", data)
    console.log(
      `   - validItems: ${data.validItems.length}, invalidItems: ${data.invalidItems.length}\n`
    )
  } catch (error) {
    console.error("❌ Error:", error.message, "\n")
  }

  // Test 2: Validar con un producto que no existe
  console.log("📝 Test 2: Validar producto inexistente")
  try {
    const response = await fetch(`${BASE_URL}/api/cart/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [
          {
            productoId: "producto-inexistente-123",
            nombre: "Producto Fantasma",
            cantidad: 1,
            precio: 1000,
            color: "#000000",
            talle: "M",
          },
        ],
      }),
    })

    const data = await response.json()
    console.log("✅ Resultado:")
    console.log(
      `   - validItems: ${data.validItems.length}, invalidItems: ${data.invalidItems.length}`
    )
    if (data.invalidItems.length > 0) {
      console.log("   - Razón:", data.invalidItems[0].reason)
      console.log("   - Mensaje:", data.invalidItems[0].message)
    }
    console.log()
  } catch (error) {
    console.error("❌ Error:", error.message, "\n")
  }

  // Test 3: Buscar un producto real de la DB para validar
  console.log("📝 Test 3: Buscar producto real en la base de datos")
  try {
    const productsResponse = await fetch(`${BASE_URL}/api/productos`)
    const productsData = await productsResponse.json()

    if (productsData.productos && productsData.productos.length > 0) {
      const producto = productsData.productos[0]
      console.log(`   - Producto encontrado: ${producto.nombre} (${producto.id})`)

      // Buscar variante con stock
      const variante = producto.Variante?.find((v) => v.stock > 0)

      if (variante) {
        console.log(
          `   - Variante con stock: ${variante.color} - ${variante.talle} (Stock: ${variante.stock})\n`
        )

        // Test 4: Validar producto real con stock suficiente
        console.log("📝 Test 4: Validar producto real con stock suficiente")
        const validResponse = await fetch(`${BASE_URL}/api/cart/validate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: [
              {
                productoId: producto.id,
                nombre: producto.nombre,
                cantidad: 1,
                precio: producto.precio,
                color: variante.color,
                talle: variante.talle,
              },
            ],
          }),
        })

        const validData = await validResponse.json()
        console.log("✅ Resultado:")
        console.log(
          `   - validItems: ${validData.validItems.length}, invalidItems: ${validData.invalidItems.length}\n`
        )

        // Test 5: Validar producto real con stock insuficiente
        console.log("📝 Test 5: Validar producto real con stock INSUFICIENTE")
        const insufficientResponse = await fetch(`${BASE_URL}/api/cart/validate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: [
              {
                productoId: producto.id,
                nombre: producto.nombre,
                cantidad: variante.stock + 100,
                precio: producto.precio,
                color: variante.color,
                talle: variante.talle,
              },
            ],
          }),
        })

        const insufficientData = await insufficientResponse.json()
        console.log("✅ Resultado:")
        console.log(
          `   - validItems: ${insufficientData.validItems.length}, invalidItems: ${insufficientData.invalidItems.length}`
        )
        if (insufficientData.invalidItems.length > 0) {
          console.log("   - Razón:", insufficientData.invalidItems[0].reason)
          console.log("   - Mensaje:", insufficientData.invalidItems[0].message)
          console.log(
            "   - Stock disponible:",
            insufficientData.invalidItems[0].stockDisponible
          )
        }
        console.log()
      } else {
        console.log("   ⚠️  No se encontraron variantes con stock\n")
      }
    } else {
      console.log("   ⚠️  No se encontraron productos en la base de datos\n")
    }
  } catch (error) {
    console.error("❌ Error:", error.message, "\n")
  }

  console.log("✨ Prueba de validación completada")
}

testValidationFlow().catch(console.error)
