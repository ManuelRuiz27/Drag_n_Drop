import { useEffect, useMemo, useState } from 'react';
import type { KonvaEventObject } from 'konva/lib/Node';
import { Group, Layer, Rect, Stage, Text } from 'react-konva';

type TableSeatStatus = 'available' | 'reserved' | 'occupied' | 'blocked';

type TableSeat = {
  id: string;
  label: string;
  status: TableSeatStatus;
};

type TableWaitlistEntry = {
  id: string;
  timestamp: string;
};

type Table = {
  id: string;
  name: string;
  capacity: number;
  minimumSpend: number;
  seats: TableSeat[];
  waitlist: TableWaitlistEntry[];
};

type WaitlistPolicy = {
  maxPerTable: number;
  maxGlobal: number;
  estimatedWaitMinutes: number;
  notes: string;
};

type TableMapResponse = {
  venue: string;
  zone: string;
  currency: string;
  coverCharge: number;
  tables: Table[];
  waitlistPolicy: WaitlistPolicy;
};

const seatStatusColors: Record<TableSeatStatus, string> = {
  available: '#22c55e',
  reserved: '#facc15',
  occupied: '#f87171',
  blocked: '#52525b',
};

const SELECTED_SEAT_COLOR = '#38bdf8';
const TABLE_WIDTH = 150;
const TABLE_HEIGHT = 140;
const TABLE_GAP = 28;
const VERTICAL_PADDING = 48;
const HORIZONTAL_PADDING = 24;
const SEAT_MARKER_SIZE = 18;
const SEAT_MARKER_GAP = 12;

type LayoutResult = {
  stageHeight: number;
  positions: Array<{ x: number; y: number }>;
  columns: number;
};

function buildSeatLabelMap(tableMap: TableMapResponse | null) {
  const seatLabelMap = new Map<string, string>();

  if (!tableMap) {
    return seatLabelMap;
  }

  tableMap.tables.forEach((table) => {
    table.seats.forEach((seat) => {
      seatLabelMap.set(`${table.id}|${seat.id}`, `${table.name}-${seat.label}`);
    });
  });

  return seatLabelMap;
}

export function SeatSelectionPage() {
  const [tableMap, setTableMap] = useState<TableMapResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [userWaitlist, setUserWaitlist] = useState<string[]>([]);
  const [focusedTableId, setFocusedTableId] = useState<string | null>(null);
  const [stageWidth, setStageWidth] = useState(() => (typeof window === 'undefined' ? 360 : Math.min(window.innerWidth - 48, 480)));

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleResize = () => {
      setStageWidth(Math.min(window.innerWidth - 48, 480));
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const fetchTableMap = async () => {
      setIsLoading(true);

      try {
        const response = await fetch('/api/table-map.json');

        if (!response.ok) {
          throw new Error('No se pudo cargar el mapa de mesas.');
        }

        const data = (await response.json()) as TableMapResponse;
        setTableMap(data);
        setFocusedTableId((previous) => previous ?? data.tables[0]?.id ?? null);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Ha ocurrido un error desconocido.');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchTableMap();
  }, []);

  useEffect(() => {
    if (!focusedTableId && tableMap?.tables.length) {
      setFocusedTableId(tableMap.tables[0].id);
    }
  }, [focusedTableId, tableMap]);

  const layout = useMemo<LayoutResult>(() => {
    if (!tableMap || tableMap.tables.length === 0) {
      return { stageHeight: 320, positions: [], columns: 1 };
    }

    const tablesCount = tableMap.tables.length;
    const potentialColumns = Math.max(1, Math.floor((stageWidth - HORIZONTAL_PADDING * 2 + TABLE_GAP) / (TABLE_WIDTH + TABLE_GAP)));
    const columns = Math.min(Math.max(1, potentialColumns), tablesCount);
    const rows = Math.ceil(tablesCount / columns);
    const availableWidth = stageWidth - HORIZONTAL_PADDING * 2;
    const totalTablesWidth = columns * TABLE_WIDTH + Math.max(0, columns - 1) * TABLE_GAP;
    const offsetX = HORIZONTAL_PADDING + Math.max(0, (availableWidth - totalTablesWidth) / 2);

    const positions = tableMap.tables.map((_, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = offsetX + column * (TABLE_WIDTH + TABLE_GAP);
      const y = VERTICAL_PADDING + row * (TABLE_HEIGHT + TABLE_GAP);

      return { x, y };
    });

    const stageHeight = VERTICAL_PADDING * 2 + rows * TABLE_HEIGHT + Math.max(0, rows - 1) * TABLE_GAP;

    return { stageHeight, positions, columns };
  }, [stageWidth, tableMap]);

  const seatLabelMap = useMemo(() => buildSeatLabelMap(tableMap), [tableMap]);

  const selectedSeatLabels = useMemo(
    () => selectedSeats.map((seatId) => seatLabelMap.get(seatId) ?? seatId),
    [seatLabelMap, selectedSeats],
  );

  const tableMetrics = useMemo(() => {
    if (!tableMap) {
      return {
        totalTables: 0,
        availableTables: 0,
        availableSeats: 0,
        venueWaitlist: 0,
        userWaitlistCount: userWaitlist.length,
      };
    }

    const availableTables = tableMap.tables.filter((table) =>
      table.seats.some((seat) => seat.status === 'available'),
    ).length;

    const availableSeats = tableMap.tables.reduce(
      (accumulator, table) => accumulator + table.seats.filter((seat) => seat.status === 'available').length,
      0,
    );

    const venueWaitlist = tableMap.tables.reduce((accumulator, table) => accumulator + table.waitlist.length, 0);

    return {
      totalTables: tableMap.tables.length,
      availableTables,
      availableSeats,
      venueWaitlist,
      userWaitlistCount: userWaitlist.length,
    };
  }, [tableMap, userWaitlist.length]);

  const total = useMemo(() => {
    if (!tableMap) {
      return 0;
    }

    return tableMap.coverCharge * selectedSeats.length;
  }, [selectedSeats, tableMap]);

  const focusedTable = useMemo(() => {
    if (!tableMap || !focusedTableId) {
      return null;
    }

    return tableMap.tables.find((table) => table.id === focusedTableId) ?? null;
  }, [focusedTableId, tableMap]);

  const waitlistLabels = useMemo(() => {
    if (!tableMap) {
      return [];
    }

    return userWaitlist
      .map((tableId) => tableMap.tables.find((table) => table.id === tableId)?.name ?? tableId)
      .filter(Boolean);
  }, [tableMap, userWaitlist]);

  const toggleWaitlistForTable = (tableId: string) => {
    setUserWaitlist((previous) =>
      previous.includes(tableId) ? previous.filter((value) => value !== tableId) : [...previous, tableId],
    );
  };

  const toggleSeat = (table: Table, seat: TableSeat) => {
    if (seat.status !== 'available') {
      setUserWaitlist((previous) => (previous.includes(table.id) ? previous : [...previous, table.id]));
      return;
    }

    const seatId = `${table.id}|${seat.id}`;

    setSelectedSeats((previous) =>
      previous.includes(seatId) ? previous.filter((value) => value !== seatId) : [...previous, seatId],
    );
    setFocusedTableId(table.id);
  };

  const handleSeatClick = (table: Table, seat: TableSeat) => (event: KonvaEventObject<MouseEvent>) => {
    event.cancelBubble = true;
    toggleSeat(table, seat);
  };

  const isTableWaitlisted = (tableId: string) => userWaitlist.includes(tableId);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#050505] via-[#0a0a0a] to-[#050505] text-[#f4f4f5]">
      <header className="sticky top-0 z-10 border-b border-[#1f1f1f] bg-[#050505]/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between px-6 py-5">
          <a
            href="#workspace"
            className="rounded-full border border-[#1f1f1f] bg-[#121212] px-4 py-2 text-sm font-medium text-[#d4af37] transition hover:border-[#d4af37] hover:bg-[#181818]"
          >
            Volver
          </a>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.32em] text-[#a3a3a3]">Seleccion de mesas</p>
            <p className="text-sm font-semibold text-white">{tableMap?.venue ?? 'Cargando venue...'}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-6">
        <section className="space-y-5">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold text-white">Administra tus reservaciones</h1>
            <p className="text-sm text-[#a1a1aa]">
              Selecciona mesas con lugares disponibles directamente en el lienzo. Cuando un grupo esta lleno puedes sumarlo a una
              lista de espera para recibir prioridad en cuanto se libere un espacio.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MetricCard label="Mesas totales" value={tableMetrics.totalTables} />
            <MetricCard label="Mesas disponibles" value={tableMetrics.availableTables} accent="text-[#22c55e]" />
            <MetricCard label="Lugares libres" value={tableMetrics.availableSeats} />
          </div>

          <div className="rounded-3xl border border-[#1f1f1f] bg-[#080808]/90 p-4 shadow-[0_20px_45px_rgba(0,0,0,0.55)]">
            <div className="mb-2 text-center text-xs uppercase tracking-[0.3em] text-[#71717a]">
              {tableMap?.zone ?? 'Zona asignada'}
            </div>
            <p className="mb-4 text-center text-sm font-medium text-[#e4e4e7]">
              {isLoading && 'Cargando distribucion...'}
              {error && !isLoading && error}
              {tableMap && !isLoading && !error && 'Selecciona una mesa para ver sus detalles'}
            </p>

            {tableMap && !isLoading && !error && (
              <div className="flex flex-col items-center gap-4">
                <Stage width={stageWidth} height={layout.stageHeight} style={{ background: '#050505', borderRadius: 16 }}>
                  <Layer>
                    {tableMap.tables.map((table, index) => {
                      const position = layout.positions[index];

                      if (!position) {
                        return null;
                      }

                      const availableSeats = table.seats.filter((seat) => seat.status === 'available').length;
                      const isFocused = focusedTableId === table.id;
                      const hasSelection = selectedSeats.some((seatId) => seatId.startsWith(`${table.id}|`));
                      const isWaitlisted = isTableWaitlisted(table.id);
                      const tableStrokeColor = hasSelection
                        ? SELECTED_SEAT_COLOR
                        : isWaitlisted
                        ? '#a855f7'
                        : availableSeats > 0
                        ? '#0ea5e9'
                        : '#52525b';

                      const seatColumns = Math.min(3, Math.max(1, Math.ceil(Math.sqrt(table.seats.length))));
                      const seatRows = Math.ceil(table.seats.length / seatColumns);
                      const seatsBlockWidth = seatColumns * SEAT_MARKER_SIZE + Math.max(0, seatColumns - 1) * SEAT_MARKER_GAP;
                      const seatsBlockHeight = seatRows * SEAT_MARKER_SIZE + Math.max(0, seatRows - 1) * SEAT_MARKER_GAP;
                      const seatsOffsetX = (TABLE_WIDTH - seatsBlockWidth) / 2;
                      const seatsOffsetY = 60 + Math.max(0, (48 - seatsBlockHeight) / 2);

                      return (
                        <Group key={table.id} x={position.x} y={position.y}>
                          <Rect
                            width={TABLE_WIDTH}
                            height={TABLE_HEIGHT}
                            cornerRadius={18}
                            fill="#09090b"
                            stroke={tableStrokeColor}
                            strokeWidth={isFocused ? 4 : 2}
                            shadowColor="#000000"
                            shadowOpacity={0.6}
                            shadowBlur={18}
                            shadowOffset={{ x: 0, y: 12 }}
                            onClick={() => setFocusedTableId(table.id)}
                            onTap={() => setFocusedTableId(table.id)}
                          />

                          <Text x={16} y={16} text={table.name} fontSize={16} fontStyle="bold" fill="#f4f4f5" />
                          <Text
                            x={16}
                            y={36}
                            text={`${availableSeats}/${table.capacity} lugares`}
                            fontSize={13}
                            fill="#a1a1aa"
                          />

                          {table.waitlist.length > 0 && (
                            <Group x={16} y={TABLE_HEIGHT - 36}>
                              <Rect width={TABLE_WIDTH - 32} height={24} cornerRadius={12} fill="#1e1e2e" opacity={0.9} />
                              <Text
                                x={12}
                                y={6}
                                text={`Lista de espera: ${table.waitlist.length}`}
                                fontSize={12}
                                fill="#c084fc"
                              />
                            </Group>
                          )}

                          {table.seats.map((seat, seatIndex) => {
                            const seatColumn = seatIndex % seatColumns;
                            const seatRow = Math.floor(seatIndex / seatColumns);
                            const seatX = seatsOffsetX + seatColumn * (SEAT_MARKER_SIZE + SEAT_MARKER_GAP);
                            const seatY = seatsOffsetY + seatRow * (SEAT_MARKER_SIZE + SEAT_MARKER_GAP);
                            const seatId = `${table.id}|${seat.id}`;
                            const isSelected = selectedSeats.includes(seatId);
                            const fillColor = isSelected ? SELECTED_SEAT_COLOR : seatStatusColors[seat.status];

                            return (
                              <Rect
                                key={seat.id}
                                x={seatX}
                                y={seatY}
                                width={SEAT_MARKER_SIZE}
                                height={SEAT_MARKER_SIZE}
                                cornerRadius={6}
                                fill={fillColor}
                                opacity={seat.status === 'available' || isSelected ? 1 : 0.55}
                                stroke={isSelected ? '#0f172a' : undefined}
                                strokeWidth={isSelected ? 2 : 0}
                                onClick={handleSeatClick(table, seat)}
                                onTap={handleSeatClick(table, seat)}
                              />
                            );
                          })}
                        </Group>
                      );
                    })}
                  </Layer>
                </Stage>

                <div className="flex w-full flex-wrap justify-center gap-3 text-xs text-[#a1a1aa]">
                  <LegendItem color="#0ea5e9" label="Mesa con lugares" />
                  <LegendItem color="#52525b" label="Mesa sin lugares" />
                  <LegendItem color="#a855f7" label="En tu lista de espera" />
                  <LegendItem color={seatStatusColors.available} label="Lugar disponible" />
                  <LegendItem color={SELECTED_SEAT_COLOR} label="Lugar seleccionado" />
                  <LegendItem color={seatStatusColors.reserved} label="Reservado" />
                  <LegendItem color={seatStatusColors.occupied} label="Ocupado" />
                </div>
              </div>
            )}
          </div>

          {focusedTable && (
            <div className="flex flex-col gap-3 rounded-3xl border border-[#1f1f1f] bg-[#0c0c0c]/90 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-[#71717a]">Mesa seleccionada</p>
                  <p className="text-lg font-semibold text-white">{focusedTable.name}</p>
                </div>
                <div className="text-right text-sm text-[#a1a1aa]">
                  <p>Capacidad: {focusedTable.capacity}</p>
                  <p>
                    Dispo: {focusedTable.seats.filter((seat) => seat.status === 'available').length} / {focusedTable.capacity}
                  </p>
                  <p>Consumo minimo: {tableMap?.currency ?? 'MXN'} {focusedTable.minimumSpend.toLocaleString('es-MX')}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-[#27272a] bg-[#111111] p-4 text-sm text-[#a1a1aa]">
                <p>
                  {tableMap?.waitlistPolicy.notes ??
                    'Puedes sumarte a la lista de espera cuando no haya lugares disponibles. El staff libera mesas en orden de registro.'}
                </p>
                <p className="mt-2">Tiempo estimado: {tableMap?.waitlistPolicy.estimatedWaitMinutes ?? 0} min.</p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-[#a1a1aa]">
                  Lista de espera actual: <span className="font-semibold text-[#f1f5f9]">{focusedTable.waitlist.length}</span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleWaitlistForTable(focusedTable.id)}
                  className="rounded-2xl border border-[#373737] bg-[#151515] px-4 py-2 text-sm font-semibold text-white transition hover:border-[#a855f7] hover:bg-[#1d1d1d] disabled:opacity-50"
                  disabled={
                    focusedTable.seats.some((seat) => seat.status === 'available') && !isTableWaitlisted(focusedTable.id)
                  }
                >
                  {isTableWaitlisted(focusedTable.id) ? 'Salir de mi lista de espera' : 'Unirme a la lista de espera'}
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="sticky bottom-0 border-t border-[#1f1f1f] bg-[#050505]/95 p-6 backdrop-blur">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-[0.3em] text-[#71717a]">Lugares seleccionados</span>
              <span className="text-base font-semibold text-white">
                {selectedSeatLabels.length > 0 ? selectedSeatLabels.join(', ') : 'Sin lugares'}
              </span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-xs uppercase tracking-[0.3em] text-[#71717a]">Total estimado</span>
              <span className="text-lg font-semibold text-[#d4af37]">
                {tableMap ? `${tableMap.currency} ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : 'MXN 0.00'}
              </span>
            </div>
          </div>

          <div className="text-sm text-[#a1a1aa]">
            {waitlistLabels.length > 0 ? (
              <span>
                En tu lista de espera: <span className="font-semibold text-[#f1f5f9]">{waitlistLabels.join(', ')}</span>
              </span>
            ) : (
              <span>No tienes mesas en lista de espera.</span>
            )}
          </div>

          <button
            type="button"
            className="w-full rounded-2xl bg-gradient-to-r from-[#22c55e] via-[#0ea5e9] to-[#6366f1] py-4 text-base font-semibold text-[#0b0b0b] shadow-[0_20px_45px_rgba(34,197,94,0.25)] transition hover:from-[#0ea5e9] hover:via-[#6366f1] hover:to-[#a855f7] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={selectedSeats.length === 0 && userWaitlist.length === 0}
          >
            Continuar con la reserva
          </button>
        </div>
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

function MetricCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-2xl border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-3">
      <p className="text-xs uppercase tracking-[0.3em] text-[#71717a]">{label}</p>
      <p className={`mt-1 text-xl font-semibold text-white ${accent ?? ''}`}>{value}</p>
    </div>
  );
}
