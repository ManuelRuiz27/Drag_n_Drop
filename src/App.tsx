import { DndContext } from '@dnd-kit/core';

import { Canvas } from './components/Canvas';
import { ToolPalette } from './components/ToolPalette';
import { CanvasStateProvider } from './context';

function App() {
  return (
    <CanvasStateProvider>
      <DndContext>
        <div className="min-h-screen bg-slate-950 text-slate-100">
          <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
              <h1 className="text-lg font-semibold tracking-tight text-white">Drag n Drop Playground</h1>
              <span className="text-sm text-slate-400">Build interactive experiences faster</span>
            </div>
          </header>
          <main className="mx-auto flex max-w-6xl flex-1 flex-col gap-10 px-6 py-10">
            <section className="space-y-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Workspace</h2>
                  <p className="text-sm text-slate-400">
                    Drag components from the tool palette onto the canvas to begin prototyping your layout.
                  </p>
                </div>
              </div>
              <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
                <aside className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Tool Palette</h3>
                    <p className="text-xs text-slate-500">Grab an element to place it on the canvas.</p>
                  </div>
                  <ToolPalette />
                </aside>
                <Canvas />
              </div>
            </section>
          </main>
        </div>
      </DndContext>
    </CanvasStateProvider>
  );
}

export default App;
