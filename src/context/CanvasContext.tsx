import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import type { ElementConfig } from './types';

interface CanvasContextValue {
  elements: ElementConfig[];
  addElement: (element: ElementConfig) => void;
  moveElement: (id: string, x: number, y: number) => void;
  updateElement: (id: string, updates: Partial<Omit<ElementConfig, 'id'>>) => void;
}

const CanvasContext = createContext<CanvasContextValue | undefined>(undefined);

export function CanvasProvider({ children }: PropsWithChildren): JSX.Element {
  const [elements, setElements] = useState<ElementConfig[]>([]);

  const addElement = useCallback((element: ElementConfig) => {
    setElements((prev) => {
      const exists = prev.some((item) => item.id === element.id);
      if (exists) {
        return prev.map((item) => (item.id === element.id ? { ...item, ...element } : item));
      }
      return [...prev, element];
    });
  }, []);

  const moveElement = useCallback((id: string, x: number, y: number) => {
    setElements((prev) => prev.map((element) => (element.id === id ? { ...element, x, y } : element)));
  }, []);

  const updateElement = useCallback(
    (id: string, updates: Partial<Omit<ElementConfig, 'id'>>) => {
      setElements((prev) =>
        prev.map((element) => (element.id === id ? { ...element, ...updates } : element))
      );
    },
    []
  );

  const value = useMemo(
    () => ({
      elements,
      addElement,
      moveElement,
      updateElement,
    }),
    [elements, addElement, moveElement, updateElement]
  );

  return <CanvasContext.Provider value={value}>{children}</CanvasContext.Provider>;
}

export function useCanvasContext(): CanvasContextValue {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error('useCanvasContext must be used within a CanvasProvider');
  }
  return context;
}

export { CanvasContext };
