import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/lib/providers"
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
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          {children}
          <WhatsAppButton />
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
