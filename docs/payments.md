# Centro de pagos

Este resumen describe los flujos expuestos en `PaymentFlowPage.tsx` para cerrar pagos con Mercado Pago Checkout Pro y CoDi.

## Mercado Pago Checkout Pro

- El boton **Crear preferencia y pagar** llama a `POST /api/mercadopago/preferences` con el detalle de la orden, datos del pagador y las URLs de retorno. El helper `apiRequest` toma `VITE_API_BASE_URL` como raiz.
- El modal muestra la preferencia devuelta (`preferenceId`, `initPoint`, `expiresAt`) y permite copiar el enlace para compartirlo.
- Se carga el SDK web de Mercado Pago (`https://sdk.mercadopago.com/js/v2`) usando `VITE_MERCADOPAGO_PUBLIC_KEY`. Si la preferencia se genera con exito, el checkout se abre en overlay; en caso contrario se redirige al `initPoint` como respaldo.
- Se puede consultar el estado de un pago con `GET /api/mercadopago/payments/:id`. Por defecto usa el `preferenceId` generado o bien puedes ingresar manualmente el identificador del cobro.
- Los totales se recalculan desde `calculateOrderTotals` para mantener consistencia con otros modulos.

## CoDi QR

- El boton **Generar QR CoDi** consume `POST /api/codi/qr` con `amount`, `concept`, `orderId` y vigencia de 5 minutos. Al recibir `qrData` se dibuja el codigo y se habilita el deeplink.
- Cada 7 segundos se consulta `GET /api/codi/charges/:codiId` hasta recibir un estado final (`authorized`, `completed`, `expired`, etc.). Tambien puedes forzar la consulta con **Actualizar estado**.
- El temporizador se actualiza en vivo para mostrar cuando el QR expira; si se agota se marca como `QR expirado`.
- La vista resume el concepto, orden, referencia y cuenta originadora reportada por el backend para auditar el cobro.

## Consejos operativos

1. Define en el backend middleware que anexe claves de idempotencia para los POST de preferencias y QR.
2. Expone webhooks (`/api/webhooks/mercadopago`, `/api/webhooks/codi`) para actualizar el estado sin depender solo del polling.
3. Usa el mismo `orderId` y `reference` en todos los metodos para poder conciliarlos desde el panel administrativo.
4. En dispositivos touch la vista muestra CTAs fijados en la parte inferior; verifica que la navegación no quede cubierta por barras del sistema (usa `safe-area` si tu hosting aplica).
5. Antes de cada despliegue valida `npm run lint` y `npm run build` para evitar errores en la integracion continua.
