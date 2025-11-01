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
