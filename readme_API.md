# API requerida para el centro de pagos

Este documento resume los servicios que el front de flujos de pago espera consumir para operar con Mercado Pago, CoDi y BBVA, así como el sistema de referencias bancarias. Todos los ejemplos usan JSON y deben protegerse con autenticación basada en tokens (Bearer o JWT) y firma de webhooks.

## 1. Mercado Pago Checkout Pro

### 1.1 Crear preferencia
- **Endpoint:** `POST /api/mercadopago/preferences`
- **Body:**
  ```json
  {
    "amount": 2560.0,
    "currency": "MXN",
    "description": "Suscripción Drag Premium",
    "payer": {
      "email": "cliente@example.com",
      "name": "Nombre",
      "surname": "Apellido"
    },
    "metadata": {
      "orderId": "DX-92831",
      "reference": "MP-198234"
    },
    "redirectUrls": {
      "success": "https://drag.dev/pagos/success",
      "pending": "https://drag.dev/pagos/pending",
      "failure": "https://drag.dev/pagos/failure"
    }
  }
  ```
- **Respuesta:**
  ```json
  {
    "preferenceId": "123456789",
    "initPoint": "https://www.mercadopago.com/init?pref_id=123",
    "sandboxInitPoint": "https://sandbox.mercadopago.com/init?pref_id=123",
    "expiresAt": "2024-05-30T20:15:00Z"
  }
  ```

### 1.2 Consultar estado de pago
- **Endpoint:** `GET /api/mercadopago/payments/:id`
- **Respuesta:**
  ```json
  {
    "id": "987654321",
    "status": "approved",
    "statusDetail": "accredited",
    "amount": 2560.0,
    "currency": "MXN",
    "approvedAt": "2024-05-18T02:45:31Z",
    "orderId": "DX-92831"
  }
  ```

### 1.3 Webhook
- **Endpoint:** `POST /api/webhooks/mercadopago`
- **Eventos esperados:** `payment.updated`, `merchant_order.updated`, `subscription_authorized_payment.created`
- **Respuesta:** `200 OK` para confirmar la recepción.

## 2. CoDi®

### 2.1 Generar QR dinámico
- **Endpoint:** `POST /api/codi/qr`
- **Body:**
  ```json
  {
    "amount": 2560.0,
    "concept": "Drag Experience VIP",
    "orderId": "DX-92831",
    "expirationMinutes": 5
  }
  ```
- **Respuesta:**
  ```json
  {
    "codiId": "CODI-781234",
    "qrData": "data:image/svg+xml;base64,...",
    "deeplink": "codi://qr/781234",
    "expiresAt": "2024-05-18T12:25:00Z"
  }
  ```

### 2.2 Confirmar cobro
- **Endpoint:** `GET /api/codi/charges/:codiId`
- **Respuesta:**
  ```json
  {
    "codiId": "CODI-781234",
    "status": "authorized",
    "authorizedAt": "2024-05-18T12:21:18Z",
    "payerAccount": "BBVA-1234"
  }
  ```

### 2.3 Webhook de autorización
- **Endpoint:** `POST /api/webhooks/codi`
- **Eventos esperados:** `charge.authorized`, `charge.expired`
- **Respuesta:** `200 OK`.

## 3. SPEI BBVA

### 3.1 Generar referencia SPEI
- **Endpoint:** `POST /api/spei/references`
- **Body:**
  ```json
  {
    "amount": 2560.0,
    "concept": "Implementación plataforma Drag",
    "expiresAt": "2024-05-18T23:59:00Z"
  }
  ```
- **Respuesta:**
  ```json
  {
    "reference": "BBVA-872910",
    "clabe": "012345678901234567",
    "alias": "DragPayments BBVA",
    "status": "pending"
  }
  ```

### 3.2 Confirmar depósito SPEI
- **Endpoint:** `POST /api/spei/confirmations`
- **Body:**
  ```json
  {
    "reference": "BBVA-872910",
    "amount": 2560.0,
    "operationDate": "2024-05-18T15:32:21Z",
    "speiTrackingKey": "1234567890"
  }
  ```
- **Respuesta:** `202 Accepted` y proceso asíncrono para actualizar dashboards.

### 3.3 Descargar comprobante
- **Endpoint:** `GET /api/spei/receipts/:reference`
- **Respuesta:** PDF con el comprobante del depósito.

## 4. Sistema de referencias bancarias

### 4.1 Listado de referencias activas
- **Endpoint:** `GET /api/references`
- **Query params opcionales:** `status`, `method`, `from`, `to`
- **Respuesta:**
  ```json
  [
    {
      "id": "ref-01",
      "bank": "BBVA Empresarial",
      "reference": "BBVA-872910",
      "alias": "DragPayments BBVA",
      "status": "pending",
      "amount": 2560.0,
      "method": "spei",
      "expiresAt": "2024-05-18T23:59:00Z"
    }
  ]
  ```

### 4.2 Registrar conciliación manual
- **Endpoint:** `POST /api/references/:id/reconcile`
- **Body:**
  ```json
  {
    "status": "confirmed",
    "notes": "SPEI conciliado automáticamente",
    "receiptUrl": "https://drag.dev/storage/receipts/BBVA-872910.pdf"
  }
  ```
- **Respuesta:** `200 OK` con el registro actualizado.

## 5. Notificaciones y tiempo real
- **Canal websocket/sse:** `GET /api/events/stream`
- **Eventos:** `payment-status`, `reference-updated`, `codi-status`, `spei-confirmed`
- **Payload genérico:**
  ```json
  {
    "event": "payment-status",
    "data": {
      "method": "mercadopago",
      "status": "approved",
      "reference": "MP-198234"
    }
  }
  ```

## 6. Seguridad y cumplimiento
- Implementar **firma HMAC** para todos los webhooks.
- Registrar **idempotency keys** en todos los POST para evitar duplicados.
- Cumplir con lineamientos de **PCI DSS** para datos sensibles de tarjeta (la UI no captura PAN completos, pero la API debe tokenizar y almacenar con seguridad).
- Registrar auditoría (`POST /api/audit`) para cada cambio de estado relevante.

> Estas especificaciones aseguran que la API pueda alimentar las animaciones y estados del front, manteniendo trazabilidad completa en los tres métodos de cobro.
