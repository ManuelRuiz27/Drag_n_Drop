import { useEffect, useState } from 'react';
import { DndContext } from '@dnd-kit/core';

import { Canvas } from './components/Canvas';
import { ToolPalette } from './components/ToolPalette';
import { SeatSelectionPage } from './components/seat-selection/SeatSelectionPage';
import { PaymentFlowPage } from './components/payments/PaymentFlowPage';
import { CanvasStateProvider } from './context';

type RouteKey = 'workspace' | 'seat-selection' | 'payments';

function getRouteFromHash(): RouteKey {
  if (typeof window === 'undefined') {
    return 'workspace';
  }

  const hash = window.location.hash.replace('#', '');

  if (hash === 'seat-selection') {
    return 'seat-selection';
  }

  if (hash === 'payments') {
    return 'payments';
  }

  return 'workspace';
}

function App() {
  const [route, setRoute] = useState<RouteKey>(() => getRouteFromHash());

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(getRouteFromHash());
    };

    if (typeof window === 'undefined') {
      return undefined;
    }

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  if (route === 'seat-selection') {
    return <SeatSelectionPage />;
  }

  if (route === 'payments') {
    return <PaymentFlowPage />;
  }

  return (
    <CanvasStateProvider>
      <DndContext>
        <div className="min-h-screen bg-[#050505] text-[#c0c0c0]">
          <header className="border-b border-[#1f1f1f] bg-[#050505]/90 backdrop-blur">
            <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6 lg:px-10">
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight text-white">Drag n Drop Playground</h1>
                <p className="text-sm text-[#9a9a9a]">Disena distribuciones en segundos y personaliza cada elemento.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="#workspace"
                  className="rounded-full border border-[#2b2b2b] bg-[#101010] px-4 py-2 text-xs font-medium uppercase tracking-wide text-[#d4af37] transition hover:border-[#d4af37] hover:bg-[#181818]"
                >
                  Ir al lienzo
                </a>
                <a
                  href="#seat-selection"
                  className="rounded-full border border-[#2b2b2b] bg-[#101010] px-4 py-2 text-xs font-medium uppercase tracking-wide text-[#7dd3fc] transition hover:border-[#38bdf8] hover:bg-[#0f172a]"
                >
                  Probar boletera movil
                </a>
                <a
                  href="#payments"
                  className="rounded-full border border-[#2b2b2b] bg-[#101010] px-4 py-2 text-xs font-medium uppercase tracking-wide text-[#a855f7] transition hover:border-[#a855f7] hover:bg-[#1c1032]"
                >
                  Flujos de pago
                </a>
                <span className="hidden rounded-full border border-[#2b2b2b] bg-[#101010] px-4 py-2 text-xs font-medium text-[#8a8a8a] sm:inline-flex">
                  Shift arrastra para multiseleccion
                </span>
                <span className="inline-flex rounded-full border border-[#2b2b2b] bg-[#101010] px-4 py-2 text-xs font-medium text-[#8a8a8a] sm:hidden">
                  Mantén presionado y arrastra para mover
                </span>
              </div>
            </div>
          </header>
          <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-10 px-6 py-10 lg:px-10">
            <section id="workspace" className="space-y-8">
              <div className="rounded-2xl border border-[#1f1f1f] bg-[#0a0a0a]/85 p-6 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Workspace</h2>
                    <p className="text-sm text-[#9a9a9a]">
                      Arrastra iconos, ajusta tamanos, rota y guarda el diseno cuando quedes conforme.
                    </p>
                  </div>
                  <div className="hidden flex-wrap items-center gap-2 text-xs text-[#9a9a9a] sm:flex">
                    <span className="rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2">
                      Shift + clic para seleccion multiple
                    </span>
                    <span className="rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2">
                      Ctrl/Cmd + C / V para duplicar
                    </span>
                    <span className="rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2">
                      Delete para eliminar
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#9a9a9a] sm:hidden">
                    <span className="rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2">
                      Toca y arrastra un area vacia para multiseleccion
                    </span>
                    <span className="rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2">
                      Usa la barra inferior para duplicar o eliminar
                    </span>
                    <span className="rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2">
                      Doble toque en etiquetas para editar texto
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
                <aside className="hidden lg:block lg:w-[280px] lg:flex-shrink-0">
                  <ToolPalette className="lg:h-[66vh]" variant="desktop" />
                </aside>
                <div className="flex-1">
                  <Canvas />
                </div>
              </div>
            </section>
          </main>
        </div>
      </DndContext>
    </CanvasStateProvider>
  );
}

export default App;
