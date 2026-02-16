import type { Producto } from "@/lib/types"
import { Header } from "@/components/header"
import { ProductCarousel } from "@/components/product-carousel"
import { HeroBanner } from "@/components/hero-banner"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { ProductCard } from "@/components/product-card"
import { getProductos } from "@/app/actions/productos"

// Revalidar la página cada 0 segundos (siempre dinámico)
export const revalidate = 0
export const dynamic = 'force-dynamic'

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ genero?: string; categoria?: string }>
}) {
  const { genero, categoria } = await searchParams

  // Fetch productos usando server action
  const result = await getProductos({
    genero: genero || undefined,
    categoria: categoria || undefined,
  })

  const productos = result.success ? result.productos : []

  let latestProducts: Producto[] = []
  let menProducts: Producto[] = []
  let womenProducts: Producto[] = []
  let filteredProducts: Producto[] = []

  if (genero || categoria) {
    filteredProducts = productos
  } else {
    // Default homepage view
    latestProducts = productos.slice(0, 8)

    const menProds = productos.filter((p: Producto) => p.genero === "hombre")
    const womenProds = productos.filter((p: Producto) => p.genero === "mujer")

    menProducts = shuffleArray(menProds).slice(0, 8)
    womenProducts = shuffleArray(womenProds).slice(0, 8)
  }

  const ProductSection = ({
    title,
    products,
    viewAllLink,
  }: {
    title: string
    products: Producto[]
    viewAllLink?: string
  }) => (
    <section className="mb-16">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-balance">{title}</h2>
        {viewAllLink && (
          <Button variant="ghost" asChild>
            <Link href={viewAllLink} className="flex items-center gap-2">
              Ver todo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
      <ProductCarousel products={products} />
    </section>
  )

  const getFilteredTitle = () => {
    const generoText = genero === "hombre" ? "Hombre" : genero === "mujer" ? "Mujer" : ""
    const categoriaText = categoria ? categoria.charAt(0).toUpperCase() + categoria.slice(1) : ""

    if (generoText && categoriaText) {
      return `${categoriaText} para ${generoText}`
    } else if (generoText) {
      return `Productos para ${generoText}`
    } else if (categoriaText) {
      return categoriaText
    }
    return "Productos"
  }

  if (genero || categoria) {
    return (
      <div className="min-h-screen bg-white">
        <Header />

        <main className="container mx-auto px-4 py-12">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{getFilteredTitle()}</h1>
            <p className="text-neutral-600">
              {filteredProducts.length}{" "}
              {filteredProducts.length === 1 ? "producto encontrado" : "productos encontrados"}
            </p>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredProducts.map((producto) => (
                <ProductCard key={producto.id} producto={producto} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-neutral-600 mb-4">No se encontraron productos</p>
              <Button asChild>
                <Link href="/">Volver al inicio</Link>
              </Button>
            </div>
          )}
        </main>
      </div>
    )
  }

  // Default homepage view
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <HeroBanner />

      <main className="container mx-auto px-4 py-12">
        <ProductSection title="Últimos Ingresos" products={latestProducts} />

        {menProducts.length > 0 && (
          <ProductSection title="Productos para Hombre" products={menProducts} viewAllLink="/?genero=hombre" />
        )}

        {womenProducts.length > 0 && (
          <ProductSection title="Productos para Mujer" products={womenProducts} viewAllLink="/?genero=mujer" />
        )}
      </main>
    </div>
  )
}
