# Configuración de MercadoPago - Checkout Pro

Esta guía te ayudará a configurar MercadoPago Checkout Pro en tu aplicación de e-commerce.

## 📋 Requisitos Previos

1. Cuenta de MercadoPago (crear en [mercadopago.com](https://www.mercadopago.com))
2. Credenciales de MercadoPago (Access Token y Public Key)

## 🔑 Paso 1: Obtener Credenciales

### Modo Test (Desarrollo)

1. Ingresa a tu cuenta de MercadoPago
2. Ve a **[Tus integraciones](https://www.mercadopago.com.ar/developers/panel/app)**
3. Crea una aplicación o selecciona una existente
4. Ve a **Credenciales de prueba**
5. Copia:
   - **Public Key** (comienza con `TEST-...`)
   - **Access Token** (comienza con `TEST-...`)

### Modo Producción

1. En la misma sección de credenciales
2. Ve a **Credenciales de producción**
3. Completa el formulario de activación
4. Copia:
   - **Public Key** (comienza con `APP_USR-...`)
   - **Access Token** (comienza con `APP_USR-...`)

## ⚙️ Paso 2: Configurar Variables de Entorno

Edita el archivo `.env` en la raíz del proyecto y agrega:

```bash
# MercadoPago Configuration
MERCADOPAGO_ACCESS_TOKEN=TEST-1234567890-123456-abcdef1234567890abcdef1234567890-123456789
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=TEST-abcdef12-3456-7890-abcd-ef1234567890

# Base URL (para webhooks)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**IMPORTANTE:**
- En **desarrollo** usa las credenciales **TEST**
- En **producción** usa las credenciales **APP_USR**
- El `NEXT_PUBLIC_BASE_URL` debe ser tu dominio real en producción

## 🔗 Paso 3: Configurar Webhooks (Producción)

Para recibir notificaciones de pagos en tiempo real:

### Opción A: Usando Ngrok (Desarrollo Local)

1. Instala ngrok: `npm install -g ngrok`
2. Ejecuta: `ngrok http 3000`
3. Copia la URL que te da (ej: `https://abc123.ngrok.io`)
4. Usa esta URL en la configuración de webhooks

### Opción B: Configurar en MercadoPago

1. Ve a **[Tus integraciones](https://www.mercadopago.com.ar/developers/panel/app)**
2. Selecciona tu aplicación
3. Ve a **Webhooks**
4. Agrega una nueva URL:
   ```
   https://tudominio.com/api/webhooks/mercadopago
   ```
5. Selecciona el evento: **Pagos**
6. Guarda

## 🧪 Paso 4: Probar en Modo Test

### Usuarios de Prueba

MercadoPago provee usuarios de prueba para simular compras:

1. Ve a **[Usuarios de prueba](https://www.mercadopago.com.ar/developers/panel/test-users)**
2. Crea dos usuarios:
   - **Vendedor** (tu aplicación)
   - **Comprador** (para hacer compras de prueba)

### Tarjetas de Prueba

Para Argentina:

| Tarjeta | Número | CVV | Fecha | Resultado |
|---------|--------|-----|-------|-----------|
| Visa | 4509 9535 6623 3704 | 123 | 11/25 | ✅ Aprobado |
| Mastercard | 5031 7557 3453 0604 | 123 | 11/25 | ✅ Aprobado |
| Visa | 4013 5406 8274 6260 | 123 | 11/25 | ❌ Rechazado |

**Más tarjetas de prueba:** [Documentación oficial](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards)

## 🚀 Paso 5: Flujo de Pago

### Cómo funciona:

1. **Usuario completa el checkout**
   - Selecciona productos
   - Completa datos de facturación
   - Click en "Pagar con MercadoPago"

2. **Backend crea la preferencia de pago**
   - Endpoint: `/api/checkout/create`
   - Crea un pedido en la DB (estado: `pendiente`)
   - Genera preferencia de MercadoPago
   - Retorna `preferenceId`

3. **MercadoPago abre modal de pago**
   - SDK de MercadoPago carga el checkout
   - Usuario ingresa datos de tarjeta
   - Procesa el pago

4. **Redirección según resultado**
   - ✅ **Éxito:** `/checkout/success?pedidoId=xxx`
   - ❌ **Error:** `/checkout/failure`
   - ⏳ **Pendiente:** `/checkout/pending`

5. **Webhook actualiza el pedido**
   - MercadoPago envía notificación
   - Endpoint: `/api/webhooks/mercadopago`
   - Verifica el pago con la API
   - Actualiza estado del pedido
   - **Reduce stock de productos**

## 🛠️ Estructura del Código

### Archivos clave:

```
app/
├── api/
│   ├── checkout/
│   │   ├── create/route.ts          # Crea preferencia de pago
│   │   └── get-public-key/route.ts  # Retorna Public Key
│   └── webhooks/
│       └── mercadopago/route.ts     # Recibe notificaciones
├── checkout/
│   ├── page.tsx                     # Página de checkout
│   ├── success/page.tsx             # Página de éxito
│   ├── failure/page.tsx             # Página de error
│   └── pending/page.tsx             # Página de pago pendiente
components/
├── checkout-success-client.tsx      # Componente de éxito
└── checkout-failure-client.tsx      # Componente de error
lib/
└── mercadopago.ts                   # Configuración de SDK
```

## 🔍 Debugging

### Verificar configuración:

```bash
# En la consola del navegador (checkout page)
console.log('MP Public Key:', mpPublicKey)

# En logs del servidor
[MercadoPago Webhook] Received: {...}
[MercadoPago Webhook] Payment status: approved
```

### Errores comunes:

#### ❌ "Error al cargar la configuración de pago"
- Verifica que `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` esté en `.env`
- Reinicia el servidor después de cambiar `.env`

#### ❌ "MercadoPago is not defined"
- Verifica que el SDK se cargue correctamente
- Revisa la consola del navegador por errores de red

#### ❌ Webhook no se ejecuta
- Verifica que la URL del webhook esté correctamente configurada
- En desarrollo, usa ngrok para exponer tu servidor local
- Verifica los logs del servidor

#### ❌ Stock no se reduce
- Verifica que el webhook esté recibiendo notificaciones
- Verifica que el estado del pago sea "approved"
- Revisa los logs del webhook

## 📊 Monitoreo

### Ver pagos en MercadoPago:

1. Ve a **[Actividad](https://www.mercadopago.com.ar/activities)**
2. Filtra por fecha
3. Verifica el estado de cada pago

### Ver webhooks recibidos:

1. Ve a tu aplicación en el panel de desarrolladores
2. Click en **Webhooks**
3. Ve al historial de notificaciones

## 🔒 Seguridad en Producción

### Checklist:

- [ ] Usar credenciales de **producción** (no TEST)
- [ ] Configurar `NEXT_PUBLIC_BASE_URL` con tu dominio real
- [ ] Habilitar HTTPS en tu servidor
- [ ] Configurar webhook con URL HTTPS
- [ ] Nunca exponer el Access Token en el frontend
- [ ] Validar siempre los pagos con la API de MercadoPago
- [ ] Implementar rate limiting en el webhook
- [ ] Logging de todas las transacciones

## 📱 Soporte

- **Documentación oficial:** https://www.mercadopago.com.ar/developers/es/docs
- **SDK Node.js:** https://github.com/mercadopago/sdk-nodejs
- **Centro de ayuda:** https://www.mercadopago.com.ar/ayuda

## 🎯 Próximos Pasos

1. Probar el flujo completo en modo test
2. Verificar que los webhooks funcionen correctamente
3. Revisar que el stock se reduzca al aprobar un pago
4. Configurar credenciales de producción
5. Configurar webhook en producción
6. Realizar una compra de prueba en producción con tarjeta real
7. Monitorear los primeros pagos

---

**¿Necesitas ayuda?** Revisa los logs del servidor y la consola del navegador para más información sobre errores.
