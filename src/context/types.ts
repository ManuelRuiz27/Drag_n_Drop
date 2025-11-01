type ElementType =
  | 'mesa-redonda'
  | 'mesa-cuadrada'
  | 'pista-baile'
  | 'barra'
  | 'salida'
  | 'limite'
  | 'franja'
  | 'etiqueta'
  | 'banos'
  | 'cabina-sonido'
  | 'cocina';

interface ElementConfig {
  id: string;
  type: ElementType;
  capacity?: number;
  x: number;
  y: number;
  icon: string;
  width: number;
  height: number;
  rotation?: number;
  text?: string;
  imageKey?: string;
}

export type { ElementType, ElementConfig };
