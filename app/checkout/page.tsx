"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCart } from "@/lib/cart-context"
import { useAuth } from "@/lib/auth-context"
import { Loader2 } from "lucide-react"
import { billingAddressSchema, type BillingAddress } from "@/lib/validations/billing"

export default function CheckoutPage() {
  const router = useRouter()
  const { items, total, clearCart } = useCart()
  const { user, token } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState<BillingAddress>({
    email: "",
    country: "Argentina",
    firstName: "",
    lastName: "",
    company: "",
    addressLine1: "",
    addressLine2: "",
    postalCode: "",
    city: "",
    province: "",
    phone: "",
  })

  // Check if form is valid
  const isFormValid = () => {
    return (
      formData.email.trim() !== "" &&
      formData.firstName.trim() !== "" &&
      formData.lastName.trim() !== "" &&
      formData.addressLine1.trim() !== "" &&
      formData.postalCode.trim() !== "" &&
      formData.city.trim() !== "" &&
      formData.province.trim() !== ""
    )
  }

  useEffect(() => {
    if (!user) {
      router.push("/login?redirect=/checkout")
      return
    }

    // Don't redirect if loading (to avoid showing empty cart during MercadoPago redirect)
    if (items.length === 0 && !isLoading) {
      router.push("/carrito")
      return
    }

    // Pre-fill email if user is logged in
    if (user.email) {
      setFormData((prev) => ({ ...prev, email: user.email }))
    }
  }, [user, items, router, isLoading])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validateForm = (): boolean => {
    try {
      billingAddressSchema.parse(formData)
      setValidationErrors({})
      return true
    } catch (err: any) {
      const errors: Record<string, string> = {}
      err.errors?.forEach((error: any) => {
        const field = error.path[0]
        errors[field] = error.message
      })
      setValidationErrors(errors)
      return false
    }
  }

  const handleCheckout = async () => {
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/checkout/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items, billingAddress: formData }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("[Checkout] Backend validation errors:", errorData.details)
        throw new Error(errorData.error || "Error al crear el checkout")
      }

      const data = await response.json()

      // Redirect to MercadoPago (cart will be cleared after successful payment)
      // DO NOT clear cart here to avoid showing "empty cart" during redirect
      window.location.href = data.initPoint
    } catch (err: any) {
      console.error("Checkout error:", err)
      setError(err.message || "Error al procesar el pago. Por favor intenta nuevamente.")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Finalizar Compra</h1>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Billing Form */}
            <div className="space-y-6">
              <div className="border rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Información de Contacto</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={validationErrors.email ? "border-red-500" : ""}
                    />
                    {validationErrors.email && (
                      <p className="text-sm text-red-600 mt-1">{validationErrors.email}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Dirección de Envío</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">Nombre *</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className={validationErrors.firstName ? "border-red-500" : ""}
                      />
                      {validationErrors.firstName && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.firstName}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="lastName">Apellido *</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className={validationErrors.lastName ? "border-red-500" : ""}
                      />
                      {validationErrors.lastName && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.lastName}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="company">Empresa (opcional)</Label>
                    <Input
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      className={validationErrors.company ? "border-red-500" : ""}
                    />
                    {validationErrors.company && (
                      <p className="text-sm text-red-600 mt-1">{validationErrors.company}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="country">País / Región *</Label>
                    <Input
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      className={validationErrors.country ? "border-red-500" : ""}
                    />
                    {validationErrors.country && (
                      <p className="text-sm text-red-600 mt-1">{validationErrors.country}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="addressLine1">Dirección *</Label>
                    <Input
                      id="addressLine1"
                      name="addressLine1"
                      placeholder="Calle y número"
                      value={formData.addressLine1}
                      onChange={handleInputChange}
                      className={validationErrors.addressLine1 ? "border-red-500" : ""}
                    />
                    {validationErrors.addressLine1 && (
                      <p className="text-sm text-red-600 mt-1">{validationErrors.addressLine1}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="addressLine2">Casa, depto, piso (opcional)</Label>
                    <Input
                      id="addressLine2"
                      name="addressLine2"
                      value={formData.addressLine2}
                      onChange={handleInputChange}
                      className={validationErrors.addressLine2 ? "border-red-500" : ""}
                    />
                    {validationErrors.addressLine2 && (
                      <p className="text-sm text-red-600 mt-1">{validationErrors.addressLine2}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="postalCode">Código Postal *</Label>
                      <Input
                        id="postalCode"
                        name="postalCode"
                        value={formData.postalCode}
                        onChange={handleInputChange}
                        className={validationErrors.postalCode ? "border-red-500" : ""}
                      />
                      {validationErrors.postalCode && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.postalCode}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="city">Ciudad *</Label>
                      <Input
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className={validationErrors.city ? "border-red-500" : ""}
                      />
                      {validationErrors.city && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.city}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="province">Provincia / Estado *</Label>
                    <Input
                      id="province"
                      name="province"
                      value={formData.province}
                      onChange={handleInputChange}
                      className={validationErrors.province ? "border-red-500" : ""}
                    />
                    {validationErrors.province && (
                      <p className="text-sm text-red-600 mt-1">{validationErrors.province}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="phone">Teléfono (opcional)</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+54 9 11 1234-5678"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={validationErrors.phone ? "border-red-500" : ""}
                    />
                    {validationErrors.phone && (
                      <p className="text-sm text-red-600 mt-1">{validationErrors.phone}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div>
              <div className="border rounded-lg p-6 sticky top-24">
                <h2 className="text-xl font-semibold mb-4">Resumen del Pedido</h2>
                <div className="space-y-2 mb-4">
                  {items.map((item) => (
                    <div key={`${item.productoId}-${item.color}-${item.talle}`} className="flex justify-between text-sm">
                      <span className="text-neutral-600">
                        {item.nombre} x {item.cantidad}
                        {item.color && ` - ${item.color}`}
                        {item.talle && ` - ${item.talle}`}
                      </span>
                      <span className="font-semibold">${(item.precio * item.cantidad).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-4 mb-6">
                  <div className="flex justify-between text-xl font-bold">
                    <span>Total</span>
                    <span>${total.toLocaleString()}</span>
                  </div>
                </div>

                {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4 text-sm">{error}</div>}

                <Button
                  className="w-full bg-[#009EE3] hover:bg-[#0082BE] text-white"
                  size="lg"
                  onClick={handleCheckout}
                  disabled={isLoading || !isFormValid()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Redireccionando a MercadoPago...
                    </>
                  ) : (
                    <span className="flex items-center justify-center">
                      Proceder a pagar con
                      <Image
                        src="/mp-logo.svg"
                        alt="MercadoPago"
                        width={100}
                        height={24}
                        className="ml-2"
                      />
                    </span>
                  )}
                </Button>

                <p className="text-xs text-neutral-500 mt-4 text-center">
                  Al confirmar el pago, aceptas nuestros términos y condiciones
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
