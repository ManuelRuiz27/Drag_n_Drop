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
## Integracion Mercado Pago Checkout Pro

El flujo de pago expuesto en `/#graduate` y `/#payments` utiliza Mercado Pago Checkout Pro.

1. **Backend**: implementa el endpoint `POST /api/mercadopago/preferences` tal como se describe en `readme_API.md`. Debe crear la preferencia con el SDK oficial y devolver al menos `initPoint`, `sandboxInitPoint` y `preferenceId`.
2. **Webhooks**: registra `POST /api/webhooks/mercadopago` para recibir `payment.updated` y conciliar estados.
3. **Variables de entorno**:
   - Backend: `MP_ACCESS_TOKEN` (TEST-* o LIVE-*), `MP_INTEGRATOR_ID` y la URL publica para webhooks.
   - Frontend: agrega en `./.env.local` la ruta base de tu API: `VITE_API_BASE_URL=http://localhost:3000`. Si usas el SDK JS de Mercado Pago puedes añadir `VITE_MERCADOPAGO_PUBLIC_KEY=TEST-...`.
4. **Redirecciones**: el cliente genera callbacks basados en `window.location.origin`, ajusta en tu backend si necesitas URLs diferentes.

El boton "Crear preferencia y pagar" crea la preferencia y abre el `initPoint` en una nueva ventana. Si el backend responde con error, el mensaje se muestra debajo del boton.

## Extras y carrito de graduado

El catalogo de extras se encuentra en `src/data/storeProducts.ts`. El carrito de `/#graduate` y el modulo de pago reutilizan esta lista para calcular totales.
