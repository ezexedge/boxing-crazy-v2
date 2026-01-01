# 🚀 Inicio Rápido - MercadoPago

## ⚡ 5 Pasos para Comenzar

### 1️⃣ Obtener Credenciales TEST

1. Ir a https://www.mercadopago.com.ar/developers/panel/app
2. Crear o seleccionar una aplicación
3. Click en **"Credenciales de prueba"**
4. Copiar:
   - Public Key (TEST-...)
   - Access Token (TEST-...)

### 2️⃣ Configurar Variables de Entorno

Crear/editar `.env`:

```bash
MERCADOPAGO_ACCESS_TOKEN=TEST-tu-access-token-aqui
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=TEST-tu-public-key-aqui
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3️⃣ Reiniciar el Servidor

```bash
npm run dev
```

### 4️⃣ Probar el Flujo

1. Agregar productos al carrito
2. Ir a `/checkout`
3. Completar el formulario
4. Click en **"Pagar con MercadoPago"**
5. Usar tarjeta de prueba:
   - **Número:** 4509 9535 6623 3704
   - **CVV:** 123
   - **Fecha:** 11/25
   - **Titular:** APRO (para aprobar)

### 5️⃣ Configurar Webhook (Para recibir notificaciones)

#### Opción A: Usar ngrok (Recomendado para desarrollo local)

```bash
# Instalar ngrok
npm install -g ngrok

# Ejecutar en otra terminal
ngrok http 3000
```

Copiar la URL HTTPS que da ngrok (ej: `https://abc123.ngrok.io`)

#### Opción B: Configurar en MercadoPago

1. Ir a https://www.mercadopago.com.ar/developers/panel/app
2. Seleccionar tu aplicación
3. Click en **"Webhooks"**
4. Agregar URL: `https://tu-url-de-ngrok.ngrok.io/api/webhooks/mercadopago`
5. Seleccionar evento: **"Pagos"**
6. Guardar

## ✅ Verificar que Funciona

Después de hacer un pago de prueba:

1. **Frontend:** Deberías ser redirigido a `/checkout/success`
2. **Backend:** En los logs del servidor deberías ver:
   ```
   [MercadoPago Webhook] Payment status: approved
   [MercadoPago Webhook] Order updated to paid: xxx
   [MercadoPago Webhook] Stock reduced for ...
   ```
3. **Base de datos:** El pedido debe estar con estado `pagado`
4. **Stock:** El stock de los productos debe haberse reducido

## 🐛 Problemas Comunes

### El modal de MercadoPago no se abre

**Solución:**
1. Verifica que `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` esté en `.env`
2. Reinicia el servidor (`Ctrl+C` y `npm run dev`)
3. Revisa la consola del navegador por errores

### El webhook no se ejecuta

**Solución:**
1. Asegúrate de que ngrok esté corriendo
2. Verifica que la URL del webhook en MercadoPago sea la de ngrok + `/api/webhooks/mercadopago`
3. Revisa los logs del servidor

### El stock no se reduce

**Solución:**
1. Verifica que el webhook esté configurado correctamente
2. Revisa los logs del servidor
3. Verifica que el pago se haya aprobado (estado `approved`)

## 📚 Documentación Completa

Para más detalles, consulta: **MERCADOPAGO_SETUP.md**

## 🎯 Siguiente Paso: Producción

Cuando estés listo para producción:

1. Obtener credenciales de **producción** (no TEST)
2. Actualizar `.env` con credenciales de producción
3. Configurar `NEXT_PUBLIC_BASE_URL` con tu dominio real
4. Configurar webhook con URL HTTPS de producción
5. ¡Listo para recibir pagos reales!

---

**¿Necesitas ayuda?** Revisa MERCADOPAGO_SETUP.md para más detalles.
