"use client"

import { useEffect, useState } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { useAuthStore } from "@/lib/stores/auth-store"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface PedidoWithDetails {
  id: string
  total: number
  estado: string
  createdAt: string
  User: {
    nombre: string
    apellido: string
    email: string
  }
  PedidoItem: Array<{
    cantidad: number
    precio: number
    color?: string
    talle?: string
    Producto: {
      nombre: string
    }
  }>
}

export default function AdminPedidosPage() {
  const token = useAuthStore((state) => state.token)
  const [pedidos, setPedidos] = useState<PedidoWithDetails[]>([])

  useEffect(() => {
    fetchPedidos()
  }, [])

  const fetchPedidos = async () => {
    if (!token) return

    try {
      const { adminGetPedidos } = await import("@/app/actions/admin")
      const result = await adminGetPedidos(token)

      if (result.success && result.pedidos) {
        setPedidos(result.pedidos)
      }
    } catch (error) {
      console.error("[v0] Fetch pedidos error:", error)
    }
  }

  const handleStatusChange = async (pedidoId: string, newEstado: string) => {
    if (!token) return

    try {
      const { adminUpdatePedidoEstado } = await import("@/app/actions/admin")
      const result = await adminUpdatePedidoEstado(
        token,
        pedidoId,
        newEstado as "pendiente" | "pagado" | "enviado" | "entregado"
      )

      if (result.success) {
        fetchPedidos()
      }
    } catch (error) {
      console.error("[v0] Update pedido error:", error)
    }
  }

  return (
    <AdminLayout>
      <h1 className="text-3xl font-bold mb-8">Pedidos</h1>

      <div className="space-y-4">
        {pedidos.map((pedido) => (
          <div key={pedido.id} className="bg-white rounded-lg border p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-lg">Pedido #{pedido.id.slice(0, 8)}</h3>
                <p className="text-sm text-neutral-600">
                  {pedido.User.nombre} {pedido.User.apellido} - {pedido.User.email}
                </p>
                <p className="text-sm text-neutral-600">{new Date(pedido.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">${pedido.total.toLocaleString()}</p>
                <Select value={pedido.estado} onValueChange={(value) => handleStatusChange(pedido.id, value)}>
                  <SelectTrigger className="w-40 mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="pagado">Pagado</SelectItem>
                    <SelectItem value="enviado">Enviado</SelectItem>
                    <SelectItem value="entregado">Entregado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">Items:</h4>
              <div className="space-y-2">
                {pedido.PedidoItem.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>
                      {item.Producto.nombre} x {item.cantidad}
                      {item.color && ` - ${item.color}`}
                      {item.talle && ` - ${item.talle}`}
                    </span>
                    <span className="font-semibold">${(item.precio * item.cantidad).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  )
}
