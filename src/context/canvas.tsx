import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

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

interface CanvasState {
  elements: CanvasElement[];
  addElement: (element: Omit<CanvasElement, 'id'> & { id?: string }) => void;
  removeElement: (id: string) => void;
  updateElement: (id: string, updates: Partial<Omit<CanvasElement, 'id'>>) => void;
}

const CanvasStateContext = createContext<CanvasState | undefined>(undefined);

export const DEFAULT_ELEMENT_SIZE = 96;

export function CanvasStateProvider({ children }: PropsWithChildren): JSX.Element {
  const [elements, setElements] = useState<CanvasElement[]>([]);

  const addElement = useCallback((element: Omit<CanvasElement, 'id'> & { id?: string }) => {
    setElements((prev) => {
      const id = element.id ?? `element-${Date.now()}-${Math.round(Math.random() * 1_000)}`;
      const size = element.size ?? DEFAULT_ELEMENT_SIZE;
      const width = element.width ?? size;
      const height = element.height ?? size;
      const rotation = element.rotation ?? 0;
      return [...prev, { ...element, id, size, width, height, rotation }];
    });
  }, []);

  const removeElement = useCallback((id: string) => {
    setElements((prev) => prev.filter((element) => element.id !== id));
  }, []);

  const updateElement = useCallback((id: string, updates: Partial<Omit<CanvasElement, 'id'>>) => {
    setElements((prev) => prev.map((element) => (element.id === id ? { ...element, ...updates } : element)));
  }, []);

  const value = useMemo(
    () => ({
      elements,
      addElement,
      removeElement,
      updateElement,
    }),
    [elements, addElement, removeElement, updateElement]
  );

  return <CanvasStateContext.Provider value={value}>{children}</CanvasStateContext.Provider>;
}

export function useCanvasState(): CanvasState {
  const context = useContext(CanvasStateContext);
  if (!context) {
    throw new Error('useCanvasState must be used within a CanvasStateProvider');
  }
  return context;
}

