"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import type { Producto } from "@/lib/types"
import { Plus, Pencil, Trash2, X, Upload, Star } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUploadThing } from "@/lib/uploadthing"
import Image from "next/image"
import { ColorPicker } from "@/components/color-picker"
import { getColorByHex } from "@/lib/colors"

export default function AdminProductosPage() {
  const { token } = useAuth()
  const [productos, setProductos] = useState<Producto[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null)
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    categoria: "remeras",
    genero: "hombre",
  })
  const [variantes, setVariantes] = useState<Array<{ color: string; talle: string; stock: number }>>([])
  const [newVariante, setNewVariante] = useState({ color: "", talle: "", stock: "" })
  const [varianteError, setVarianteError] = useState("")
  const [imagenes, setImagenes] = useState<string[]>([])
  const [imagenPortada, setImagenPortada] = useState<string>("")
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { startUpload } = useUploadThing("productImages")

  useEffect(() => {
    fetchProductos()
  }, [])

  const fetchProductos = async () => {
    if (!token) return

    try {
      const { adminGetProductos } = await import("@/app/actions/admin")
      const result = await adminGetProductos(token)

      if (result.success && result.productos) {
        setProductos(result.productos)
      }
    } catch (error) {
      console.error("[v0] Fetch productos error:", error)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    try {
      const uploadedFiles = await startUpload(Array.from(files))
      if (uploadedFiles) {
        const newImageUrls = uploadedFiles.map((file) => file.url)
        setImagenes([...imagenes, ...newImageUrls])
        // Set first uploaded image as cover if no cover is set
        if (!imagenPortada && newImageUrls.length > 0) {
          setImagenPortada(newImageUrls[0])
        }
      }
    } catch (error) {
      console.error("[v0] Upload error:", error)
      alert("Error al subir imágenes")
    } finally {
      setIsUploading(false)
    }
  }

  const removeImage = (url: string) => {
    setImagenes(imagenes.filter((img) => img !== url))
    if (imagenPortada === url) {
      setImagenPortada(imagenes.find((img) => img !== url) || "")
    }
  }

  const addVariante = () => {
    // Validar que todos los campos estén completos
    const errors: string[] = []

    if (!newVariante.color) {
      errors.push("color")
    }
    if (!newVariante.talle) {
      errors.push("talle")
    }
    if (!newVariante.stock || Number.parseInt(newVariante.stock) <= 0) {
      errors.push("stock")
    }

    if (errors.length > 0) {
      const errorMessage = `Debes completar: ${errors.join(", ")}`
      setVarianteError(errorMessage)
      return
    }

    // Agregar la variante
    setVariantes([
      ...variantes,
      {
        color: newVariante.color,
        talle: newVariante.talle,
        stock: Number.parseInt(newVariante.stock),
      },
    ])
    setNewVariante({ color: "", talle: "", stock: "" })
    setVarianteError("")
  }

  const removeVariante = (index: number) => {
    setVariantes(variantes.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Prevenir múltiples envíos
    if (isSubmitting) {
      return
    }

    if (imagenes.length === 0) {
      alert("Por favor sube al menos una imagen")
      return
    }

    if (variantes.length === 0) {
      alert("Por favor agrega al menos una variante")
      return
    }

    const data = {
      ...formData,
      precio: Number.parseFloat(formData.precio),
      imagenes,
      imagenPortada: imagenPortada || imagenes[0],
      variantes: variantes,
    }

    setIsSubmitting(true)
    try {
      const url = editingProducto ? `/api/admin/productos/${editingProducto.id}` : "/api/admin/productos"
      const method = editingProducto ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        fetchProductos()
        setIsDialogOpen(false)
        resetForm()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error || "Error al guardar producto"}`)
      }
    } catch (error) {
      console.error("[v0] Save producto error:", error)
      alert("Error al guardar producto")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este producto?")) return

    try {
      const response = await fetch(`/api/admin/productos/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        fetchProductos()
      }
    } catch (error) {
      console.error("[v0] Delete producto error:", error)
    }
  }

  const handleEdit = (producto: Producto) => {
    setEditingProducto(producto)
    setFormData({
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      precio: producto.precio.toString(),
      categoria: producto.categoria,
      genero: producto.genero,
    })
    setVariantes(
      producto.Variante?.map((v) => ({
        color: v.color,
        talle: v.talle,
        stock: v.stock,
      })) || [],
    )
    setImagenes(producto.imagenes || [])
    setImagenPortada(producto.imagenPortada || producto.imagenes?.[0] || "")
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setEditingProducto(null)
    setFormData({
      nombre: "",
      descripcion: "",
      precio: "",
      categoria: "remeras",
      genero: "hombre",
    })
    setVariantes([])
    setNewVariante({ color: "", talle: "", stock: "" })
    setVarianteError("")
    setImagenes([])
    setImagenPortada("")
    setIsSubmitting(false)
  }

  const getTotalStock = (producto: Producto) => {
    return producto.Variante?.reduce((sum, v) => sum + v.stock, 0) || 0
  }

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Productos</h1>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) resetForm()
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Producto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProducto ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="precio">Precio</Label>
                <Input
                  id="precio"
                  type="number"
                  step="0.01"
                  value={formData.precio}
                  onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoría</Label>
                  <Select
                    value={formData.categoria}
                    onValueChange={(value) => setFormData({ ...formData, categoria: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="remeras">Remeras</SelectItem>
                      <SelectItem value="shorts">Shorts</SelectItem>
                      <SelectItem value="buzos">Buzos</SelectItem>
                      <SelectItem value="tops">Tops</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="genero">Género</Label>
                  <Select
                    value={formData.genero}
                    onValueChange={(value) => setFormData({ ...formData, genero: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hombre">Hombre</SelectItem>
                      <SelectItem value="mujer">Mujer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <Label className="text-lg font-semibold">Imágenes del Producto</Label>
                <div className="space-y-2">
                  <Label htmlFor="image-upload" className="cursor-pointer">
                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-neutral-400 transition-colors">
                      <Upload className="mx-auto h-8 w-8 text-neutral-400 mb-2" />
                      <p className="text-sm text-neutral-600">
                        {isUploading ? "Subiendo..." : "Click para subir imágenes"}
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">Máximo 10 imágenes, 4MB cada una</p>
                    </div>
                    <Input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </Label>

                  {imagenes.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      {imagenes.map((url, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-square relative bg-neutral-100 rounded-lg overflow-hidden">
                            <Image
                              src={url || "/placeholder.svg"}
                              alt={`Producto ${index + 1}`}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="absolute top-2 right-2 flex gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant={imagenPortada === url ? "default" : "secondary"}
                              className="h-8 w-8"
                              onClick={() => setImagenPortada(url)}
                              title="Establecer como portada"
                            >
                              <Star className="h-4 w-4" fill={imagenPortada === url ? "currentColor" : "none"} />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="destructive"
                              className="h-8 w-8"
                              onClick={() => removeImage(url)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          {imagenPortada === url && (
                            <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                              Portada
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <Label className="text-lg font-semibold">Variantes (Color + Talle + Stock)</Label>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <ColorPicker
                      selectedColor={newVariante.color}
                      onColorSelect={(hex) => {
                        setNewVariante({ ...newVariante, color: hex })
                        setVarianteError("")
                      }}
                    />
                    {newVariante.color && (
                      <p className="text-sm text-neutral-600">
                        Seleccionado: {getColorByHex(newVariante.color)?.name || newVariante.color}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Select
                      value={newVariante.talle}
                      onValueChange={(value) => {
                        setNewVariante({ ...newVariante, talle: value })
                        setVarianteError("")
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar talle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="XS">XS</SelectItem>
                        <SelectItem value="S">S</SelectItem>
                        <SelectItem value="M">M</SelectItem>
                        <SelectItem value="L">L</SelectItem>
                        <SelectItem value="XL">XL</SelectItem>
                        <SelectItem value="XXL">XXL</SelectItem>
                        <SelectItem value="XXXL">XXXL</SelectItem>
                        <SelectItem value="2">2 años</SelectItem>
                        <SelectItem value="4">4 años</SelectItem>
                        <SelectItem value="6">6 años</SelectItem>
                        <SelectItem value="8">8 años</SelectItem>
                        <SelectItem value="10">10 años</SelectItem>
                        <SelectItem value="12">12 años</SelectItem>
                        <SelectItem value="14">14 años</SelectItem>
                        <SelectItem value="16">16 años</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Stock"
                      type="number"
                      value={newVariante.stock}
                      onChange={(e) => {
                        setNewVariante({ ...newVariante, stock: e.target.value })
                        setVarianteError("")
                      }}
                    />
                    <Button type="button" onClick={addVariante} variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar
                    </Button>
                  </div>

                  {varianteError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-800 font-medium">{varianteError}</p>
                    </div>
                  )}
                </div>

                {variantes.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Variantes agregadas:</Label>
                    <div className="space-y-2">
                      {variantes.map((variante, index) => (
                        <div key={index} className="flex items-center justify-between bg-muted p-3 rounded-md">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-6 h-6 rounded-full border-2 border-neutral-300"
                              style={{ backgroundColor: variante.color }}
                              title={getColorByHex(variante.color)?.name || variante.color}
                            />
                            <span className="text-sm">
                              {getColorByHex(variante.color)?.name || variante.color} - {variante.talle} - Stock:{" "}
                              {variante.stock}
                            </span>
                          </div>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeVariante(index)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isUploading || isSubmitting}>
                {isSubmitting
                  ? (editingProducto ? "Actualizando..." : "Creando...")
                  : (editingProducto ? "Actualizar" : "Crear") + " Producto"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-lg border">
        <table className="w-full">
          <thead className="border-b">
            <tr>
              <th className="text-left p-4">Imagen</th>
              <th className="text-left p-4">Nombre</th>
              <th className="text-left p-4">Categoría</th>
              <th className="text-left p-4">Género</th>
              <th className="text-left p-4">Precio</th>
              <th className="text-left p-4">Stock Total</th>
              <th className="text-left p-4">Variantes</th>
              <th className="text-right p-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((producto) => (
              <tr key={producto.id} className="border-b last:border-0">
                <td className="p-4">
                  <div className="w-12 h-12 relative bg-neutral-100 rounded overflow-hidden">
                    <Image
                      src={producto.imagenPortada || producto.imagenes?.[0] || "/placeholder.svg"}
                      alt={producto.nombre}
                      fill
                      className="object-cover"
                    />
                  </div>
                </td>
                <td className="p-4 font-medium">{producto.nombre}</td>
                <td className="p-4">{producto.categoria}</td>
                <td className="p-4">{producto.genero}</td>
                <td className="p-4">${producto.precio.toLocaleString()}</td>
                <td className="p-4">{getTotalStock(producto)}</td>
                <td className="p-4">{producto.Variante?.length || 0}</td>
                <td className="p-4 text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(producto)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(producto.id)}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  )
}
