import { useEffect, useMemo, useState } from 'react';
import { Group, Layer, Rect, Stage, Text } from 'react-konva';

type SeatStatus = 'available' | 'reserved' | 'occupied';

type Seat = {
  id: string;
  status: SeatStatus;
};

type SeatRow = {
  label: string;
  seats: Seat[];
};

type SeatMapResponse = {
  auditorium: string;
  screen: string;
  currency: string;
  basePrice: number;
  rows: SeatRow[];
};

const seatColors: Record<SeatStatus, string> = {
  available: '#1f2937',
  reserved: '#f59e0b',
  occupied: '#4b5563',
};

const selectedColor = '#22c55e';
const SEAT_SIZE = 42;
const SEAT_GAP = 16;
const VERTICAL_PADDING = 48;

export function SeatSelectionPage() {
  const [seatMap, setSeatMap] = useState<SeatMapResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [stageWidth, setStageWidth] = useState(() => (typeof window === 'undefined' ? 360 : Math.min(window.innerWidth - 48, 420)));

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleResize = () => {
      setStageWidth(Math.min(window.innerWidth - 48, 420));
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const fetchSeatMap = async () => {
      setIsLoading(true);

      try {
        const response = await fetch('/api/seat-map.json');

        if (!response.ok) {
          throw new Error('No se pudo cargar el mapa de asientos.');
        }

        const data = (await response.json()) as SeatMapResponse;
        setSeatMap(data);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Ha ocurrido un error desconocido.');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchSeatMap();
  }, []);

  const stageHeight = useMemo(() => {
    if (!seatMap) {
      return 320;
    }

    return VERTICAL_PADDING * 2 + seatMap.rows.length * SEAT_SIZE + Math.max(0, seatMap.rows.length - 1) * SEAT_GAP;
  }, [seatMap]);

  const toggleSeat = (seat: Seat) => {
    if (seat.status !== 'available') {
      return;
    }

    setSelectedSeats((previous) =>
      previous.includes(seat.id) ? previous.filter((value) => value !== seat.id) : [...previous, seat.id],
    );
  };

  const total = useMemo(() => {
    if (!seatMap) {
      return 0;
    }

    return seatMap.basePrice * selectedSeats.length;
  }, [seatMap, selectedSeats]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#050505] via-[#0a0a0a] to-[#050505] text-[#f4f4f5]">
      <header className="sticky top-0 z-10 border-b border-[#1f1f1f] bg-[#050505]/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between px-6 py-5">
          <a
            href="#workspace"
            className="rounded-full border border-[#1f1f1f] bg-[#121212] px-4 py-2 text-sm font-medium text-[#d4af37] transition hover:border-[#d4af37] hover:bg-[#181818]"
          >
            ← Volver
          </a>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.32em] text-[#a3a3a3]">Seleccion de Asientos</p>
            <p className="text-sm font-semibold text-white">{seatMap?.auditorium ?? 'Cargando sala...'}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-6">
        <section className="space-y-5">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold text-white">Elige tus lugares</h1>
            <p className="text-sm text-[#a1a1aa]">
              Toca los asientos disponibles para apartarlos. El diseño esta optimizado para uso movil y simula la interfaz de una
              boletera moderna.
            </p>
          </div>

          <div className="rounded-3xl border border-[#1f1f1f] bg-[#080808]/90 p-4 shadow-[0_20px_45px_rgba(0,0,0,0.55)]">
            <div className="mb-2 text-center text-xs uppercase tracking-[0.3em] text-[#71717a]">Pantalla</div>
            {seatMap?.screen && <p className="mb-4 text-center text-sm font-medium text-[#e4e4e7]">{seatMap.screen}</p>}

            <div className="flex justify-center">
              {isLoading && <p className="text-sm text-[#a1a1aa]">Cargando asientos...</p>}
              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>

            {seatMap && !isLoading && !error && (
              <div className="flex flex-col items-center gap-4">
                <Stage
                  width={stageWidth}
                  height={stageHeight}
                  style={{ background: '#050505', borderRadius: 16, overflow: 'hidden' }}
                >
                  <Layer>
                    {seatMap.rows.map((row, rowIndex) => {
                      const paddingX =
                        (stageWidth - row.seats.length * SEAT_SIZE - Math.max(0, row.seats.length - 1) * SEAT_GAP) / 2;

                      return (
                        <Group key={row.label}>
                          <Text
                            x={8}
                            y={VERTICAL_PADDING + rowIndex * (SEAT_SIZE + SEAT_GAP) + SEAT_SIZE / 2 - 8}
                            text={row.label}
                            fontSize={16}
                            fontStyle="bold"
                            fill="#71717a"
                          />

                          {row.seats.map((seat, seatIndex) => {
                            const isSelected = selectedSeats.includes(seat.id);
                            const fillColor = isSelected ? selectedColor : seatColors[seat.status];
                            const x = paddingX + seatIndex * (SEAT_SIZE + SEAT_GAP);
                            const y = VERTICAL_PADDING + rowIndex * (SEAT_SIZE + SEAT_GAP);

                            return (
                              <Rect
                                key={seat.id}
                                x={x}
                                y={y}
                                width={SEAT_SIZE}
                                height={SEAT_SIZE}
                                cornerRadius={12}
                                fill={fillColor}
                                opacity={seat.status === 'available' || isSelected ? 1 : 0.6}
                                shadowBlur={isSelected ? 12 : 8}
                                shadowColor="#000000"
                                shadowOffset={{ x: 0, y: 4 }}
                                onTap={() => toggleSeat(seat)}
                                onClick={() => toggleSeat(seat)}
                              />
                            );
                          })}
                        </Group>
                      );
                    })}
                  </Layer>
                </Stage>

                <div className="flex w-full flex-wrap justify-center gap-3 text-xs text-[#a1a1aa]">
                  <LegendItem color={seatColors.available} label="Disponible" />
                  <LegendItem color={selectedColor} label="Seleccionado" />
                  <LegendItem color={seatColors.reserved} label="Apartado" />
                  <LegendItem color={seatColors.occupied} label="Ocupado" />
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="sticky bottom-0 border-t border-[#1f1f1f] bg-[#050505]/95 p-6 backdrop-blur">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-[0.3em] text-[#71717a]">Seleccionados</span>
            <span className="text-base font-semibold text-white">
              {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'Ninguno'}
            </span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-xs uppercase tracking-[0.3em] text-[#71717a]">Total</span>
            <span className="text-lg font-semibold text-[#d4af37]">
              {seatMap ? `${seatMap.currency} ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : 'MXN 0.00'}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="mt-4 w-full rounded-2xl bg-gradient-to-r from-[#d97706] via-[#f59e0b] to-[#fbbf24] py-4 text-base font-semibold text-[#0b0b0b] shadow-[0_20px_45px_rgba(249,115,22,0.35)] transition hover:from-[#f59e0b] hover:via-[#fbbf24] hover:to-[#fde68a] disabled:cursor-not-allowed disabled:opacity-40"
          disabled={selectedSeats.length === 0}
        >
          Confirmar apartado
        </button>
      </footer>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}
