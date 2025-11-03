import { useCallback, useMemo, useState, type PropsWithChildren } from 'react';

import {
  CanvasStateContext,
  DEFAULT_ELEMENT_SIZE,
  type CanvasElement,
  type CanvasState,
} from './canvasStateContext';

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

  const value = useMemo<CanvasState>(
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

