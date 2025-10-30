type ElementType =
  | 'mesa-redonda'
  | 'mesa-cuadrada'
  | 'pista-baile'
  | 'barra'
  | 'salida';

interface ElementConfig {
  id: string;
  type: ElementType;
  capacity?: number;
  x: number;
  y: number;
  icon: string;
  width: number;
  height: number;
}

export type { ElementType, ElementConfig };
