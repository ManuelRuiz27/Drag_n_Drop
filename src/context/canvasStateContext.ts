import { createContext } from 'react';

export interface CanvasElement {
  id: string;
  type: string;
  x: number;
  y: number;
  capacity?: number;
  size: number;
  width: number;
  height: number;
  rotation: number;
  text?: string;
  imageKey?: string;
}

export interface CanvasState {
  elements: CanvasElement[];
  addElement: (element: Omit<CanvasElement, 'id'> & { id?: string }) => void;
  removeElement: (id: string) => void;
  updateElement: (id: string, updates: Partial<Omit<CanvasElement, 'id'>>) => void;
}

export const DEFAULT_ELEMENT_SIZE = 96;

export const CanvasStateContext = createContext<CanvasState | undefined>(undefined);
