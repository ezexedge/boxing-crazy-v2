import { Header } from "@/components/header"
import { CheckoutSuccessClient } from "@/components/checkout-success-client"

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ pedidoId?: string }>
}) {
  const params = await searchParams
  const pedidoId = params.pedidoId || null

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <CheckoutSuccessClient pedidoId={pedidoId} />
    </div>
  )
}
