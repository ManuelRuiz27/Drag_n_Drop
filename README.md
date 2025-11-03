# Drag_n_Drop

Drag_n_Drop es un playground visual para crear distribuciones de elementos arrastrables sobre un lienzo.

## Persistir la distribucion en tu API

El helper `persistDesignToApi` (`src/utils/export.ts`) permite enviar el JSON generado por el lienzo a cualquier endpoint HTTP para que tu backend lo guarde en base de datos. Ejemplo rapido:

```ts
import { persistDesignToApi } from './src/utils/export';

await persistDesignToApi(exportableElements, 'https://mi-api.com/event-layouts', {
  method: 'POST',
  token: 'mi-token-opcional',
});
```

El helper usa `exportDesignToJSON` para serializar los elementos y realiza la peticion con `fetch`, lanzando un error si el servidor responde con un estado distinto de 2xx. Ajusta los `headers` o el `method` segun lo que requiera tu API.

## Endpoint de distribucion de mesas de ejemplo

Se expone un endpoint de solo lectura para probar la experiencia de seleccion de mesas con listas de espera.

- **URL:** `GET /api/table-map.json`
- **Descripcion:** Devuelve la configuracion de mesas disponible para reservaciones, incluyendo capacidad, consumo minimo, disponibilidad por asiento y estado de las listas de espera.
- **Respuesta 200 (fragmento abreviado):**

```json
{
  "venue": "Terraza Central",
  "zone": "Zona Lounge Premium",
  "currency": "MXN",
  "coverCharge": 180,
  "tables": [
    {
      "id": "T-01",
      "name": "Mesa Aurora",
      "capacity": 6,
      "minimumSpend": 900,
      "seats": [
        { "id": "A1", "label": "1", "status": "occupied" },
        { "id": "A2", "label": "2", "status": "available" }
      ],
      "waitlist": [
        { "id": "WL-1001", "timestamp": "2025-11-01T22:00:00Z" }
      ]
    }
  ],
  "waitlistPolicy": {
    "maxPerTable": 3,
    "maxGlobal": 30,
    "estimatedWaitMinutes": 18,
    "notes": "La lista se atiende por orden de llegada y requiere confirmacion dentro de 10 minutos."
  }
}
```

Consideraciones clave del payload:

- Cada mesa define `capacity`, `minimumSpend` y los asientos individuales con su `status`. Los valores validos para `status` son `available`, `reserved`, `occupied` y `blocked`.
- El campo `waitlist` refleja la cola actual por mesa; cada entrada contiene un identificador y el `timestamp` de registro. No se exponen datos personales.
- `waitlistPolicy` documenta el limite de personas en espera por mesa y global, ademas de un estimado de minutos para rotacion. Esta seccion debe mantenerse sincronizada con las reglas operativas de la sede.
- `coverCharge` permite calcular el total estimado por asiento seleccionado en el frontend.

El endpoint vive en `public/api`, por lo que Vite lo expone automaticamente tanto en desarrollo como en builds de produccion.

## Centro de pagos

Los flujos `/#graduate` y `/#payments` consumen endpoints externos documentados en `docs/backend-api.md`. Asegurate de revisar ese archivo para conocer los contratos, modelos de datos y webhooks requeridos.

### Integracion Mercado Pago Checkout Pro

1. **Backend**: implementa `POST /api/mercadopago/preferences` segun la especificacion y devuelve al menos `initPoint`, `sandboxInitPoint`, `preferenceId` y `expiresAt`.
2. **Webhooks**: registra `POST /api/webhooks/mercadopago` para recibir `payment.updated` y `merchant_order.updated`.
3. **Variables de entorno**:
   - Backend: `MP_ACCESS_TOKEN`, `MP_INTEGRATOR_ID`, URLs de webhooks publicos.
   - Frontend: define `VITE_API_BASE_URL` apuntando a tu API (por defecto `http://localhost:3000`) y `VITE_MERCADOPAGO_PUBLIC_KEY` para inicializar el SDK JS.
4. **Redirecciones**: el cliente arma `redirectUrls` usando `window.location.origin`; ajusta en tu backend si necesitas dominios distintos.

El boton "Crear preferencia y pagar" llama al endpoint, abre el checkout embebido (o redirige al `initPoint`) y deja registrado el `preferenceId` para consultar el estado del pago.

### Mock API local

Para desarrollo puedes emular la API de pagos ejecutando:

```bash
npm run mock:api
```

El mock escucha en `http://localhost:3000` e implementa:

- `POST /api/mercadopago/preferences`
- `GET /api/mercadopago/payments/:id`
- `POST /api/codi/qr`
- `GET /api/codi/charges/:codiId`
- `POST /api/spei/references`

Consulta `docs/backend-api.md` para ver la estructura exacta de los payloads y las responsabilidades del backend real.

## Extras y carrito de graduado

El catalogo de extras se encuentra en `src/data/storeProducts.ts`. El carrito de `/#graduate` y el modulo de pago reutilizan esta lista para calcular totales.