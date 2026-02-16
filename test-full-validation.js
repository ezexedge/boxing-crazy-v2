const BASE_URL = "http://localhost:3000"

const adminUser = {
  email: "admin@admin.com",
  password: "Admin123!",
}

async function loginAdmin() {
  console.log("🔐 Iniciando sesión como admin...")
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(adminUser),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Error al iniciar sesión: ${error.error}`)
  }

  const data = await response.json()
  console.log("✅ Sesión iniciada correctamente\n")
  return data.token
}

async function createTestProduct(token) {
  console.log("📦 Creando producto de prueba...")

  const productData = {
    nombre: "Remera Test Validación",
    descripcion: "Producto para probar validación de stock",
    precio: 5000,
    categoria: "remeras",
    genero: "hombre",
    imagenes: ["https://via.placeholder.com/300"],
    imagenPortada: "https://via.placeholder.com/300",
    variantes: [
      { color: "#FF0000", talle: "M", stock: 5 },
      { color: "#0000FF", talle: "L", stock: 0 },
    ],
  }

  const response = await fetch(`${BASE_URL}/api/admin/productos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(productData),
  })

  if (!response.ok) {
    throw new Error("Error al crear producto")
  }

  const data = await response.json()
  console.log(`✅ Producto creado: ${data.producto.id}\n`)
  return data.producto
}

async function testCartValidation(producto) {
  console.log("🧪 Probando validación de carrito...\n")

  const variante = producto.Variante[0]

  console.log("📝 Test 1: Validar con cantidad dentro del stock (2 unidades)")
  let response = await fetch(`${BASE_URL}/api/cart/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [
        {
          productoId: producto.id,
          nombre: producto.nombre,
          cantidad: 2,
          precio: producto.precio,
          color: variante.color,
          talle: variante.talle,
        },
      ],
    }),
  })

  let data = await response.json()
  console.log("   ✅ Items válidos:", data.validItems.length)
  console.log("   ❌ Items inválidos:", data.invalidItems.length, "\n")

  console.log("📝 Test 2: Validar con cantidad mayor al stock (10 unidades)")
  response = await fetch(`${BASE_URL}/api/cart/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [
        {
          productoId: producto.id,
          nombre: producto.nombre,
          cantidad: 10,
          precio: producto.precio,
          color: variante.color,
          talle: variante.talle,
        },
      ],
    }),
  })

  data = await response.json()
  console.log("   ✅ Items válidos:", data.validItems.length)
  console.log("   ❌ Items inválidos:", data.invalidItems.length)
  if (data.invalidItems.length > 0) {
    console.log("   📋 Razón:", data.invalidItems[0].reason)
    console.log("   💬 Mensaje:", data.invalidItems[0].message)
  }
  console.log()

  console.log("📝 Test 3: Validar variante sin stock (Azul, L)")
  const varianteSinStock = producto.Variante[1]
  response = await fetch(`${BASE_URL}/api/cart/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [
        {
          productoId: producto.id,
          nombre: producto.nombre,
          cantidad: 1,
          precio: producto.precio,
          color: varianteSinStock.color,
          talle: varianteSinStock.talle,
        },
      ],
    }),
  })

  data = await response.json()
  console.log("   ✅ Items válidos:", data.validItems.length)
  console.log("   ❌ Items inválidos:", data.invalidItems.length)
  if (data.invalidItems.length > 0) {
    console.log("   📋 Razón:", data.invalidItems[0].reason)
    console.log("   💬 Mensaje:", data.invalidItems[0].message)
  }
  console.log()
}

async function testProductDeletion(token, producto) {
  console.log("📝 Test 4: Validar producto después de eliminarlo")
  
  // Eliminar el producto
  console.log("   🗑️  Eliminando producto...")
  await fetch(`${BASE_URL}/api/admin/productos/${producto.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  })
  console.log("   ✅ Producto eliminado")

  // Intentar validar con el producto eliminado
  const variante = producto.Variante[0]
  const response = await fetch(`${BASE_URL}/api/cart/validate`, {
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

  const data = await response.json()
  console.log("   ✅ Items válidos:", data.validItems.length)
  console.log("   ❌ Items inválidos:", data.invalidItems.length)
  if (data.invalidItems.length > 0) {
    console.log("   📋 Razón:", data.invalidItems[0].reason)
    console.log("   💬 Mensaje:", data.invalidItems[0].message)
  }
  console.log()
}

async function main() {
  try {
    console.log("🚀 Iniciando prueba completa de validación\n")
    console.log("=".repeat(60))

    const token = await loginAdmin()
    const producto = await createTestProduct(token)
    await testCartValidation(producto)
    await testProductDeletion(token, producto)

    console.log("=".repeat(60))
    console.log("✨ Prueba completada exitosamente\n")
  } catch (error) {
    console.error("\n❌ Error:", error.message)
    process.exit(1)
  }
}

main()
