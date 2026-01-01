"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"

interface Producto {
  id: string
  nombre: string
  precio: number
  imagenPortada: string | null
  imagenes: string[]
  variantes: Array<{ stock: number }>
}

export function SearchBar() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Producto[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const searchProducts = async () => {
      if (query.trim().length < 2) {
        setResults([])
        setIsOpen(false)
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch(`/api/productos/search?q=${encodeURIComponent(query)}`)
        const data = await response.json()
        setResults(data.productos || [])
        setIsOpen(true)
      } catch (error) {
        console.error("Error searching products:", error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }

    const debounce = setTimeout(searchProducts, 300)
    return () => clearTimeout(debounce)
  }, [query])

  const clearSearch = () => {
    setQuery("")
    setResults([])
    setIsOpen(false)
  }

  const getTotalStock = (producto: Producto) => {
    return producto.Variante.reduce((sum, v) => sum + v.stock, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim().length >= 2) {
      setIsOpen(false)
      router.push(`/buscar?q=${encodeURIComponent(query)}`)
    }
  }

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
        <Input
          type="text"
          placeholder="Buscar productos..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={clearSearch}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full mt-2 w-full bg-white border rounded-lg shadow-lg max-h-96 overflow-y-auto z-[60]">
          {isLoading ? (
            <div className="p-4 text-center text-neutral-500">Buscando...</div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((producto) => (
                <Link
                  key={producto.id}
                  href={`/producto/${producto.id}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors"
                >
                  <div className="relative w-12 h-12 flex-shrink-0 bg-neutral-100 rounded">
                    <Image
                      src={producto.imagenPortada || producto.imagenes[0] || "/placeholder.svg"}
                      alt={producto.nombre}
                      fill
                      className="object-cover rounded"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{producto.nombre}</p>
                    <p className="text-sm text-neutral-600">${producto.precio.toLocaleString()}</p>
                  </div>
                  <div className="text-xs text-neutral-500">
                    {getTotalStock(producto) > 0 ? (
                      <span className="text-green-600">En stock</span>
                    ) : (
                      <span className="text-red-600">Sin stock</span>
                    )}
                  </div>
                </Link>
              ))}
              {results.length >= 5 && (
                <Link
                  href={`/buscar?q=${encodeURIComponent(query)}`}
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 text-center text-sm font-medium text-blue-600 hover:bg-neutral-50 border-t"
                >
                  Ver todos los resultados
                </Link>
              )}
            </div>
          ) : (
            <div className="p-4 text-center text-neutral-500">No se encontraron productos</div>
          )}
        </div>
      )}
    </div>
  )
}
