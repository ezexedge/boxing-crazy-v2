import { Header } from "@/components/header"
import { CheckoutFailureClient } from "@/components/checkout-failure-client"

export default async function CheckoutFailurePage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <CheckoutFailureClient />
    </div>
  )
}
