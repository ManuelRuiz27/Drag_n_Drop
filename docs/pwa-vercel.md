# PWA & Vercel Deployment Guide

Este documento resume los pasos para trabajar con la configuracion PWA del proyecto y desplegarlo en Vercel.

## Vista rapida de la PWA

- La aplicacion usa `vite-plugin-pwa` con `registerType: "autoUpdate"` para mantener el Service Worker actualizado.
- Los recursos estaticos (HTML, JS, CSS) se almacenan en cache con estrategias `NetworkFirst` y `StaleWhileRevalidate`.
- Los assets en `public/api` usan `NetworkFirst` y un `networkTimeoutSeconds` de 5 segundos para conservar datos brevemente cuando no hay red.
- El manifiesto generado (`manifest.webmanifest`) define iconos, colores y modo `standalone`; los PNG viven en `public/icons`.

### Como probar la instalacion

```bash
npm run build
npm run preview
```

1. Abre `http://localhost:4173`.
2. Ejecuta Lighthouse (Chrome DevTools) y valida la auditoria PWA.
3. Usa la opcion Instalar del navegador o el menu de tres puntos en Android.

## Despliegue en Vercel

El archivo `vercel.json` establece:

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Pasos sugeridos:

1. **Proyecto**: importa el repositorio en Vercel y selecciona la rama `main` o la rama feature correspondiente.
2. **Variables**: declara en Vercel las mismas variables que usas en `.env` o `.env.local`.
3. **Build y Deploy**: Vercel ejecutara `npm install` y `npm run build`; el resultado en `dist` se publica como sitio estatico con fallback SPA (`/index.html`).
4. **Post deploy**: corre Lighthouse y prueba la instalacion desde la URL publica.

### Checks locales antes de subir cambios

- `npm run lint` para verificar reglas ESLint.
- `npm run test` (si aplica) y `npm run build` para anticipar errores del pipeline de CI o Vercel.
