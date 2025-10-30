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
}

interface CanvasState {
  elements: CanvasElement[];
  addElement: (element: Omit<CanvasElement, 'id'> & { id?: string }) => void;
}

const CanvasStateContext = createContext<CanvasState | undefined>(undefined);

export function CanvasStateProvider({ children }: PropsWithChildren) {
  const [elements, setElements] = useState<CanvasElement[]>([]);

  const addElement = useCallback((element: Omit<CanvasElement, 'id'> & { id?: string }) => {
    setElements((prev) => {
      const id = element.id ?? `element-${Date.now()}-${Math.round(Math.random() * 1_000)}`;
      return [...prev, { ...element, id }];
    });
  }, []);

  const value = useMemo(
    () => ({
      elements,
      addElement,
    }),
    [elements, addElement]
  );

  return <CanvasStateContext.Provider value={value}>{children}</CanvasStateContext.Provider>;
}

export function useCanvasState() {
  const context = useContext(CanvasStateContext);
  if (!context) {
    throw new Error('useCanvasState must be used within a CanvasStateProvider');
  }
  return context;
}

