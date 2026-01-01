# Server Actions - Boxing Store

Este directorio contiene todas las Server Actions del proyecto, organizadas por dominio.

## ¿Qué son las Server Actions?

Las Server Actions son funciones que se ejecutan en el servidor y pueden ser llamadas directamente desde Client Components. Son parte de la arquitectura oficial de Next.js App Router con React Server Components (RSC).

**Ventajas:**
- ✅ Acceso directo a la base de datos (sin API Routes intermedias)
- ✅ Mejor separación entre cliente y servidor
- ✅ Type-safe (TypeScript completo)
- ✅ Mejor performance (menos código en el cliente)
- ✅ Código más limpio y mantenible

## Estructura

```
app/actions/
├── index.ts         # Exporta todas las actions (punto de entrada)
├── productos.ts     # Actions para productos
├── auth.ts          # Actions para autenticación
├── pedidos.ts       # Actions para pedidos/checkout
├── admin.ts         # Actions para administración
└── README.md        # Este archivo
```

## Cómo usar las Server Actions

### 1. Importar desde index.ts (Recomendado)

```tsx
"use client"

import { getProductoById, getProductos } from "@/app/actions"

export default function MiComponente() {
  const [producto, setProducto] = useState(null)

  useEffect(() => {
    async function cargarProducto() {
      const result = await getProductoById("producto-123")

      if (result.success) {
        setProducto(result.producto)
      } else {
        console.error(result.error)
      }
    }

    cargarProducto()
  }, [])

  return <div>{producto?.nombre}</div>
}
```

### 2. Formato de Respuesta

Todas las Server Actions retornan un objeto con:
- `success: boolean` - Indica si la operación fue exitosa
- `data | error` - Datos si success=true, error si success=false

**Ejemplo exitoso:**
```typescript
{
  success: true,
  producto: { id: "...", nombre: "...", ... }
}
```

**Ejemplo con error:**
```typescript
{
  success: false,
  error: "Producto no encontrado"
}
```

## Catálogo de Server Actions

### 📦 Productos (`productos.ts`)

| Función | Descripción | Parámetros |
|---------|-------------|------------|
| `getProductos` | Obtiene productos con filtros | `{ categoria?, genero?, search? }` |
| `getProductoById` | Obtiene un producto por ID | `id: string` |
| `searchProductos` | Busca productos por término | `query: string` |
| `getProductosPorCategoria` | Productos por categoría | `categoria: string` |
| `getProductosPorGenero` | Productos por género | `genero: string` |
| `checkStock` | Verifica stock de variante | `productoId, color, talle` |

**Ejemplo:**
```tsx
const { success, productos } = await getProductos({
  categoria: "remeras",
  genero: "hombre"
})
```

### 🔐 Autenticación (`auth.ts`)

| Función | Descripción | Parámetros |
|---------|-------------|------------|
| `registerUser` | Registra un nuevo usuario | `{ email, password, nombre, apellido }` |
| `loginUser` | Inicia sesión | `{ email, password }` |
| `getUserById` | Obtiene datos del usuario | `userId: string` |
| `updateUser` | Actualiza perfil | `userId, { nombre?, apellido?, email? }` |
| `changePassword` | Cambia contraseña | `userId, { currentPassword, newPassword }` |

**Ejemplo:**
```tsx
const result = await loginUser({
  email: "user@example.com",
  password: "123456"
})

if (result.success) {
  localStorage.setItem("token", result.token)
  // Redirigir...
}
```

### 🛒 Pedidos (`pedidos.ts`)

| Función | Descripción | Parámetros |
|---------|-------------|------------|
| `createCheckout` | Crea pedido y preferencia MP | `userId, items[]` |
| `getPedidoById` | Obtiene un pedido | `pedidoId, userId?` |
| `getPedidosByUserId` | Pedidos de un usuario | `userId: string` |
| `updatePedidoEstado` | Actualiza estado | `pedidoId, estado` |
| `confirmarPagoPedido` | Confirma pago (webhook) | `pedidoId: string` |
| `cancelarPedido` | Cancela pedido pendiente | `pedidoId, userId` |

**Ejemplo:**
```tsx
const result = await createCheckout(user.id, cartItems)

if (result.success) {
  window.location.href = result.initPoint // Redirigir a MercadoPago
}
```

### 👨‍💼 Administración (`admin.ts`)

**IMPORTANTE:** Todas las funciones admin requieren el token JWT como primer parámetro.

#### Productos

| Función | Descripción | Parámetros |
|---------|-------------|------------|
| `adminGetProductos` | Lista todos los productos | `token` |
| `adminCreateProducto` | Crea producto | `token, data` |
| `adminUpdateProducto` | Actualiza producto | `token, productoId, data` |
| `adminDeleteProducto` | Elimina producto | `token, productoId` |

#### Pedidos

| Función | Descripción | Parámetros |
|---------|-------------|------------|
| `adminGetPedidos` | Lista todos los pedidos | `token` |
| `adminUpdatePedidoEstado` | Cambia estado de pedido | `token, pedidoId, estado` |
| `adminDeletePedido` | Elimina pedido | `token, pedidoId` |

#### Estadísticas

| Función | Descripción | Parámetros |
|---------|-------------|------------|
| `adminGetStats` | Stats básicas del dashboard | `token` |
| `adminGetAdvancedStats` | Stats avanzadas | `token` |

#### Usuarios

| Función | Descripción | Parámetros |
|---------|-------------|------------|
| `adminGetUsers` | Lista usuarios | `token` |
| `adminUpdateUserRole` | Cambia rol de usuario | `token, userId, role` |

**Ejemplo:**
```tsx
const token = localStorage.getItem("token")
const result = await adminCreateProducto(token, {
  nombre: "Remera Nueva",
  precio: 5000,
  categoria: "remeras",
  genero: "hombre",
  descripcion: "...",
  imagenes: ["https://..."],
  variantes: [
    { color: "#000000", talle: "M", stock: 10 },
    { color: "#FFFFFF", talle: "L", stock: 5 }
  ]
})
```

## Migración desde API Routes

### Antes (API Route)

```tsx
// Cliente
const response = await fetch("/api/productos")
const data = await response.json()
```

### Después (Server Action)

```tsx
// Cliente
import { getProductos } from "@/app/actions"

const result = await getProductos()
if (result.success) {
  console.log(result.productos)
}
```

## Coexistencia

Las Server Actions **coexisten con las API Routes existentes**. No necesitas eliminar las API Routes actuales. Puedes migrar gradualmente:

1. ✅ Mantener API Routes funcionando
2. ✅ Usar Server Actions en nuevas features
3. ✅ Migrar páginas existentes poco a poco

## Notas Importantes

1. **Todas las Server Actions tienen `"use server"` al inicio del archivo**
2. **Se pueden llamar desde Client Components marcados con `"use client"`**
3. **Retornan promesas que deben ser awaited**
4. **No requieren headers Authorization (excepto admin actions que reciben token)**
5. **Validan datos en el servidor (más seguro que API Routes)**

## Próximos Pasos

Para completar la migración a arquitectura RSC:

1. ✅ Server Actions creadas (HECHO)
2. ⏳ Migrar más páginas para usar Server Actions
3. ⏳ Crear Middleware para protección de rutas
4. ⏳ Organizar rutas con Route Groups `(root)` y `(admin)`
5. ⏳ Opcional: Migrar a NextAuth.js

---

**Documentación oficial:** [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
