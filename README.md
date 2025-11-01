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

## Endpoint de mapa de asientos de ejemplo

Se expone un endpoint de solo lectura para pruebas de la experiencia de boletera movil.

- **URL:** `GET /api/seat-map.json`
- **Descripcion:** Devuelve la configuracion del mapa de asientos, incluyendo sala, pantalla, moneda y estado de cada asiento.
- **Respuesta 200 (fragmento abreviado):**

```json
{
  "auditorium": "Sala Premium",
  "screen": "Pantalla IMAX",
  "currency": "MXN",
  "basePrice": 95,
  "rows": [
    {
      "label": "A",
      "seats": [
        { "id": "A1", "status": "reserved" },
        { "id": "A2", "status": "reserved" },
        { "id": "A3", "status": "available" },
        { "id": "A4", "status": "available" }
      ]
    }
  ]
}
```

> Los campos `rows` y `seats` pueden ampliarse segun el aforo necesario. Los estados permitidos para un asiento son `available`, `reserved` y `occupied`.

Este endpoint se sirve desde la carpeta `public/api` del proyecto, por lo que Vite lo hace disponible automaticamente en modo `dev` y en builds de produccion.
