"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import type { Producto } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { useCart } from "@/lib/cart-context"
import { ChevronLeft, Minus, Plus } from "lucide-react"
import { ImageZoom } from "@/components/image-zoom"
import { getColorByHex } from "@/lib/colors"
import { toast } from "sonner"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

interface ProductDetailsClientProps {
  producto: Producto
}

export function ProductDetailsClient({ producto }: ProductDetailsClientProps) {
  const router = useRouter()
  const { addItem } = useCart()
  const [selectedColor, setSelectedColor] = useState<string>("")
  const [selectedTalle, setSelectedTalle] = useState<string>("")
  const [cantidad, setCantidad] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const [mensajeStock, setMensajeStock] = useState<string>("")
  const [mensajeTalle, setMensajeTalle] = useState<string>("")

  console.log("producto",producto)
  // Auto-select if only one option
  useEffect(() => {
    if (producto.Variante && producto.Variante.length === 1) {
      const variant = producto.Variante[0]
      setSelectedColor(variant.color)
      setSelectedTalle(variant.talle)
    } else if (producto.Variante && producto.Variante.length > 0) {
      const colores = [...new Set(producto.Variante.map((v: any) => v.color))]
      const talles = [...new Set(producto.Variante.map((v: any) => v.talle))]
      if (colores.length === 1) setSelectedColor(colores[0])
      if (talles.length === 1) setSelectedTalle(talles[0])
    }
  }, [producto])

  const getAvailableColors = () => {
    if (!producto?.Variante) return []
    return [...new Set(producto.Variante.map((v) => v.color))]
  }

  const getAvailableTalles = () => {
    if (!producto?.Variante) return []
    if (selectedColor) {
      const tallesForColor = producto.Variante
        .filter((v) => v.color === selectedColor)
        .map((v) => v.talle)
        .filter(Boolean)
      return [...new Set(tallesForColor)]
    }
    const allTalles = producto.Variante.map((v) => v.talle).filter(Boolean)
    return [...new Set(allTalles)]
  }

  const getSelectedVariantStock = () => {
    if (!producto?.Variante) return 0

    if (selectedColor && !selectedTalle) {
      const variantesConColor = producto.Variante.filter((v) => v.color === selectedColor)
      if (variantesConColor.length === 1) {
        return variantesConColor[0].stock
      }
      return 0
    }

    if (selectedColor && selectedTalle) {
      const variante = producto.Variante.find((v) => v.color === selectedColor && v.talle === selectedTalle)
      return variante?.stock || 0
    }

    if (producto.Variante.length === 1) {
      return producto.Variante[0].stock
    }

    return 0
  }

  const getTotalStock = () => {
    if (!producto?.Variante) return 0
    return producto.Variante.reduce((sum, v) => sum + v.stock, 0)
  }

  const getStockForColor = (color: string) => {
    if (!producto?.Variante) return 0
    return producto.Variante.filter((v) => v.color === color).reduce((sum, v) => sum + v.stock, 0)
  }

  const getTalleStockForColor = (talle: string) => {
    if (!producto?.Variante || !selectedColor) return 0
    const variante = producto.Variante.find((v) => v.color === selectedColor && v.talle === talle)
    return variante?.stock || 0
  }

  const handleAddToCart = () => {
    if (!producto) return

    const availableColors = getAvailableColors()
    const availableTalles = getAvailableTalles()
    const hasVariantes = producto.Variante && producto.Variante.length > 0

    if (availableColors.length > 1 && !selectedColor) {
      toast.error("Por favor selecciona un color")
      return
    }

    if (availableTalles.length > 1 && !selectedTalle) {
      toast.error("Por favor selecciona un talle")
      return
    }

    // Solo verificar stock si el producto tiene variantes
    if (hasVariantes) {
      const stock = getSelectedVariantStock()
      if (stock === 0) {
        toast.error("Esta variante no tiene stock disponible")
        return
      }

      const currentCart = JSON.parse(localStorage.getItem("cart") || "[]")
      const existingItem = currentCart.find(
        (item: any) =>
          item.productoId === producto.id &&
          item.color === (selectedColor || undefined) &&
          item.talle === (selectedTalle || undefined)
      )

      if (existingItem) {
        const totalCantidad = existingItem.cantidad + cantidad
        if (totalCantidad > stock) {
          toast.error(`No puedes agregar más de ${stock} unidades para esta variante.`)
          return
        }
      } else {
        if (cantidad > stock) {
          toast.error(`Solo hay ${stock} unidades disponibles para esta variante.`)
          return
        }
      }
    }

    addItem({
      productoId: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad,
      color: selectedColor || undefined,
      talle: selectedTalle || undefined,
      imagen: producto.imagenPortada || producto.imagenes[0],
    })

    toast.success("Producto agregado al carrito")
  }

  const handleBuyNow = () => {
    if (!producto) return

    const availableColors = getAvailableColors()
    const availableTalles = getAvailableTalles()
    const hasVariantes = producto.Variante && producto.Variante.length > 0

    if (availableColors.length > 1 && !selectedColor) {
      toast.error("Por favor selecciona un color")
      return
    }

    if (availableTalles.length > 1 && !selectedTalle) {
      toast.error("Por favor selecciona un talle")
      return
    }

    // Solo verificar stock si el producto tiene variantes
    if (hasVariantes) {
      const stock = getSelectedVariantStock()
      if (stock === 0) {
        toast.error("Esta variante no tiene stock disponible")
        return
      }

      const currentCart = JSON.parse(localStorage.getItem("cart") || "[]")
      const existingItem = currentCart.find(
        (item: any) =>
          item.productoId === producto.id &&
          item.color === (selectedColor || undefined) &&
          item.talle === (selectedTalle || undefined)
      )

      if (existingItem) {
        const totalCantidad = existingItem.cantidad + cantidad
        if (totalCantidad > stock) {
          toast.error(`No puedes agregar más de ${stock} unidades para esta variante.`)
          return
        }
      } else {
        if (cantidad > stock) {
          toast.error(`Solo hay ${stock} unidades disponibles para esta variante.`)
          return
        }
      }
    }

    addItem({
      productoId: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad,
      color: selectedColor || undefined,
      talle: selectedTalle || undefined,
      imagen: producto.imagenPortada || producto.imagenes[0],
    })

    router.push("/carrito")
  }

  const availableColors = getAvailableColors()
  const availableTalles = getAvailableTalles()
  const hasMultipleColors = availableColors.length > 1
  const hasTalles = availableTalles.length > 0
  const selectedStock = getSelectedVariantStock()
  const totalStock = getTotalStock()
  const shouldShowTalles = hasTalles && (hasMultipleColors ? selectedColor !== "" : true)
  const hasVariantes = producto.Variante && producto.Variante.length > 0

  // Determinar el mensaje del tooltip para los botones deshabilitados
  const getDisabledTooltip = () => {
    if (!hasVariantes) return ""
    if (totalStock === 0) return "Sin stock disponible"
    if (hasMultipleColors && !selectedColor && hasTalles) return "Debes seleccionar color y talle"
    if (hasMultipleColors && !selectedColor) return "Debes seleccionar un color"
    if (hasTalles && !selectedTalle) return "Debes seleccionar un talle"
    if (selectedStock === 0) return "Sin stock para esta combinación"
    return ""
  }

  const isButtonDisabled = hasVariantes
    ? (totalStock === 0 ||
       selectedStock === 0 ||
       (hasMultipleColors && !selectedColor) ||
       (hasTalles && !selectedTalle))
    : false

  const tooltipMessage = getDisabledTooltip()

  return (
    <main className="container mx-auto px-4 py-8">
      <Button variant="ghost" onClick={() => router.back()} className="mb-6">
        <ChevronLeft className="mr-2 h-4 w-4" />
        Volver
      </Button>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Imagen principal */}
        <div className="space-y-4">
          <div className="aspect-square relative bg-neutral-100 rounded-lg overflow-hidden">
            <ImageZoom
              src={producto.imagenes[selectedImage] || "/placeholder.svg?height=600&width=600"}
              alt={producto.nombre}
              className="w-full h-full"
            />
          </div>
          {producto.imagenes.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {producto.imagenes.map((imagen, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`aspect-square relative bg-neutral-100 rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                    selectedImage === index ? "border-neutral-900" : "border-transparent"
                  }`}
                >
                  <Image
                    src={imagen || "/placeholder.svg"}
                    alt={`${producto.nombre} ${index + 1}`}
                    width={150}
                    height={150}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{producto.nombre}</h1>
            <p className="text-3xl font-bold">${producto.precio.toLocaleString()}</p>
          </div>

          <div>
            <h2 className="font-semibold mb-2">Descripción</h2>
            <p className="text-neutral-700">{producto.descripcion}</p>
          </div>

          {/* Colores */}
          {availableColors.length > 0 && (
            <div>
              <h2 className="font-semibold mb-3">Color</h2>
              <div className="flex flex-wrap gap-3">
                {availableColors.map((colorHex) => {
                  const color = getColorByHex(colorHex)
                  const isSelected = selectedColor === colorHex
                  const stockForColor = getStockForColor(colorHex)
                  const hasStock = stockForColor > 0

                  return (
                    <button
                      key={colorHex}
                      onClick={() => {
                        if (!hasStock) return
                        setSelectedColor(colorHex)
                        setMensajeStock("")

                        // Obtener talles disponibles para este color
                        const tallesParaColor = producto.Variante
                          .filter((v) => v.color === colorHex && v.stock > 0)
                          .map((v) => v.talle)
                          .filter(Boolean)
                        const tallesUnicos = [...new Set(tallesParaColor)]

                        // Si solo hay un talle, seleccionarlo automáticamente
                        if (tallesUnicos.length === 1) {
                          setSelectedTalle(tallesUnicos[0])
                          setMensajeTalle("")
                        } else if (tallesUnicos.length > 1) {
                          // Si hay más de un talle, resetear y mostrar mensaje
                          setSelectedTalle("")
                          setMensajeTalle("Debes seleccionar un talle")
                        } else {
                          setSelectedTalle("")
                          setMensajeTalle("")
                        }
                      }}
                      disabled={!hasStock}
                      className="group relative"
                      title={color?.name || colorHex}
                    >
                      <div
                        className={`w-12 h-12 rounded-full border-2 transition-all ${
                          !hasStock
                            ? "opacity-40 cursor-not-allowed border-neutral-200"
                            : isSelected
                            ? "border-neutral-900 scale-110 shadow-lg"
                            : "border-neutral-300 hover:border-neutral-500 hover:scale-105"
                        }`}
                        style={{ backgroundColor: colorHex }}
                      />
                      {!hasStock && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-14 h-0.5 bg-neutral-400 rotate-45" />
                        </div>
                      )}
                      <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white px-2 py-1 rounded">
                        {color?.name || colorHex} {!hasStock && "(Sin stock)"}
                      </span>
                    </button>
                  )
                })}
              </div>
              {selectedColor && (
                <p className="text-sm text-neutral-600 mt-3">
                  Color seleccionado: {getColorByHex(selectedColor)?.name}
                </p>
              )}
            </div>
          )}

          {/* Talles */}
          {shouldShowTalles && (
            <div>
              <h2 className="font-semibold mb-2">Talle</h2>
              <div className="flex flex-wrap gap-2">
                {availableTalles.map((talle) => {
                  const talleStock = getTalleStockForColor(talle)
                  const isAvailable = talleStock > 0
                  const isSelected = selectedTalle === talle

                  return (
                    <Button
                      key={talle}
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => {
                        if (!isAvailable) {
                          setMensajeStock(`El talle ${talle} no tiene stock disponible.`)
                          return
                        }
                        setSelectedTalle(talle)
                        setMensajeStock("")
                        setMensajeTalle("")
                      }}
                      disabled={!isAvailable}
                      className={`${!isAvailable ? "opacity-40 cursor-not-allowed line-through" : ""}`}
                    >
                      {talle}
                    </Button>
                  )
                })}
              </div>
              {mensajeStock && <p className="text-sm text-red-500 mt-2">{mensajeStock}</p>}
              {mensajeTalle && <p className="text-sm text-amber-600 font-medium mt-2">{mensajeTalle}</p>}
            </div>
          )}
          <div className="mb-4">
            {hasVariantes ? (
              selectedColor && selectedTalle ? (
                <div className="bg-neutral-100 p-3 rounded-lg">
                  <p className="text-lg font-bold text-neutral-900">
                    {selectedStock > 0
                      ? `${selectedStock} unidades disponibles`
                      : "Sin stock para esta combinación"}
                  </p>
                </div>
              ) : selectedColor && hasTalles && !selectedTalle ? null : (
                <p className="text-sm text-neutral-600">
                  {totalStock > 0 ? `Stock total: ${totalStock} unidades` : "Sin stock"}
                </p>
              )
            ) : (
              <p className="text-sm text-neutral-600">Disponible</p>
            )}
          </div>
          {/* Cantidad */}
          <div>
            <h2 className="font-semibold mb-2">Cantidad</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                disabled={cantidad <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center font-semibold">{cantidad}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (hasVariantes) {
                    const maxStock = selectedStock > 0 ? selectedStock : totalStock
                    setCantidad(Math.min(maxStock, cantidad + 1))
                  } else {
                    setCantidad(cantidad + 1)
                  }
                }}
                disabled={hasVariantes && (cantidad >= (selectedStock > 0 ? selectedStock : totalStock) || totalStock === 0)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Agregar al carrito */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={isButtonDisabled}
                >
                  {hasVariantes && totalStock === 0
                    ? "Sin Stock"
                    : hasVariantes && selectedStock === 0 && selectedColor && selectedTalle
                    ? "Sin Stock para esta combinación"
                    : "Agregar al Carrito"}
                </Button>
              </div>
            </TooltipTrigger>
            {isButtonDisabled && tooltipMessage && (
              <TooltipContent>
                <p>{tooltipMessage}</p>
              </TooltipContent>
            )}
          </Tooltip>

          {/* Comprar ahora */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full">
                <Button
                  className="w-full"
                  size="lg"
                  variant="outline"
                  onClick={handleBuyNow}
                  disabled={isButtonDisabled}
                >
                  Comprar Ahora
                </Button>
              </div>
            </TooltipTrigger>
            {isButtonDisabled && tooltipMessage && (
              <TooltipContent>
                <p>{tooltipMessage}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </div>
    </main>
  )
}
