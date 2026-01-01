import type { Producto } from "@/lib/types"
import { Header } from "@/components/header"
import { getProductoById } from "@/app/actions"
import { ProductDetailsClient } from "@/components/product-details-client"
import { notFound } from "next/navigation"

export default async function ProductoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getProductoById(id)

  if (!result.success || !result.producto) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <ProductDetailsClient producto={result.producto as Producto} />
    </div>
  )
}