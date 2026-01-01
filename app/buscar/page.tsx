import { Suspense } from "react"
import { ProductCard } from "@/components/product-card"
import { Header } from "@/components/header"
import { searchProductos } from "@/app/actions/productos"
import type { Producto } from "@/lib/types"

async function SearchResults({ query }: { query: string }) {
  const result = await searchProductos(query)
  const productos = result.success ? result.productos : []

  return (
    <main className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Resultados de búsqueda</h1>
        <p className="text-neutral-600">
          {query && (
            <>
              Mostrando {productos.length} resultado{productos.length !== 1 ? "s" : ""} para{" "}
              <strong>&quot;{query}&quot;</strong>
            </>
          )}
        </p>
      </div>

      {productos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {productos.map((producto) => (
            <ProductCard key={producto.id} producto={producto} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-lg text-neutral-600 mb-2">
            No se encontraron productos para &quot;{query}&quot;
          </p>
          <p className="text-sm text-neutral-500">Intenta con otros términos de búsqueda</p>
        </div>
      )}
    </main>
  )
}

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const params = await searchParams
  const query = params.q || ""

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Suspense
        fallback={
          <div className="container mx-auto px-4 py-12">
            <div className="flex justify-center items-center min-h-[50vh]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900"></div>
            </div>
          </div>
        }
      >
        <SearchResults query={query} />
      </Suspense>
    </div>
  )
}
