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
  };
}

export interface ToolPaletteProps {
  /**
   * Collection of items to render within the tool palette. If omitted, a default set is used.
   */
  items?: ToolPaletteItem[];
  /**
   * Invoked when a palette item begins dragging.
   */
  onItemDragStart?: (item: ToolPaletteItem, event: DragStartEvent) => void;
  /**
   * Invoked when a palette item completes a drag gesture.
   */
  onItemDragEnd?: (item: ToolPaletteItem, event: DragEndEvent) => void;
}

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

  const style: CSSProperties | undefined = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex cursor-grab items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-left text-slate-200 shadow-sm transition hover:border-indigo-500 hover:bg-slate-900 ${
        isDragging ? 'opacity-70 shadow-lg' : ''
      }`}
      {...listeners}
      {...attributes}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-xl">
        {item.icon}
      </span>
      <div className="flex flex-col">
        <span className="font-medium">{item.label}</span>
        <span className="text-xs uppercase tracking-wide text-slate-400">
          {item.defaults.type}
          {item.defaults.capacity ? ` • ${item.defaults.capacity} pax` : ''}
        </span>
      </div>
    </div>
  );
}

const DEFAULT_TOOL_ITEMS: ToolPaletteItem[] = [
  {
    id: 'mesa-redonda',
    icon: '⭕',
    label: 'Mesa Redonda',
    defaults: {
      type: 'MesaRedonda',
      capacity: 10,
    },
  },
  {
    id: 'mesa-cuadrada',
    icon: '⬛',
    label: 'Mesa Cuadrada',
    defaults: {
      type: 'MesaCuadrada',
      capacity: 8,
    },
  },
  {
    id: 'pista-baile',
    icon: '🪩',
    label: 'Pista de Baile',
    defaults: {
      type: 'PistaBaile',
    },
  },
  {
    id: 'barra',
    icon: '🥂',
    label: 'Barra',
    defaults: {
      type: 'Barra',
    },
  },
  {
    id: 'salida',
    icon: '🚪',
    label: 'Salida',
    defaults: {
      type: 'Salida',
    },
  },
];
