"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { useCartStore } from "@/lib/stores/cart-store"
import { useAuthStore } from "@/lib/stores/auth-store"
import { Trash2, Minus, Plus, AlertCircle } from "lucide-react"

export default function CarritoPage() {
  const router = useRouter()
  const items = useCartStore((state) => state.items)
  const invalidItems = useCartStore((state) => state.invalidItems)
  const removeItem = useCartStore((state) => state.removeItem)
  const updateQuantity = useCartStore((state) => state.updateQuantity)
  const validateCartItems = useCartStore((state) => state.validateCartItems)
  const total = useCartStore((state) => state.total())
  const user = useAuthStore((state) => state.user)

  const handleCheckout = async () => {
    if (!user) {
      router.push("/login?redirect=/carrito")
      return
    }

    // Validar carrito antes de proceder
    await validateCartItems()

    // Si hay items inválidos después de la validación, no permitir checkout
    const currentInvalidItems = useCartStore.getState().invalidItems
    if (currentInvalidItems.length > 0) {
      return
    }

    router.push("/checkout")
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8">Carrito de Compras</h1>
          <div className="text-center py-12">
            <p className="text-neutral-600 mb-4">Tu carrito está vacío</p>
            <Button asChild>
              <Link href="/">Continuar Comprando</Link>
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Carrito de Compras</h1>

        {/* Mostrar alertas de items inválidos */}
        {invalidItems.length > 0 && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-2">
                  Se encontraron problemas con {invalidItems.length} producto(s)
                </h3>
                <ul className="space-y-1 text-sm text-red-800">
                  {invalidItems.map((item, index) => (
                    <li key={index}>
                      <strong>{item.nombre}</strong>
                      {item.color && ` - ${item.color}`}
                      {item.talle && ` - ${item.talle}`}: {item.message}
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-red-700 mt-2">
                  Estos productos han sido removidos automáticamente de tu carrito.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={`${item.productoId}-${item.color}-${item.talle}`} className="flex gap-4 p-4 border rounded-lg">
                <div className="relative w-24 h-24 bg-neutral-100 rounded-lg overflow-hidden flex-shrink-0">
                  <Image src={item.imagen || "/placeholder.svg"} alt={item.nombre} fill className="object-cover" />
                </div>

                <div className="flex-1">
                  <h3 className="font-semibold mb-1">{item.nombre}</h3>
                  {item.color && <p className="text-sm text-neutral-600">Color: {item.color}</p>}
                  {item.talle && <p className="text-sm text-neutral-600">Talle: {item.talle}</p>}
                  <p className="font-bold mt-2">${item.precio.toLocaleString()}</p>
                </div>

                <div className="flex flex-col items-end justify-between">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.productoId, item.color, item.talle)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 bg-transparent"
                      onClick={() => updateQuantity(item.productoId, item.cantidad - 1, item.color, item.talle)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center font-semibold">{item.cantidad}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 bg-transparent"
                      onClick={() => updateQuantity(item.productoId, item.cantidad + 1, item.color, item.talle)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="border rounded-lg p-6 sticky top-24">
              <h2 className="text-xl font-bold mb-4">Resumen del Pedido</h2>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Subtotal</span>
                  <span className="font-semibold">${total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Envío</span>
                  <span className="font-semibold">A calcular</span>
                </div>
              </div>

              <div className="border-t pt-4 mb-6">
                <div className="flex justify-between text-lg">
                  <span className="font-bold">Total</span>
                  <span className="font-bold">${total.toLocaleString()}</span>
                </div>
              </div>

              <Button className="w-full" size="lg" onClick={handleCheckout}>
                Proceder al Pago
              </Button>

              <Button variant="outline" className="w-full mt-2 bg-transparent" asChild>
                <Link href="/">Continuar Comprando</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
