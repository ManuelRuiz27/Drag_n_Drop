import { useContext } from 'react';

import { CanvasStateContext, type CanvasState } from './canvasStateContext';

export function useCanvasState(): CanvasState {
  const context = useContext(CanvasStateContext);

  if (!context) {
    throw new Error('useCanvasState must be used within a CanvasStateProvider');
  }

  return context;
}
