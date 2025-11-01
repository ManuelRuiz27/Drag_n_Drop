import { DndContext } from '@dnd-kit/core';

import { Canvas } from './components/Canvas';
import { ToolPalette } from './components/ToolPalette';
import { CanvasStateProvider } from './context';

function App() {
  return (
    <CanvasStateProvider>
      <DndContext>
        <div className="min-h-screen bg-black text-[#c0c0c0]">
          <header className="border-b border-[#1f1f1f] bg-[#050505]/85 backdrop-blur">
            <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-8 py-5">
              <h1 className="text-lg font-semibold tracking-tight text-white">Drag n Drop Playground</h1>
              <span className="text-sm text-[#9a9a9a]">Build interactive experiences faster</span>
            </div>
          </header>
          <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-12 px-8 py-12">
            <section className="space-y-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Workspace</h2>
                  <p className="text-sm text-[#9a9a9a]">
                    Drag components from the tool palette onto the canvas to begin prototyping your layout.
                  </p>
                </div>
              </div>
              <div className="grid gap-10 lg:grid-cols-[minmax(220px,1fr)_minmax(0,3fr)]">
                <aside className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-[#d4af37]">Tool Palette</h3>
                    <p className="text-xs text-[#8a8a8a]">Grab an element to place it on the canvas.</p>
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
