# Backend API Specification

Este documento resume los contratos que el frontend espera consumir. Usa ASCII plano para evitar problemas de codificacion.

## Base URL y autenticacion

- Todas las rutas se resuelven contra `VITE_API_BASE_URL` (ejemplo: `http://localhost:3000`).
- Se recomienda proteger los endpoints con autenticacion Bearer y validar cabeceras `Authorization`.
- Implementa idempotency keys para `POST` sensibles (`Idempotency-Key` o similar).

## Modelos compartidos

### Orden

```json
{
  "orderId": "ORD-98342",
  "graduateId": "GRAD-28452",
  "concept": "Paquete experiencia ceremonia Drag",
  "currency": "MXN",
  "total": 2560,
  "items": [
    {
      "id": "item-1",
      "name": "Elemento 1",
      "quantity": 1,
      "unitPrice": 1250
    }
  ]
}
```

### Preferencia de Mercado Pago (request)

```json
{
  "amount": 2560,
  "currency": "MXN",
  "description": "Paquete experiencia ceremonia Drag",
  "orderId": "ORD-98342",
  "externalReference": "BBVA-872910",
  "items": [
    {
      "id": "item-1",
      "title": "Elemento 1",
      "quantity": 1,
      "unitPrice": 1250
    }
  ],
  "metadata": {
    "graduateId": "GRAD-28452"
  },
  "payer": {
    "email": "daniela.martinez@example.com",
    "name": "Daniela",
    "surname": "Martinez"
  },
  "redirectUrls": {
    "success": "https://app.example.com/#/payments?status=success",
    "pending": "https://app.example.com/#/payments?status=pending",
    "failure": "https://app.example.com/#/payments?status=failure"
  }
}
```

### Preferencia de Mercado Pago (response)

```json
{
  "preferenceId": "PREF-123",
  "initPoint": "https://www.mercadopago.com/init?pref_id=PREF-123",
  "sandboxInitPoint": "https://sandbox.mercadopago.com/init?pref_id=PREF-123",
  "expiresAt": "2025-11-03T22:15:00Z"
}
```

### Estado de pago

```json
{
  "id": "987654321",
  "status": "approved",
  "statusDetail": "accredited",
  "amount": 2560,
  "currency": "MXN",
  "approvedAt": "2025-11-02T02:45:31Z",
  "orderId": "ORD-98342",
  "metadata": {
    "graduateId": "GRAD-28452"
  }
}
```

### QR CoDi (response)

```json
{
  "codiId": "CODI-123",
  "qrData": "data:image/svg+xml;base64,...",
  "deeplink": "codi://qr/123",
  "expiresAt": "2025-11-02T12:25:00Z"
}
```

### Estado de cobro CoDi

```json
{
  "codiId": "CODI-123",
  "status": "authorized",
  "authorizedAt": "2025-11-02T12:21:18Z",
  "payerAccount": "BBVA-1234",
  "amount": 2560,
  "currency": "MXN",
  "updatedAt": "2025-11-02T12:21:18Z"
}
```

### Referencia SPEI

```json
{
  "reference": "BBVA-872910",
  "clabe": "012345678901234567",
  "alias": "DragPayments BBVA",
  "status": "pending"
}
```

## Endpoints requeridos

### POST /api/mercadopago/preferences

- Valida y crea la preferencia usando el SDK de Mercado Pago.
- Responde con el formato de preferencia descrito arriba.
- Adjunta `external_reference` e `idempotency` para evitar duplicados.

### GET /api/mercadopago/payments/:id

- Devuelve el estado del pago (`status`, `statusDetail`, `approvedAt`).
- Debe permitir buscar por `payment_id`, `merchant_order_id` o `preferenceId`.

### POST /api/codi/qr

- Genera un QR dinamico firmado por el banco emisor.
- Requiere `amount`, `concept`, `orderId` y `expirationMinutes`.

### GET /api/codi/charges/:codiId

- Consulta el estado del cobro. Usa estrategias de polling y webhooks.

### POST /api/spei/references

- Crea una referencia SPEI unica y devuelve CLABE/alias.
- Opcional: adjunta `expiresAt` y `amount` para conciliacion automatica.

### Webhooks sugeridos

| Evento | Endpoint | Notas |
| --- | --- | --- |
| `payment.updated` | `POST /api/webhooks/mercadopago` | Firma HMAC, valida idempotencia |
| `merchant_order.updated` | `POST /api/webhooks/mercadopago` | Sincroniza estados de la orden |
| `charge.authorized` | `POST /api/webhooks/codi` | Actualiza estado CoDi a `authorized` |
| `charge.expired` | `POST /api/webhooks/codi` | Marca QR expirado |
| `spei.received` | `POST /api/webhooks/spei` | Conciliacion de transferencias |

## Modelado sugerido

- **Orders**: registra detalle de graduado, items, metodos de pago disponibles y estado actual.
- **PaymentIntents** (uno por metodo): almacena `preferenceId`, `status`, timestamps y metadata.
- **CoDiCharges**: relaciona `codiId`, `orderId`, estado y datos de la cuenta pagadora.
- **SpeiReferences**: contiene referencia, monto esperado, vigencia y comprobantes.
- **AuditTrail**: log de eventos (webhooks, actualizaciones manuales, reintentos).

## Mock API

`npm run mock:api` levanta un servidor estatico que cubre los endpoints anteriores con datos ficticios. Usa este mock solo para pruebas locales; el backend real debe reemplazar cada endpoint siguiendo la especificacion y agregando seguridad, validaciones y manejo de errores apropiados.