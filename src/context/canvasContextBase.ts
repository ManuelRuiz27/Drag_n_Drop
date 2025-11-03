import { createContext } from 'react';

import type { ElementConfig } from './types';

export interface CanvasContextValue {
  elements: ElementConfig[];
  addElement: (element: ElementConfig) => void;
  moveElement: (id: string, x: number, y: number) => void;
  updateElement: (id: string, updates: Partial<Omit<ElementConfig, 'id'>>) => void;
}

export const CanvasContext = createContext<CanvasContextValue | undefined>(undefined);
