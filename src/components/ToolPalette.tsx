import { useCallback } from 'react';
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
    label: 'Límite',
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
    label: 'Baños',
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
}: ToolPaletteProps) {
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

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <PaletteDraggable key={item.id} item={item} />
      ))}
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
      className={`flex cursor-grab items-center gap-3 rounded-xl border border-[#2c2c2c] bg-[#101010] p-3 text-left text-[#c0c0c0] shadow-sm transition hover:border-[#d4af37] hover:shadow-lg ${
        isDragging ? 'opacity-70 shadow-lg' : ''
      }`}
      {...listeners}
      {...attributes}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#2d2d2d] bg-[#0a0a0a] text-base text-[#d4af37]">
        {item.icon}
      </span>
      <div className="flex flex-col">
        <span className="font-medium text-white">{item.label}</span>
        <span className="text-xs uppercase tracking-wide text-[#8a8a8a]">
          {detailParts.length > 0 ? detailParts.join(' · ') : '-'}
        </span>
      </div>
    </div>
  );
}
