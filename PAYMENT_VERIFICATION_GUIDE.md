# Guía de Verificación de Pagos (Sistema sin Webhook)

## Resumen

Se implementó un sistema de verificación de pagos que **NO usa webhook**. Funciona completamente mediante verificación en las back_urls. Funciona perfectamente en desarrollo local (localhost) y producción.

## ¿Cómo funciona?

### 1. Flujo de pago

```
Usuario → Checkout → MercadoPago → Redirección a back_urls → Verificación automática
```

### 2. Componentes implementados

#### A. Endpoint de verificación: `/api/payment/verify`

**Ubicación:** `app/api/payment/verify/route.ts`

Acepta dos formas de verificar un pago:
- Por `paymentId` (cuando MercadoPago lo envía en la URL)
- Por `pedidoId` (busca el pago en MercadoPago)

**Ejemplo de uso:**
```typescript
const response = await fetch('/api/payment/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    paymentId: '1234567890',  // Opcional
    pedidoId: 'uuid-del-pedido' // Opcional (pero uno de los dos es requerido)
  })
})
```

#### B. Método `verifyByPedidoId` en lib/api.ts

**Ubicación:** `lib/api.ts` línea ~282

Este método:
1. Busca el pedido en la base de datos
2. Si ya fue procesado, retorna su estado
3. Si está pendiente, busca el pago en MercadoPago
4. Procesa el pago y actualiza stock si fue aprobado

#### C. Páginas de retorno actualizadas

Las 3 páginas de retorno ahora verifican automáticamente el pago:

1. **`/checkout/success`** - Verifica el pago y confirma que el stock fue descontado
2. **`/checkout/failure`** - Verifica por si el pago realmente falló o fue exitoso
3. **`/checkout/pending`** - Verifica el estado y redirige a success/failure según corresponda

### 3. Protección contra doble procesamiento

El código ya tenía protección en `lib/api.ts:191-194`:

```typescript
// Si el pedido ya fue procesado (no está pendiente), no hacer nada
if (pedido.estado !== "pendiente") {
  console.log("[API] Pedido already processed:", pedidoId, "Estado:", pedido.estado)
  return { pedidoId, status: pedido.estado, alreadyProcessed: true }
}
```

Esto previene que el stock se descuente dos veces.

## Ventajas de esta solución

✅ **Funciona en localhost** - No necesitas túnel ni deployment para probar
✅ **Confiable** - MercadoPago siempre redirige a las back_urls
✅ **Sin polling** - No desperdicia recursos
✅ **Experiencia fluida** - Verificación inmediata al retornar
✅ **Idempotente** - No procesa dos veces el mismo pago
✅ **Resiliente** - Reintenta una vez si no encuentra el pago

## Limitaciones

⚠️ Si el usuario cierra la ventana antes de la redirección, el pago no se verificará automáticamente

**Soluciones opcionales:**
1. Implementar un cron job que verifique pedidos pendientes periódicamente
2. Agregar un botón "Verificar pago" en la página de pedidos del usuario
3. Re-implementar webhook en el futuro si es necesario

## Cómo probar

### 1. En desarrollo (localhost)

```bash
npm run dev
```

1. Agrega productos al carrito
2. Completa el checkout con tus datos de prueba de MercadoPago
3. Paga con una tarjeta de prueba
4. MercadoPago te redirigirá a `/checkout/success`
5. La página verificará el pago automáticamente
6. Verás en consola los logs de verificación
7. El stock se descontará

### 2. En producción

El sistema funciona exactamente igual que en desarrollo:
- Verifica el pago cuando el usuario retorna de MercadoPago
- Actualiza el estado del pedido
- Descuenta el stock automáticamente

## Logs para debugging

Todos los pasos importantes tienen logs:

```typescript
[Payment Verify] Request: { paymentId, pedidoId }
[Payment Verify] Verifying by paymentId: ...
[Payment Verify] Result: { status: 'pagado', ... }
[API] Payment found for pedidoId: ...
[API] Pedido updated to 'pagado': ...
[API] Stock reduced for ...
```

## Estructura de archivos modificados

```
app/
├── api/
│   └── payment/
│       └── verify/
│           └── route.ts           ← NUEVO endpoint
├── checkout/
│   ├── success/page.tsx
│   ├── failure/page.tsx
│   └── pending/page.tsx
components/
├── checkout-success-client.tsx    ← ACTUALIZADO con verificación
├── checkout-failure-client.tsx    ← ACTUALIZADO con verificación
lib/
└── api.ts                         ← AGREGADO método verifyByPedidoId
```

## Query params que envía MercadoPago

Cuando MercadoPago redirige, envía estos parámetros:

**Success:**
```
/checkout/success?
  collection_id=1234567890
  &collection_status=approved
  &payment_id=1234567890
  &status=approved
  &external_reference=null
  &payment_type=credit_card
  &merchant_order_id=123456
  &preference_id=123456789-abc-def
  &site_id=MLA
  &processing_mode=aggregator
  &merchant_account_id=null
```

**Nuestro código usa:**
- `payment_id` o `collection_id` para verificar el pago
- `pedidoId` que viene de nuestra configuración en back_urls

## Siguiente paso recomendado

Para producción robusta, considera agregar:
1. **Cron job** que verifique pedidos pendientes cada X minutos
2. **Email de confirmación** cuando el pago se apruebe
3. **Dashboard de admin** para ver pedidos pendientes de verificación
