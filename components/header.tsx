"use client"

import Link from "next/link"
import { ShoppingCart, User, LogOut, Package } from "lucide-react"
import { useAuthStore } from "@/lib/stores/auth-store"
import { useCartStore } from "@/lib/stores/cart-store"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { SearchBar } from "@/components/search-bar"

const CATEGORIAS_HOMBRE = ["remeras", "shorts", "buzos"]
const CATEGORIAS_MUJER = ["tops", "shorts", "buzos"]

export function Header() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const items = useCartStore((state) => state.items)

  const totalItems = items.reduce((sum, item) => sum + item.cantidad, 0)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/" className="text-xl font-bold text-neutral-900 flex-shrink-0">
            Boxing Store
          </Link>

          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <SearchBar />
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost">Hombre</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {CATEGORIAS_HOMBRE.map((categoria) => (
                  <DropdownMenuItem key={categoria} asChild>
                    <Link href={`/?genero=hombre&categoria=${categoria}`}>
                      {categoria.charAt(0).toUpperCase() + categoria.slice(1)}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost">Mujer</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {CATEGORIAS_MUJER.map((categoria) => (
                  <DropdownMenuItem key={categoria} asChild>
                    <Link href={`/?genero=mujer&categoria=${categoria}`}>
                      {categoria.charAt(0).toUpperCase() + categoria.slice(1)}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/carrito" className="relative">
              <Button variant="ghost" size="icon">
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-neutral-900 text-white text-xs flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Button>
            </Link>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled>
                    <div className="flex flex-col">
                      <span className="font-medium">{user.nombre}</span>
                      <span className="text-xs text-neutral-500">{user.email}</span>
                    </div>
                  </DropdownMenuItem>
                  {user.role !== "admin" && (
                    <DropdownMenuItem asChild>
                      <Link href="/mis-pedidos">
                        <Package className="mr-2 h-4 w-4" />
                        Mis Pedidos
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {user.role === "admin" && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin">Panel Admin</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild variant="default">
                <Link href="/login">Iniciar Sesión</Link>
              </Button>
            )}
          </div>
        </div>

        <div className="md:hidden pb-3">
          <SearchBar />
        </div>
      </div>
    </header>
  )
}
