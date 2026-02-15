# Escenarios de Pago - Documentación Completa

## ¿MercadoPago siempre redirige?

**Respuesta: SÍ**, MercadoPago **SIEMPRE** redirige a las back_urls configuradas después de que el usuario completa el flujo de pago (exitoso o fallido).

Sin embargo, hay escenarios donde la verificación puede no ejecutarse automáticamente.

---

## Todos los escenarios posibles

### ✅ Escenario 1: Flujo exitoso normal

```
1. Usuario completa checkout
2. Se crea pedido en estado "pendiente"
3. Usuario es redirigido a MercadoPago
4. Usuario paga exitosamente
5. MercadoPago redirige a /checkout/success?pedidoId=X&payment_id=Y
6. La página automáticamente verifica el pago
7. Estado cambia a "pagado"
8. Stock se descuenta
9. Usuario ve mensaje de éxito
```

**Resultado:** ✅ Todo funciona correctamente

---

### ⚠️ Escenario 2: Usuario cierra ventana antes de redirección

```
1. Usuario completa checkout
2. Se crea pedido en estado "pendiente"
3. Usuario es redirigido a MercadoPago
4. Usuario paga exitosamente
5. MercadoPago muestra pantalla de confirmación
6. Usuario cierra la ventana/tab antes de hacer clic en "Volver"
7. ❌ Nunca llega a /checkout/success
8. ❌ No se ejecuta la verificación automática
9. Pedido queda en "pendiente"
10. Stock NO se descuenta
```

**Solución implementada:**
- Usuario va a "Mis Pedidos"
- Ve el pedido en estado "pendiente"
- Hace clic en "Verificar si ya pagué"
- Sistema busca el pago en MercadoPago
- Se actualiza el estado y descuenta stock

**Resultado:** ⚠️ Requiere acción manual del usuario (pero tiene solución)

---

### ⚠️ Escenario 3: Usuario manipula la URL

```
1. Usuario accede directamente a /checkout/success (sin payment_id ni pedidoId)
2. La verificación no puede ejecutarse (falta información)
3. Se muestra error: "No se pudo obtener la información del pago"
4. Se le sugiere ir a "Mis Pedidos"
```

**Protección implementada:**
```typescript
if (!actualPaymentId && !pedidoId) {
  setError("No se pudo obtener la información del pago...")
  return
}
```

**Resultado:** ✅ Error controlado, no afecta el sistema

---

### ⚠️ Escenario 4: Usuario manipula pedidoId de otro usuario

```
1. Usuario A cambia la URL a /checkout/success?pedidoId=PEDIDO_DE_USUARIO_B
2. El endpoint /api/payment/verify verifica la propiedad del pedido
3. Responde con error 403 "No autorizado"
```

**Protección implementada:**
```typescript
// En /api/payment/verify/route.ts
if (pedido && pedido.userId !== payload.userId) {
  return NextResponse.json({ error: "No autorizado" }, { status: 403 })
}
```

**Resultado:** ✅ Seguridad garantizada

---

### ✅ Escenario 5: Pago rechazado

```
1. Usuario completa checkout
2. Usuario es redirigido a MercadoPago
3. Tarjeta es rechazada
4. MercadoPago redirige a /checkout/failure?pedidoId=X
5. La página verifica el estado real
6. Estado se actualiza a "fallido"
7. Usuario puede reintentar el pago
```

**Resultado:** ✅ Funciona correctamente

---

### ✅ Escenario 6: Pago pendiente (efectivo/transferencia)

```
1. Usuario completa checkout
2. Elige método de pago offline (Rapipago, etc.)
3. MercadoPago redirige a /checkout/pending?pedidoId=X
4. La página verifica el estado
5. Pedido queda en "pendiente"
6. Cuando el usuario paga en físico, puede verificar en "Mis Pedidos"
```

**Resultado:** ✅ Funciona correctamente

---

### ⚠️ Escenario 7: Doble verificación (usuario actualiza la página)

```
1. Pago se verifica y stock se descuenta
2. Usuario recarga /checkout/success
3. Se intenta verificar nuevamente
4. El código detecta que ya fue procesado:
   if (pedido.estado !== "pendiente") {
     return { alreadyProcessed: true }
   }
5. No se descuenta stock nuevamente
```

**Protección implementada:** Idempotencia en `lib/api.ts:191-194`

**Resultado:** ✅ Protección contra doble procesamiento

---

### ⚠️ Escenario 8: Error de conexión durante verificación

```
1. Usuario llega a /checkout/success
2. Intenta verificar pero hay error de red/servidor
3. Se muestra error: "Error de conexión al verificar el pago"
4. Se sugiere verificar en "Mis Pedidos"
```

**Manejo implementado:**
```typescript
catch (err) {
  setError("Error de conexión al verificar el pago...")
}
```

**Resultado:** ✅ Error manejado con ruta de recuperación

---

### ⚠️ Escenario 9: Pago procesado pero no encontrado inmediatamente

```
1. Usuario completa pago
2. MercadoPago redirige rápidamente
3. El pago aún no está disponible en la API de MercadoPago (demora de segundos)
4. Primera verificación no encuentra el pago
5. Sistema reintenta automáticamente después de 2 segundos
6. Segunda verificación encuentra el pago
7. Stock se descuenta correctamente
```

**Lógica de reintentos:**
```typescript
if (result.verified === false && retryCount < MAX_RETRIES) {
  retryCount++
  setTimeout(() => verifyPayment(), 2000)
}
```

**Resultado:** ✅ Maneja delays de la API de MercadoPago

---

### ❌ Escenario 10: Usuario cancela el pago (no completa)

```
1. Usuario completa checkout
2. Usuario es redirigido a MercadoPago
3. Usuario hace clic en "Cancelar" o "Volver"
4. MercadoPago redirige a /checkout/failure (sin payment_id)
5. Pedido queda en "pendiente"
6. Stock NO se descuenta (correcto)
7. Usuario puede reintentar desde "Mis Pedidos"
```

**Resultado:** ✅ Comportamiento esperado

---

## Matriz de Estados del Pedido

| Estado | ¿Qué significa? | ¿Stock descontado? | Acciones disponibles |
|--------|-----------------|-------------------|---------------------|
| `pendiente` | Pago no completado o no verificado | ❌ NO | Pagar, Verificar |
| `pagado` | Pago aprobado y verificado | ✅ SÍ | Ver detalles |
| `fallido` | Pago rechazado por MercadoPago | ❌ NO | Reintentar pago |
| `procesando` | Pedido en preparación | ✅ SÍ | Ver detalles |
| `enviado` | Pedido enviado | ✅ SÍ | Ver detalles |
| `entregado` | Pedido entregado | ✅ SÍ | Ver detalles |
| `cancelado` | Pedido cancelado | ❌ NO | Hacer nuevo pedido |

---

## ¿Qué pasa si el usuario cambia el curso de la redirección?

### Caso 1: Usuario bloquea la redirección con extensión del navegador
**Efecto:** Similar a cerrar la ventana, el pedido queda pendiente
**Solución:** Verificación manual desde "Mis Pedidos"

### Caso 2: Usuario edita la URL manualmente
**Efecto:** Error controlado, sin afectación al sistema
**Protección:** Validaciones en el endpoint

### Caso 3: Usuario abre múltiples tabs con la misma URL de success
**Efecto:** Solo la primera verificación procesa el pago
**Protección:** Idempotencia implementada

---

## Puntos críticos de seguridad

### ✅ Verificaciones implementadas:

1. **Propiedad del pedido**: Usuario solo puede verificar sus propios pedidos
2. **Idempotencia**: Un pago no se procesa dos veces
3. **Validación de parámetros**: URLs sin datos válidos muestran error
4. **Estado del pedido**: Solo pedidos "pendientes" pueden cambiar a "pagado"
5. **Verificación con MercadoPago**: Siempre se consulta la fuente de verdad

### ⚠️ Limitaciones conocidas:

1. **Requiere que el usuario regrese**: Si cierra la ventana, necesita acción manual
2. **Delay de MercadoPago**: Puede haber demora de segundos (mitigado con reintentos)
3. **No hay notificación automática**: Sin webhook, el usuario debe verificar manualmente

---

## Recomendaciones para el usuario

### En la UI, se deben mostrar estos mensajes:

**En /checkout/success (si hay error):**
> "¿Qué hacer ahora?
> - Revisa tu email de confirmación de MercadoPago
> - Ve a 'Mis Pedidos' y haz clic en 'Verificar si ya pagué'
> - Si el problema persiste, contacta a soporte"

**En /mis-pedidos (pedidos pendientes):**
> "¿Ya pagaste pero el estado no se actualizó? Haz clic en 'Verificar si ya pagué'"

---

## Testing de escenarios

### Escenario normal:
1. Agregar productos al carrito
2. Completar checkout
3. Pagar con tarjeta de prueba
4. Verificar que se redirige a /success
5. Verificar que stock se descuenta

### Escenario de recuperación:
1. Completar checkout
2. **Cerrar la ventana de MercadoPago después de pagar**
3. Ir a "Mis Pedidos"
4. Hacer clic en "Verificar si ya pagué"
5. Verificar que el pago se confirma y stock se descuenta

### Escenario de manipulación:
1. Acceder a /checkout/success sin parámetros
2. Verificar que muestra error apropiado
3. Acceder con pedidoId de otro usuario
4. Verificar que se rechaza con 403

---

## Conclusión

El sistema es **robusto y seguro**, con protecciones implementadas para todos los escenarios edge cases.

**Ventajas:**
- ✅ Funciona sin webhook (desarrollo y producción)
- ✅ Recuperación manual disponible
- ✅ Protecciones contra manipulación
- ✅ Idempotencia garantizada

**Limitaciones aceptables:**
- ⚠️ Requiere que el usuario complete el flujo de redirección
- ⚠️ Si cierra ventana, necesita verificación manual (pero tiene UI para hacerlo)

**Próximos pasos opcionales:**
1. Implementar email de confirmación
2. Agregar cron job para auto-verificar pedidos pendientes
3. Dashboard de admin para ver pedidos pendientes de verificación
