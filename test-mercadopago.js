const { MercadoPagoConfig, Preference } = require("mercadopago")

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || "",
})

async function testPreference() {
  try {
    console.log("Testing MercadoPago Preference creation...")

    // Test 1: Minimal configuration
    const preferenceData = {
      items: [
        {
          id: "test-product",
          title: "Test Product",
          quantity: 1,
          unit_price: 100,
          currency_id: "ARS",
        },
      ],
    }

    console.log("Preference data:", JSON.stringify(preferenceData, null, 2))

    const preference = await new Preference(client).create({ body: preferenceData })

    console.log("✅ Preference created successfully!")
    console.log("Preference ID:", preference.id)
    console.log("Init Point:", preference.init_point)
  } catch (error) {
    console.error("❌ Error creating preference:", error)
    if (error.cause) {
      console.error("Cause:", error.cause)
    }
  }
}

testPreference()
