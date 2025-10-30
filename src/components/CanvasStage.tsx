import { useMemo } from 'react';

const GRID_SIZE = 16;
const GRID_COLOR = 'rgba(148, 163, 184, 0.12)';

export function CanvasStage() {
  const backgroundSize = useMemo(() => `${GRID_SIZE}px ${GRID_SIZE}px`, []);
  const backgroundImage = useMemo(
    () =>
      `linear-gradient(to right, ${GRID_COLOR} 1px, transparent 1px), linear-gradient(to bottom, ${GRID_COLOR} 1px, transparent 1px)`,
    []
  );

  return (
    <div
      className="h-[480px] w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-900"
      style={{ backgroundSize, backgroundImage }}
    >
      <div className="flex h-full w-full items-center justify-center">
        <span className="rounded-full bg-slate-800/70 px-4 py-2 text-sm text-slate-300">
          Canvas ready for widgets
        </span>
      </div>
    </div>
  );
}
