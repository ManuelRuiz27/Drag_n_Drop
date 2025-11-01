/**
 * Map of custom icon keys to image URLs. Populate this object with your own assets
 * (for example, files placed under `src/assets/icons/`) so the canvas can render them.
 *
 * Example:
 * export default {
 *   'mesa-redonda': new URL('../assets/icons/mesa-redonda.png', import.meta.url).href,
 * };
 */
const CUSTOM_ICON_REGISTRY: Record<string, string> = {
  'mesa-redonda': new URL('../assets/icons/mesa-reonda.png', import.meta.url).href,
  'mesa-cuadrada': new URL('../assets/icons/mesa-cuadrada.png', import.meta.url).href,
  'pista-baile': new URL('../assets/icons/pista-baile.png', import.meta.url).href,
  barra: new URL('../assets/icons/barra.png', import.meta.url).href,
  banos: new URL('../assets/icons/banos.png', import.meta.url).href,
  'cabina-sonido': new URL('../assets/icons/cabina-sonido.png', import.meta.url).href,
  cocina: new URL('../assets/icons/cocina.png', import.meta.url).href,
};

export default CUSTOM_ICON_REGISTRY;
