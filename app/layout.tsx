import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/lib/auth-context"
import { CartProvider } from "@/lib/cart-context"
import { WhatsAppButton } from "@/components/whatsapp-button"
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Boxing Store - Tienda de Boxeo",
  description: "Tienda online de indumentaria para boxeo",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <AuthProvider>
          <CartProvider>
            {children}
            <WhatsAppButton />
            <Toaster />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
