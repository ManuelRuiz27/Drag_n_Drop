import { useCallback, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { DragEndEvent, DragStartEvent, useDraggable, useDndMonitor } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

export interface ToolPaletteItem {
  id: string;
  icon: ReactNode;
  label: string;
  defaults: {
    type: string;
    capacity?: number;
    text?: string;
    imageKey?: string;
  };
}

export interface ToolPaletteProps {
  items?: ToolPaletteItem[];
  onItemDragStart?: (item: ToolPaletteItem, event: DragStartEvent) => void;
  onItemDragEnd?: (item: ToolPaletteItem, event: DragEndEvent) => void;
  className?: string;
}

const DEFAULT_TOOL_ITEMS: ToolPaletteItem[] = [
  {
    id: 'mesa-redonda',
    icon: 'O',
    label: 'Mesa Redonda',
    defaults: {
      type: 'MesaRedonda',
      capacity: 10,
      imageKey: 'mesa-redonda',
    },
  },
  {
    id: 'mesa-cuadrada',
    icon: '[]',
    label: 'Mesa Cuadrada',
    defaults: {
      type: 'MesaCuadrada',
      capacity: 8,
      imageKey: 'mesa-cuadrada',
    },
  },
  {
    id: 'pista-baile',
    icon: 'X',
    label: 'Pista de Baile',
    defaults: {
      type: 'PistaBaile',
      imageKey: 'pista-baile',
    },
  },
  {
    id: 'barra',
    icon: '=',
    label: 'Barra',
    defaults: {
      type: 'Barra',
      imageKey: 'barra',
    },
  },
  {
    id: 'salida',
    icon: '>',
    label: 'Salida',
    defaults: {
      type: 'Salida',
      imageKey: 'salida',
    },
  },
  {
    id: 'limite',
    icon: '[]',
    label: 'Limite',
    defaults: {
      type: 'Limite',
      imageKey: 'limite',
    },
  },
  {
    id: 'franja',
    icon: '..',
    label: 'Franja',
    defaults: {
      type: 'Franja',
      imageKey: 'franja',
    },
  },
  {
    id: 'banos',
    icon: 'WC',
    label: 'Banos',
    defaults: {
      type: 'Banos',
      imageKey: 'banos',
    },
  },
  {
    id: 'cabina-sonido',
    icon: 'DJ',
    label: 'Cabina de Sonido',
    defaults: {
      type: 'CabinaSonido',
      imageKey: 'cabina-sonido',
    },
  },
  {
    id: 'cocina',
    icon: 'CK',
    label: 'Cocina',
    defaults: {
      type: 'Cocina',
      imageKey: 'cocina',
    },
  },
  {
    id: 'etiqueta',
    icon: 'TXT',
    label: 'Etiqueta',
    defaults: {
      type: 'Etiqueta',
      text: 'Etiqueta',
      imageKey: 'etiqueta',
    },
  },
];

export function ToolPalette({
  items = DEFAULT_TOOL_ITEMS,
  onItemDragStart,
  onItemDragEnd,
  className,
}: ToolPaletteProps) {
  const [query, setQuery] = useState('');

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const item = event.active.data.current?.item as ToolPaletteItem | undefined;
      if (item && onItemDragStart) {
        onItemDragStart(item, event);
      }
    },
    [onItemDragStart]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const item = event.active.data.current?.item as ToolPaletteItem | undefined;
      if (item && onItemDragEnd) {
        onItemDragEnd(item, event);
      }
    },
    [onItemDragEnd]
  );

  useDndMonitor({
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
  });

  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems = useMemo(() => {
    if (!normalizedQuery) {
      return items;
    }

    return items.filter((item) => {
      const haystack = [
        item.label,
        item.defaults.type,
        item.defaults.capacity ? String(item.defaults.capacity) : null,
        item.defaults.text,
        item.defaults.imageKey,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [items, normalizedQuery]);

  const rootClassName = [
    'flex h-full flex-col gap-4 rounded-2xl border border-[#242424] bg-[#0b0b0b]/85 p-4 shadow-[0_18px_32px_rgba(0,0,0,0.35)] backdrop-blur-sm',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClassName}>

      <label htmlFor="tool-search" className="sr-only">
        Buscar elemento
      </label>
      <input
        id="tool-search"
        type="search"
        inputMode="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar elemento..."
        className="w-full rounded-xl border border-[#2c2c2c] bg-[#101010] px-3 py-2 text-sm text-[#e0e0e0] shadow-inner outline-none transition focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/40"
      />

      <div className="flex-1 overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#0d0d0d]/95">
        <div className="h-full space-y-3 overflow-y-auto p-3 pr-2">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => <PaletteDraggable key={item.id} item={item} />)
          ) : (
            <div className="rounded-lg border border-dashed border-[#2f2f2f] bg-[#121212] p-4 text-center text-xs text-[#8a8a8a]">
              No hay elementos que coincidan con tu busqueda.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface PaletteDraggableProps {
  item: ToolPaletteItem;
}

function PaletteDraggable({ item }: PaletteDraggableProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { item },
  });
  const detailParts = [
    item.defaults.type,
    item.defaults.capacity ? `${item.defaults.capacity} pax` : undefined,
    item.defaults.text ? `"${item.defaults.text}"` : undefined,
    item.defaults.imageKey ? `img:${item.defaults.imageKey}` : undefined,
  ].filter(Boolean);

  const style: CSSProperties | undefined = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex cursor-grab items-center gap-3 rounded-xl border border-[#2c2c2c] bg-[#111111] p-3 text-left text-[#c0c0c0] shadow-sm transition hover:border-[#d4af37] hover:bg-[#151515] hover:shadow-lg ${
        isDragging ? 'opacity-70 shadow-lg ring-2 ring-[#d4af37]/60' : ''
      }`}
      {...listeners}
      {...attributes}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#2d2d2d] bg-[#0a0a0a] text-base font-semibold text-[#d4af37] transition group-hover:border-[#d4af37]/60">
        {item.icon}
      </span>
      <div className="flex flex-col">
        <span className="font-medium text-white">{item.label}</span>
        <span className="text-xs uppercase tracking-wide text-[#8a8a8a]">
          {detailParts.length > 0 ? detailParts.join(' | ') : '-'}
        </span>
      </div>
    </div>
  );
}
