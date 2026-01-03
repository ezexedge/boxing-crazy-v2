/**
 * Script para crear un usuario de prueba
 */

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

async function crearUsuarioPrueba() {
  try {
    console.log("Intentando crear usuario de prueba...")

    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@test.com",
        password: "123456",
        nombre: "Usuario",
        apellido: "Prueba",
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.log("Error:", error)
      console.log("\nIntentando login con usuario existente...")

      const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test@test.com",
          password: "123456",
        }),
      })

      if (loginResponse.ok) {
        const loginData = await loginResponse.json()
        console.log("✅ Usuario ya existe y el login funciona")
        console.log("Email:", loginData.user.email)
        console.log("Nombre:", loginData.user.nombre, loginData.user.apellido)
        console.log("Role:", loginData.user.role)
      } else {
        console.log("❌ Usuario no existe y no se pudo crear")
      }
      return
    }

    const data = await response.json()
    console.log("✅ Usuario creado exitosamente")
    console.log("Email:", data.user.email)
    console.log("Nombre:", data.user.nombre, data.user.apellido)
    console.log("Token generado:", data.token ? "Sí" : "No")
  } catch (error) {
    console.error("Error:", error)
  }
}

crearUsuarioPrueba()
