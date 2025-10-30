import { CanvasStage } from './components/CanvasStage';

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-semibold tracking-tight text-white">Drag n Drop Playground</h1>
          <span className="text-sm text-slate-400">Build interactive experiences faster</span>
        </div>
      </header>
      <main className="mx-auto flex max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Canvas</h2>
          <p className="text-sm text-slate-400">
            This is a placeholder canvas. Replace it with your drag-and-drop workspace when ready.
          </p>
          <CanvasStage />
        </section>
      </main>
    </div>
  );
}

export default App;
