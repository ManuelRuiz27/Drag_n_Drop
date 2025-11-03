import { useContext } from 'react';

import { CanvasContext, type CanvasContextValue } from './canvasContextBase';

export function useCanvasContext(): CanvasContextValue {
  const context = useContext(CanvasContext);

  if (!context) {
    throw new Error('useCanvasContext must be used within a CanvasProvider');
  }

  return context;
}
