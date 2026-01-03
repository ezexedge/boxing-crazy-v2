// Script para probar el webhook de Mercado Pago localmente
const BASE_URL = "http://localhost:3000"

// Simula un webhook de Mercado Pago
async function testWebhook() {
  const webhookData = {
    type: "payment",
    data: {
      id: "1234567890"
    }
  }

  console.log("🚀 Enviando webhook a:", `${BASE_URL}/api/mercadopago/pagos`)
  console.log("📦 Datos:", JSON.stringify(webhookData, null, 2))

  try {
    const response = await fetch(`${BASE_URL}/api/mercadopago/pagos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(webhookData),
    })

    console.log("✅ Status:", response.status)
    console.log("📄 Status Text:", response.statusText)

    const text = await response.text()
    console.log("📝 Response:", text || "(empty response)")

    if (response.status === 200) {
      console.log("\n✨ Webhook procesado correctamente")
    } else {
      console.log("\n⚠️ Webhook retornó un status inesperado")
    }
  } catch (error) {
    console.error("❌ Error:", error.message)
  }
}

testWebhook()
