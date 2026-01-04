"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, RefreshCw, CreditCard } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Header } from "@/components/header"

interface PedidoItem {
  id: string
  cantidad: number
  precio: number
  color?: string
  talle?: string
  Producto: {
    id: string
    nombre: string
    imagenPortada?: string
  }
}

interface Pedido {
  id: string
  total: number
  estado: string
  createdAt: string
  email: string
  addressLine1: string
  city: string
  province: string
  PedidoItem: PedidoItem[]
}

const estadoConfig = {
  pendiente: { label: "Pendiente", color: "bg-yellow-500" },
  pagado: { label: "Pagado", color: "bg-green-500" },
  procesando: { label: "Procesando", color: "bg-blue-500" },
  enviado: { label: "Enviado", color: "bg-purple-500" },
  entregado: { label: "Entregado", color: "bg-green-600" },
  cancelado: { label: "Cancelado", color: "bg-red-500" },
  fallido: { label: "Fallido", color: "bg-red-600" },
}

export default function MisPedidosPage() {
  const { user, token, isLoading } = useAuth()
  const router = useRouter()
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [retryingPayment, setRetryingPayment] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login?redirect=/mis-pedidos")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (token && user) {
      fetchPedidos()
    }
  }, [token, user])

  const fetchPedidos = async () => {
    try {
      const response = await fetch("/api/pedidos", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPedidos(data.pedidos)
      }
    } catch (error) {
      console.error("Error al cargar pedidos:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRetryPayment = async (pedidoId: string) => {
    setRetryingPayment(pedidoId)
    try {
      const response = await fetch(`/api/pedidos/${pedidoId}/retry-payment`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al reintentar el pago")
      }

      const data = await response.json()
      // Redirigir a MercadoPago
      window.location.href = data.initPoint
    } catch (error) {
      console.error("Error al reintentar pago:", error)
      alert(error instanceof Error ? error.message : "Error al reintentar el pago")
      setRetryingPayment(null)
    }
  }

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a la Tienda
            </Link>
          </Button>
          <h1 className="text-3xl font-bold mb-2">Mis Pedidos</h1>
          <p className="text-gray-600">Consulta el estado de tus compras</p>
        </div>

        {pedidos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600 mb-4">No tienes pedidos todavía</p>
              <Button asChild>
                <Link href="/">Ir a la tienda</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {pedidos.map((pedido) => {
              const estadoInfo = estadoConfig[pedido.estado as keyof typeof estadoConfig] || {
                label: pedido.estado,
                color: "bg-gray-500",
              }

              return (
                <Card key={pedido.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">Pedido #{pedido.id.slice(0, 8)}</CardTitle>
                        <CardDescription>
                          {new Date(pedido.createdAt).toLocaleDateString("es-AR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </CardDescription>
                      </div>
                      <Badge className={`${estadoInfo.color} text-white`}>{estadoInfo.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Productos */}
                      <div className="space-y-3">
                        {pedido.PedidoItem.map((item) => (
                          <div key={item.id} className="flex gap-4 border-b pb-3 last:border-0">
                            <div className="relative w-20 h-20 bg-gray-100 rounded">
                              {item.Producto.imagenPortada && (
                                <Image
                                  src={item.Producto.imagenPortada}
                                  alt={item.Producto.nombre}
                                  fill
                                  className="object-cover rounded"
                                />
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium">{item.Producto.nombre}</h4>
                              <div className="text-sm text-gray-600 space-y-1">
                                {item.color && <p>Color: {item.color}</p>}
                                {item.talle && <p>Talle: {item.talle}</p>}
                                <p>Cantidad: {item.cantidad}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">${item.precio.toFixed(2)}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Información de envío */}
                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-2">Dirección de envío</h4>
                        <p className="text-sm text-gray-600">
                          {pedido.addressLine1}
                          <br />
                          {pedido.city}, {pedido.province}
                        </p>
                      </div>

                      {/* Total */}
                      <div className="border-t pt-4 flex justify-between items-center">
                        <span className="font-semibold">Total:</span>
                        <span className="text-xl font-bold">${pedido.total.toFixed(2)}</span>
                      </div>

                      {/* Botones de acción según el estado */}
                      {(pedido.estado === "fallido" || pedido.estado === "cancelado") && (
                        <div className="border-t pt-4 space-y-2">
                          <p className="text-sm text-gray-600 mb-3">
                            {pedido.estado === "fallido"
                              ? "Tu pago no pudo ser procesado. Puedes intentar nuevamente."
                              : "Este pedido fue cancelado. Puedes realizar un nuevo pedido."}
                          </p>
                          <Button
                            className="w-full bg-[#009EE3] hover:bg-[#0082BE] text-white"
                            onClick={() => handleRetryPayment(pedido.id)}
                            disabled={retryingPayment === pedido.id}
                          >
                            {retryingPayment === pedido.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Redireccionando...
                              </>
                            ) : (
                              <span className="flex items-center justify-center">
                                Pagar con
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
                          <Button variant="outline" className="w-full bg-transparent" asChild>
                            <Link href="/">
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Volver a la Tienda
                            </Link>
                          </Button>
                        </div>
                      )}

                      {pedido.estado === "pendiente" && (
                        <div className="border-t pt-4 space-y-2">
                          <p className="text-sm text-gray-600 mb-3">
                            Tu pedido está esperando el pago. Completa el pago para procesar tu orden.
                          </p>
                          <Button
                            className="w-full bg-[#009EE3] hover:bg-[#0082BE] text-white"
                            onClick={() => handleRetryPayment(pedido.id)}
                            disabled={retryingPayment === pedido.id}
                          >
                            {retryingPayment === pedido.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Redireccionando...
                              </>
                            ) : (
                              <span className="flex items-center justify-center">
                                Pagar con
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
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
