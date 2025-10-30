import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Layer, Rect, Stage, Text, Group } from 'react-konva';
import { useDroppable, useDndMonitor } from '@dnd-kit/core';

import type { ToolPaletteItem } from './ToolPalette';
import { useCanvasState } from '../context';
import type { CanvasElement } from '../context';

const GRID_SIZE = 16;
const GRID_COLOR = 'rgba(148, 163, 184, 0.12)';
const DROPZONE_ID = 'canvas-dropzone';
const ELEMENT_SIZE = 96;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function Canvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const { elements, addElement } = useCanvasState();

  const { setNodeRef, isOver } = useDroppable({ id: DROPZONE_ID });

  const assignContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      setNodeRef(node);
      if (node) {
        setDimensions({ width: node.clientWidth, height: node.clientHeight });
      }
    },
    [setNodeRef]
  );

  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const updateSize = () => {
      setDimensions({ width: node.clientWidth, height: node.clientHeight });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  useDndMonitor({
    onDragEnd(event) {
      if (!containerRef.current || event.over?.id !== DROPZONE_ID) {
        return;
      }

      const item = event.active.data.current?.item as ToolPaletteItem | undefined;
      if (!item) {
        return;
      }

      const containerBounds = containerRef.current.getBoundingClientRect();
      const translatedRect = event.active.rect.current?.translated ?? event.active.rect.current?.initial;
      if (!translatedRect) {
        return;
      }

      const centerX = translatedRect.left - containerBounds.left + translatedRect.width / 2;
      const centerY = translatedRect.top - containerBounds.top + translatedRect.height / 2;

      const maxX = Math.max(containerRef.current.clientWidth - ELEMENT_SIZE, 0);
      const maxY = Math.max(containerRef.current.clientHeight - ELEMENT_SIZE, 0);
      const x = clamp(centerX - ELEMENT_SIZE / 2, 0, maxX);
      const y = clamp(centerY - ELEMENT_SIZE / 2, 0, maxY);

      addElement({
        type: item.defaults.type,
        capacity: item.defaults.capacity,
        x,
        y,
      });
    },
  });

  const backgroundSize = useMemo(() => `${GRID_SIZE}px ${GRID_SIZE}px`, []);
  const backgroundImage = useMemo(
    () =>
      `linear-gradient(to right, ${GRID_COLOR} 1px, transparent 1px), linear-gradient(to bottom, ${GRID_COLOR} 1px, transparent 1px)`,
    []
  );

  const stageWidth = Math.max(dimensions.width, 1);
  const stageHeight = Math.max(dimensions.height, 1);

  return (
    <div
      ref={assignContainerRef}
      className={`relative h-[480px] w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-900 transition ${
        isOver ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-950' : ''
      }`}
      style={{ backgroundSize, backgroundImage }}
    >
      <Stage width={stageWidth} height={stageHeight} className="cursor-crosshair">
        <Layer>{elements.map((element) => renderCanvasElement(element))}</Layer>
      </Stage>
      {elements.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rounded-full bg-slate-800/70 px-4 py-2 text-sm text-slate-300">
            Drag tools here to populate the canvas
          </span>
        </div>
      ) : null}
    </div>
  );
}

function renderCanvasElement(element: CanvasElement) {
  const label = element.type.replace(/([A-Z])/g, ' $1').trim();
  return (
    <Group key={element.id} x={element.x} y={element.y}>
      <Rect
        width={ELEMENT_SIZE}
        height={ELEMENT_SIZE}
        cornerRadius={20}
        fill="#0f172a"
        stroke="#6366f1"
        strokeWidth={2}
        shadowBlur={12}
        shadowColor="rgba(79, 70, 229, 0.35)"
      />
      <Text
        text={label}
        width={ELEMENT_SIZE}
        align="center"
        fontSize={14}
        fill="#e2e8f0"
        y={ELEMENT_SIZE / 2 - 16}
      />
      {element.capacity ? (
        <Text
          text={`${element.capacity} pax`}
          width={ELEMENT_SIZE}
          align="center"
          fontSize={12}
          fill="#94a3b8"
          y={ELEMENT_SIZE / 2 + 4}
        />
      ) : null}
    </Group>
  );
}

