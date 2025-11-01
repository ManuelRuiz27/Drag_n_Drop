import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Circle, Ellipse, Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useDroppable, useDndMonitor } from '@dnd-kit/core';

import type { ToolPaletteItem } from './ToolPalette';
import { ToolPalette } from './ToolPalette';
import { DEFAULT_ELEMENT_SIZE, useCanvasState } from '../context';
import type { CanvasElement } from '../context';
import type { ElementConfig } from '../context/types';
import { exportDesignToJSON, exportDesignToPDF } from '../utils';
import CUSTOM_ICON_REGISTRY from '../icons/registry';

const GRID_SIZE = 16;
const GRID_COLOR = 'rgba(192, 192, 192, 0.08)';
const DROPZONE_ID = 'canvas-dropzone';
const RESIZE_HANDLE_SIZE = 20;
const ROTATION_HANDLE_RADIUS = 12;
const MIN_ELEMENT_SIZE = 48;
const MAX_ELEMENT_SIZE = 240;
const PRIMARY_BG = '#000000';
const TEXT_SILVER = '#c0c0c0';
const HIGHLIGHT_GOLD = '#d4af37';
const PANEL_BORDER = '#2a2a2a';
const HANDLE_LINE_COLOR = '#3d3d3d';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const clampSize = (value: number) => clamp(value, MIN_ELEMENT_SIZE, MAX_ELEMENT_SIZE);

function getVisualPadding(type: string, width: number, height: number) {
  const size = Math.min(width, height);

  switch (type) {
    case 'MesaRedonda':
    case 'MesaCuadrada': {
      const stroke = Math.max(size * 0.08, 4);
      return { x: stroke / 2, y: stroke / 2 };
    }
    case 'PistaBaile': {
      const stroke = Math.max(size * 0.06, 3);
      return { x: stroke / 2, y: stroke / 2 };
    }
    case 'Barra': {
      const stroke = Math.max(Math.min(width, height) * 0.06, 2.5);
      return { x: stroke / 2, y: stroke / 2 };
    }
    case 'Limite': {
      const stroke = Math.max(Math.max(width, height) * 0.02, 2);
      return { x: stroke, y: stroke };
    }
    case 'Franja': {
      const stroke = Math.max(height * 0.4, 2);
      return { x: 0, y: stroke / 2 };
    }
    case 'Etiqueta': {
      const stroke = Math.max(Math.min(width, height) * 0.04, 1.5);
      return { x: stroke, y: stroke };
    }
    case 'Banos':
    case 'CabinaSonido':
    case 'Cocina': {
      return { x: 0, y: 0 };
    }
    case 'Salida': {
      const stroke = Math.max(size * 0.04, 2);
      return { x: stroke / 2, y: stroke / 2 };
    }
    default: {
      const stroke = Math.max(size * 0.05, 2);
      return { x: stroke / 2, y: stroke / 2 };
    }
  }
}

function calculateExtents(width: number, height: number, rotationDegrees: number, padding: { x: number; y: number }) {
  const paddedWidth = width + padding.x * 2;
  const paddedHeight = height + padding.y * 2;
  const halfPaddedWidth = paddedWidth / 2;
  const halfPaddedHeight = paddedHeight / 2;

  const rotationRadians = (rotationDegrees * Math.PI) / 180;
  const cosRotation = Math.cos(rotationRadians);
  const sinRotation = Math.sin(rotationRadians);

  const extentX = Math.abs(halfPaddedWidth * cosRotation) + Math.abs(halfPaddedHeight * sinRotation);
  const extentY = Math.abs(halfPaddedWidth * sinRotation) + Math.abs(halfPaddedHeight * cosRotation);

  return { extentX, extentY };
}

function getElementBounds({
  x,
  y,
  width,
  height,
  rotationDegrees,
  padding,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  rotationDegrees: number;
  padding: { x: number; y: number };
}) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const centerX = x + halfWidth;
  const centerY = y + halfHeight;

  const { extentX, extentY } = calculateExtents(width, height, rotationDegrees, padding);

  return {
    minX: centerX - extentX,
    maxX: centerX + extentX,
    minY: centerY - extentY,
    maxY: centerY + extentY,
  };
}

function clampPositionWithinStage({
  x,
  y,
  width,
  height,
  rotationDegrees,
  padding,
  stageWidth,
  stageHeight,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  rotationDegrees: number;
  padding: { x: number; y: number };
  stageWidth: number;
  stageHeight: number;
}) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const centerX = x + halfWidth;
  const centerY = y + halfHeight;

  const { extentX, extentY } = calculateExtents(width, height, rotationDegrees, padding);

  const minCenterX = extentX;
  const maxCenterX = Math.max(stageWidth - extentX, minCenterX);
  const minCenterY = extentY;
  const maxCenterY = Math.max(stageHeight - extentY, minCenterY);

  const clampedCenterX = clamp(centerX, minCenterX, maxCenterX);
  const clampedCenterY = clamp(centerY, minCenterY, maxCenterY);

  return {
    x: clampedCenterX - halfWidth,
    y: clampedCenterY - halfHeight,
  };
}

type ElementBounds = ReturnType<typeof getElementBounds>;

interface MultiSelectionElementSnapshot {
  id: string;
  startX: number;
  startY: number;
  width: number;
  height: number;
  rotation: number;
  type: string;
  padding: { x: number; y: number };
  bounds: ElementBounds;
}

interface MultiSelectionDragState {
  origin: { x: number; y: number };
  elements: MultiSelectionElementSnapshot[];
  deltaRange: { minX: number; maxX: number; minY: number; maxY: number };
}

function useCustomImage(src?: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }

    let isMounted = true;
    const img = new window.Image();
    img.src = src;
    img.onload = () => {
      if (isMounted) {
        setImage(img);
      }
    };
    img.onerror = () => {
      if (isMounted) {
        setImage(null);
      }
    };

    return () => {
      isMounted = false;
    };
  }, [src]);

  return image;
}

export function Canvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const { elements, addElement, removeElement, updateElement } = useCanvasState();
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [rotatingElementId, setRotatingElementId] = useState<string | null>(null);
  const clipboardRef = useRef<CanvasElement[]>([]);
  const selectionAnchorRef = useRef<{ x: number; y: number } | null>(null);
  const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isMobilePaletteOpen, setMobilePaletteOpen] = useState(false);
  const [isMobileExportOpen, setMobileExportOpen] = useState(false);

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

      const elementSize = DEFAULT_ELEMENT_SIZE;
      const baseType = item.defaults.type;
      let elementWidth = elementSize;
      let elementHeight = elementSize;
      if (baseType === 'Barra') {
        elementWidth = elementSize * 1.4;
        elementHeight = elementSize * 0.6;
      } else if (baseType === 'Limite') {
        elementWidth = elementSize * 1.8;
        elementHeight = elementSize;
      } else if (baseType === 'Franja') {
        elementWidth = elementSize * 1.6;
        elementHeight = elementSize * 0.25;
      } else if (baseType === 'Etiqueta') {
        elementWidth = elementSize * 1.4;
        elementHeight = elementSize * 0.55;
      } else if (baseType === 'Banos') {
        elementWidth = elementSize * 1.2;
        elementHeight = elementSize * 0.8;
      } else if (baseType === 'CabinaSonido') {
        elementWidth = elementSize * 1.4;
        elementHeight = elementSize * 0.8;
      } else if (baseType === 'Cocina') {
        elementWidth = elementSize * 1.6;
        elementHeight = elementSize * 0.9;
      }
      const padding = getVisualPadding(baseType, elementWidth, elementHeight);

      const initialPosition = clampPositionWithinStage({
        x: centerX - elementWidth / 2,
        y: centerY - elementHeight / 2,
        width: elementWidth,
        height: elementHeight,
        rotationDegrees: 0,
        padding,
        stageWidth: containerRef.current.clientWidth,
        stageHeight: containerRef.current.clientHeight,
      });

      addElement({
        type: item.defaults.type,
        capacity: item.defaults.capacity,
        text: item.defaults.text,
        imageKey: item.defaults.imageKey,
        x: initialPosition.x,
        y: initialPosition.y,
        size: Math.max(elementWidth, elementHeight),
        width: elementWidth,
        height: elementHeight,
        rotation: 0,
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

  const selectedElements = useMemo(
    () => elements.filter((element) => selectedElementIds.includes(element.id)),
    [elements, selectedElementIds]
  );

  const multiSelectionBounds = useMemo(() => {
    if (selectedElements.length <= 1) {
      return null;
    }

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    selectedElements.forEach((element) => {
      const width = element.width ?? element.size ?? DEFAULT_ELEMENT_SIZE;
      const height = element.height ?? element.size ?? DEFAULT_ELEMENT_SIZE;
      const padding = getVisualPadding(element.type, width, height);
      const bounds = getElementBounds({
        x: element.x,
        y: element.y,
        width,
        height,
        rotationDegrees: element.rotation ?? 0,
        padding,
      });
      minX = Math.min(minX, bounds.minX);
      minY = Math.min(minY, bounds.minY);
      maxX = Math.max(maxX, bounds.maxX);
      maxY = Math.max(maxY, bounds.maxY);
    });

    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
      return null;
    }

    return {
      x: minX,
      y: minY,
      width: Math.max(maxX - minX, 0),
      height: Math.max(maxY - minY, 0),
    };
  }, [selectedElements]);

  const multiSelectionDragStateRef = useRef<MultiSelectionDragState | null>(null);

  const prepareMultiSelectionDragState = useCallback((): MultiSelectionDragState | null => {
    if (!multiSelectionBounds) {
      multiSelectionDragStateRef.current = null;
      return null;
    }

    const snapshots: MultiSelectionElementSnapshot[] = selectedElements.map((element) => {
      const width = element.width ?? element.size ?? DEFAULT_ELEMENT_SIZE;
      const height = element.height ?? element.size ?? DEFAULT_ELEMENT_SIZE;
      const rotation = element.rotation ?? 0;
      const padding = getVisualPadding(element.type, width, height);
      const bounds = getElementBounds({
        x: element.x,
        y: element.y,
        width,
        height,
        rotationDegrees: rotation,
        padding,
      });

      return {
        id: element.id,
        startX: element.x,
        startY: element.y,
        width,
        height,
        rotation,
        type: element.type,
        padding,
        bounds,
      };
    });

    if (snapshots.length <= 1) {
      multiSelectionDragStateRef.current = null;
      return null;
    }

    const deltaMinX = Math.max(...snapshots.map((item) => -item.bounds.minX));
    const deltaMaxX = Math.min(...snapshots.map((item) => stageWidth - item.bounds.maxX));
    const deltaMinY = Math.max(...snapshots.map((item) => -item.bounds.minY));
    const deltaMaxY = Math.min(...snapshots.map((item) => stageHeight - item.bounds.maxY));

    const range = {
      minX: Number.isFinite(deltaMinX) ? deltaMinX : 0,
      maxX: Number.isFinite(deltaMaxX) ? deltaMaxX : 0,
      minY: Number.isFinite(deltaMinY) ? deltaMinY : 0,
      maxY: Number.isFinite(deltaMaxY) ? deltaMaxY : 0,
    };

    if (range.minX > range.maxX) {
      range.minX = 0;
      range.maxX = 0;
    }

    if (range.minY > range.maxY) {
      range.minY = 0;
      range.maxY = 0;
    }

    const state: MultiSelectionDragState = {
      origin: { x: multiSelectionBounds.x, y: multiSelectionBounds.y },
      elements: snapshots,
      deltaRange: range,
    };

    multiSelectionDragStateRef.current = state;
    return state;
  }, [multiSelectionBounds, selectedElements, stageHeight, stageWidth]);

  useEffect(() => {
    multiSelectionDragStateRef.current = null;
  }, [selectedElementIds]);

  const handleMultiSelectionDragStart = useCallback(
    (event: KonvaEventObject<DragEvent>) => {
      event.cancelBubble = true;
      prepareMultiSelectionDragState();
    },
    [prepareMultiSelectionDragState]
  );

  const handleMultiSelectionDragMove = useCallback(
    (event: KonvaEventObject<DragEvent>) => {
      const state = multiSelectionDragStateRef.current ?? prepareMultiSelectionDragState();
      if (!state) {
        return;
      }

      event.cancelBubble = true;

      const node = event.target;
      const deltaX = node.x() - state.origin.x;
      const deltaY = node.y() - state.origin.y;

      const stage = stageRef.current;
      if (!stage) {
        return;
      }

      state.elements.forEach((item) => {
        const target = stage.findOne(`#${item.id}`);
        if (target) {
          target.position({ x: item.startX + deltaX, y: item.startY + deltaY });
        }
      });

      if (typeof stage.batchDraw === 'function') {
        stage.batchDraw();
      }
    },
    [prepareMultiSelectionDragState]
  );

  const handleMultiSelectionDragEnd = useCallback(
    (event: KonvaEventObject<DragEvent>) => {
      const state = multiSelectionDragStateRef.current ?? prepareMultiSelectionDragState();
      if (!state) {
        return;
      }

      event.cancelBubble = true;

      const node = event.target;
      const deltaX = node.x() - state.origin.x;
      const deltaY = node.y() - state.origin.y;

      state.elements.forEach((item) => {
        const { x: clampedX, y: clampedY } = clampPositionWithinStage({
          x: item.startX + deltaX,
          y: item.startY + deltaY,
          width: item.width,
          height: item.height,
          rotationDegrees: item.rotation,
          padding: item.padding,
          stageWidth,
          stageHeight,
        });

        updateElement(item.id, { x: clampedX, y: clampedY });

        const stage = stageRef.current;
        if (stage) {
          const target = stage.findOne(`#${item.id}`);
          target?.position({ x: clampedX, y: clampedY });
        }
      });

      const stage = stageRef.current;
      if (stage && typeof stage.batchDraw === 'function') {
        stage.batchDraw();
      }

      multiSelectionDragStateRef.current = null;
    },
    [prepareMultiSelectionDragState, stageHeight, stageWidth, updateElement]
  );

  const handleMultiSelectionDragBound = useCallback(
    (pos: Konva.Vector2d) => {
      const state = multiSelectionDragStateRef.current ?? prepareMultiSelectionDragState();
      if (!state) {
        return pos;
      }

      const rawDeltaX = pos.x - state.origin.x;
      const rawDeltaY = pos.y - state.origin.y;

      const clampedDeltaX = clamp(rawDeltaX, state.deltaRange.minX, state.deltaRange.maxX);
      const clampedDeltaY = clamp(rawDeltaY, state.deltaRange.minY, state.deltaRange.maxY);

      return {
        x: state.origin.x + clampedDeltaX,
        y: state.origin.y + clampedDeltaY,
      };
    },
    [prepareMultiSelectionDragState]
  );

  const handleExportJSON = useCallback(() => {
    const exportableElements: ElementConfig[] = elements.map((element) => {
      const normalisedType = element.type
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .toLowerCase() as ElementConfig['type'];

      return {
        id: element.id,
        type: normalisedType,
        capacity: element.capacity,
        x: element.x,
        y: element.y,
        icon: '',
        width: element.width ?? element.size,
        height: element.height ?? element.size,
        rotation: element.rotation,
        text: element.text,
        imageKey: element.imageKey,
      } satisfies ElementConfig;
    });

    const json = exportDesignToJSON(exportableElements);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'canvas-design.json';
    anchor.click();

    URL.revokeObjectURL(url);
  }, [elements]);

  const handleExportPDF = useCallback(async () => {
    try {
      await exportDesignToPDF(stageRef);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const handleDeleteSelection = useCallback(() => {
    if (selectedElementIds.length === 0) {
      return;
    }

    selectedElementIds.forEach((id) => removeElement(id));

    if (rotatingElementId && selectedElementIds.includes(rotatingElementId)) {
      setRotatingElementId(null);
    }

    setSelectedElementIds([]);
  }, [removeElement, rotatingElementId, selectedElementIds]);

  const handleDuplicateSelection = useCallback(() => {
    if (selectedElementIds.length === 0) {
      return;
    }

    const selected = elements.filter((item) => selectedElementIds.includes(item.id));
    if (selected.length === 0) {
      return;
    }

    const addedIds: string[] = [];

    selected.forEach((template, index) => {
      const width = template.width ?? template.size ?? DEFAULT_ELEMENT_SIZE;
      const height = template.height ?? template.size ?? DEFAULT_ELEMENT_SIZE;
      const padding = getVisualPadding(template.type, width, height);
      const offset = 28 * (index + 1);

      const { x: clampedX, y: clampedY } = clampPositionWithinStage({
        x: template.x + offset,
        y: template.y + offset,
        width,
        height,
        rotationDegrees: template.rotation ?? 0,
        padding,
        stageWidth,
        stageHeight,
      });

      const newId = `element-${Date.now()}-${Math.round(Math.random() * 1_000)}`;

      addElement({
        id: newId,
        type: template.type,
        capacity: template.capacity,
        x: clampedX,
        y: clampedY,
        size: template.size ?? Math.max(width, height),
        width,
        height,
        rotation: template.rotation ?? 0,
        text: template.text,
        imageKey: template.imageKey,
      });

      addedIds.push(newId);
    });

    if (addedIds.length > 0) {
      setSelectedElementIds(addedIds);
    }
  }, [addElement, elements, selectedElementIds, stageHeight, stageWidth]);

  const handleElementSelect = useCallback(
    (id: string, event: KonvaEventObject<MouseEvent | TouchEvent>) => {
      const isMulti = event?.evt?.shiftKey ?? false;
      setSelectedElementIds((previous) => {
        if (isMulti) {
          if (previous.includes(id)) {
            return previous.filter((value) => value !== id);
          }
          return [...previous, id];
        }
        return [id];
      });
      if (!isMulti) {
        setRotatingElementId(null);
      }
    },
    []
  );

  const handleElementResize = useCallback(
    (id: string, dimensions: { width: number; height: number }) => {
      const element = elements.find((item) => item.id === id);
      if (!element) {
        return;
      }

      const isBar = element.type === 'Barra';
      const targetWidth = clampSize(dimensions.width);
      const targetHeight = clampSize(dimensions.height);

      const derivedSize = Math.max(targetWidth, targetHeight);
      const widthForStorage = isBar ? targetWidth : derivedSize;
      const heightForStorage = isBar ? targetHeight : derivedSize;
      const padding = getVisualPadding(element.type, widthForStorage, heightForStorage);

      const clampedPosition = clampPositionWithinStage({
        x: element.x,
        y: element.y,
        width: widthForStorage,
        height: heightForStorage,
        rotationDegrees: element.rotation ?? 0,
        padding,
        stageWidth,
        stageHeight,
      });

      updateElement(id, {
        size: derivedSize,
        width: widthForStorage,
        height: heightForStorage,
        x: clampedPosition.x,
        y: clampedPosition.y,
      });
    },
    [elements, stageHeight, stageWidth, updateElement]
  );

  const handleElementPositionChange = useCallback(
    (id: string, position: { x: number; y: number }) => {
      const element = elements.find((item) => item.id === id);
      if (!element) {
        return;
      }
      const width = element.width ?? element.size ?? DEFAULT_ELEMENT_SIZE;
      const height = element.height ?? element.size ?? DEFAULT_ELEMENT_SIZE;
      const padding = getVisualPadding(element.type, width, height);
      const clamped = clampPositionWithinStage({
        x: position.x,
        y: position.y,
        width,
        height,
        rotationDegrees: element.rotation ?? 0,
        padding,
        stageWidth,
        stageHeight,
      });
      updateElement(id, {
        x: clamped.x,
        y: clamped.y,
      });
    },
    [elements, stageHeight, stageWidth, updateElement]
  );

  const handleRotationStart = useCallback((id: string) => {
    setRotatingElementId(id);
  }, []);

  const handleStagePointerDown = useCallback(
    (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = event.target.getStage();
      if (!stage) {
        return;
      }
      const pointer = stage.getPointerPosition();
      const clickedOnEmpty = event.target === stage;
      if (clickedOnEmpty && pointer) {
        if (!(event.evt?.shiftKey ?? false)) {
          setSelectedElementIds([]);
        }
        setRotatingElementId(null);
        selectionAnchorRef.current = pointer;
        setSelectionRect({ x: pointer.x, y: pointer.y, width: 0, height: 0 });
      } else {
        selectionAnchorRef.current = null;
        setSelectionRect(null);
      }
    },
    []
  );

  const handleStagePointerMove = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    const pointer = stage.getPointerPosition();
    if (selectionAnchorRef.current && pointer) {
      const anchor = selectionAnchorRef.current;
      setSelectionRect({
        x: Math.min(anchor.x, pointer.x),
        y: Math.min(anchor.y, pointer.y),
        width: Math.abs(pointer.x - anchor.x),
        height: Math.abs(pointer.y - anchor.y),
      });
    }

    if (!rotatingElementId || !pointer) {
      return;
    }

    const element = elements.find((item) => item.id === rotatingElementId);
    if (!element) {
      return;
    }
    const width = element.width ?? element.size ?? DEFAULT_ELEMENT_SIZE;
    const height = element.height ?? element.size ?? DEFAULT_ELEMENT_SIZE;
    const centerX = element.x + width / 2;
    const centerY = element.y + height / 2;
    const radians = Math.atan2(pointer.y - centerY, pointer.x - centerX);
    const degrees = (radians * 180) / Math.PI;
    updateElement(rotatingElementId, { rotation: degrees });
  }, [elements, rotatingElementId, updateElement]);

  const handleStagePointerUp = useCallback(
    (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = stageRef.current;
      if (selectionAnchorRef.current && stage) {
        const anchor = selectionAnchorRef.current;
        const pointer = stage.getPointerPosition() ?? anchor;
        const rect = {
          x: Math.min(anchor.x, pointer.x),
          y: Math.min(anchor.y, pointer.y),
          width: Math.abs(pointer.x - anchor.x),
          height: Math.abs(pointer.y - anchor.y),
        };
        selectionAnchorRef.current = null;
        setSelectionRect(null);

        const hasArea = rect.width > 3 && rect.height > 3;
        if (hasArea) {
          const selectionBounds = {
            minX: rect.x,
            maxX: rect.x + rect.width,
            minY: rect.y,
            maxY: rect.y + rect.height,
          };

          const idsWithinArea = elements
            .filter((element) => {
              const width = element.width ?? element.size ?? DEFAULT_ELEMENT_SIZE;
              const height = element.height ?? element.size ?? DEFAULT_ELEMENT_SIZE;
              const padding = getVisualPadding(element.type, width, height);
              const bounds = getElementBounds({
                x: element.x,
                y: element.y,
                width,
                height,
                rotationDegrees: element.rotation ?? 0,
                padding,
              });

              return (
                bounds.minX >= selectionBounds.minX &&
                bounds.maxX <= selectionBounds.maxX &&
                bounds.minY >= selectionBounds.minY &&
                bounds.maxY <= selectionBounds.maxY
              );
            })
            .map((element) => element.id);

          if (idsWithinArea.length > 0) {
            if (event?.evt?.shiftKey) {
              setSelectedElementIds((prev) => Array.from(new Set([...prev, ...idsWithinArea])));
            } else {
              setSelectedElementIds(idsWithinArea);
            }
          } else if (!(event?.evt?.shiftKey ?? false)) {
            setSelectedElementIds([]);
          }
        }
      } else {
        selectionAnchorRef.current = null;
        setSelectionRect(null);
      }

      if (rotatingElementId) {
        setRotatingElementId(null);
      }
    },
    [elements, rotatingElementId]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target) {
        const tagName = target.tagName?.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable) {
          return;
        }
      }

      const modifier = event.ctrlKey || event.metaKey;

      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedElementIds.length > 0) {
        event.preventDefault();
        handleDeleteSelection();
        return;
      }

      if (modifier && (event.key === 'c' || event.key === 'C')) {
        if (selectedElementIds.length === 0) {
          return;
        }
        const selected = elements.filter((item) => selectedElementIds.includes(item.id));
        if (selected.length === 0) {
          return;
        }
        clipboardRef.current = selected.map((element) => ({ ...element }));
        event.preventDefault();
        return;
      }

      if (modifier && (event.key === 'v' || event.key === 'V')) {
        const templates = clipboardRef.current;
        if (!templates.length || !containerRef.current) {
          return;
        }

        event.preventDefault();

        const addedIds: string[] = [];
        templates.forEach((template, index) => {
          const width = template.width ?? template.size ?? DEFAULT_ELEMENT_SIZE;
          const height = template.height ?? template.size ?? DEFAULT_ELEMENT_SIZE;
          const padding = getVisualPadding(template.type, width, height);
          const offset = 24 * (index + 1);

          const { x: clampedX, y: clampedY } = clampPositionWithinStage({
            x: template.x + offset,
            y: template.y + offset,
            width,
            height,
            rotationDegrees: template.rotation ?? 0,
            padding,
            stageWidth,
            stageHeight,
          });

          const newId = `element-${Date.now()}-${Math.round(Math.random() * 1_000)}`;

          addElement({
            id: newId,
            type: template.type,
            capacity: template.capacity,
            x: clampedX,
            y: clampedY,
            size: template.size,
            width,
            height,
            rotation: template.rotation ?? 0,
            text: template.text,
            imageKey: template.imageKey,
          });

          addedIds.push(newId);
        });

        if (addedIds.length > 0) {
          setSelectedElementIds(addedIds);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    addElement,
    elements,
    handleDeleteSelection,
    rotatingElementId,
    selectedElementIds,
    stageHeight,
    stageWidth,
  ]);

  const hasSelection = selectedElementIds.length > 0;
  const handleMobilePaletteClose = useCallback(() => setMobilePaletteOpen(false), []);
  const handleMobileExportClose = useCallback(() => setMobileExportOpen(false), []);

  return (
    <div
      ref={assignContainerRef}
      className={`relative mx-auto h-[60vh] w-full max-w-full overflow-hidden rounded-2xl border transition sm:h-[66vh] sm:w-[90vw] lg:w-[75vw] ${
        isOver ? 'outline outline-[3px] outline-offset-4' : ''
      }`}
      style={{
        backgroundSize,
        backgroundImage,
        borderColor: PANEL_BORDER,
        backgroundColor: PRIMARY_BG,
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45)',
        outlineColor: isOver ? HIGHLIGHT_GOLD : 'transparent',
      }}
    >
      <Stage
        ref={stageRef}
        width={stageWidth}
        height={stageHeight}
        className="cursor-crosshair touch-manipulation"
        onMouseDown={handleStagePointerDown}
        onTouchStart={handleStagePointerDown}
        onMouseMove={handleStagePointerMove}
        onTouchMove={handleStagePointerMove}
        onMouseUp={handleStagePointerUp}
        onTouchEnd={handleStagePointerUp}
        onPointerLeave={handleStagePointerUp}
      >
        <Layer>
          {selectionRect ? (
            <Rect
              listening={false}
              x={selectionRect.x}
              y={selectionRect.y}
              width={selectionRect.width}
              height={selectionRect.height}
              stroke={HIGHLIGHT_GOLD}
              dash={[6, 4]}
              strokeWidth={1.5}
              fill="rgba(212, 175, 55, 0.08)"
            />
          ) : null}
          {elements.map((element) => (
            <CanvasElementNode
              key={element.id}
              element={element}
              isSelected={selectedElementIds.includes(element.id)}
              onSelect={handleElementSelect}
              onResize={handleElementResize}
              onPositionChange={handleElementPositionChange}
              onRotationStart={handleRotationStart}
              isRotating={rotatingElementId === element.id}
              bounds={{ width: stageWidth, height: stageHeight }}
              onUpdate={updateElement}
            />
          ))}
          {multiSelectionBounds && !selectionRect ? (
            <Group
              x={multiSelectionBounds.x}
              y={multiSelectionBounds.y}
              draggable
              dragBoundFunc={handleMultiSelectionDragBound}
              onDragStart={handleMultiSelectionDragStart}
              onDragMove={handleMultiSelectionDragMove}
              onDragEnd={handleMultiSelectionDragEnd}
              onMouseDown={(event) => {
                event.cancelBubble = true;
              }}
              onTouchStart={(event) => {
                event.cancelBubble = true;
              }}
            >
              <Rect
                x={0}
                y={0}
                width={multiSelectionBounds.width}
                height={multiSelectionBounds.height}
                stroke={HIGHLIGHT_GOLD}
                strokeWidth={2}
                dash={[10, 8]}
                fill="rgba(212, 175, 55, 0.08)"
                cornerRadius={12}
              />
            </Group>
          ) : null}
        </Layer>
      </Stage>
      <div className="pointer-events-none absolute right-4 top-4 hidden gap-2 md:flex">
        <button
          type="button"
          onClick={handleExportJSON}
          className="pointer-events-auto rounded-md border border-[#353535] bg-[#111111] px-3 py-1 text-xs font-medium text-[#c0c0c0] shadow hover:border-[#d4af37] hover:text-white"
        >
          Export JSON
        </button>
        <button
          type="button"
          onClick={handleExportPDF}
          className="pointer-events-auto rounded-md border border-[#d4af37] bg-[#1a1a1a] px-3 py-1 text-xs font-medium text-white shadow hover:bg-[#d4af37] hover:text-black"
        >
          Export PDF
        </button>
      </div>
      {elements.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rounded-full border border-[#2c2c2c] bg-[#101010]/90 px-4 py-2 text-sm text-[#c0c0c0]">
            Arrastra herramientas aqui para comenzar
          </span>
        </div>
      ) : null}
      <div className="pointer-events-none absolute inset-x-4 bottom-4 flex justify-center md:hidden">
        <div className="pointer-events-auto flex w-full max-w-xl flex-wrap items-center justify-center gap-3 rounded-2xl border border-[#262626] bg-[#0b0b0b]/95 px-4 py-3 text-xs text-[#c0c0c0] shadow-[0_18px_38px_rgba(0,0,0,0.45)] backdrop-blur">
          <button
            type="button"
            onClick={() => setMobilePaletteOpen(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#2f2f2f] bg-[#111111] px-4 py-3 text-sm font-medium text-white transition hover:border-[#d4af37] hover:bg-[#181818]"
          >
            Abrir herramientas
          </button>
          <button
            type="button"
            onClick={handleDuplicateSelection}
            disabled={!hasSelection}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition ${
              hasSelection
                ? 'border-[#2f2f2f] bg-[#111111] text-white hover:border-[#d4af37] hover:bg-[#181818]'
                : 'cursor-not-allowed border-[#1f1f1f] bg-[#0d0d0d] text-[#5f5f5f]'
            }`}
          >
            Duplicar seleccion
          </button>
          <button
            type="button"
            onClick={handleDeleteSelection}
            disabled={!hasSelection}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition ${
              hasSelection
                ? 'border-[#4a1f1f] bg-[#1a0b0b] text-[#f87171] hover:border-[#d14343] hover:bg-[#2c1414]'
                : 'cursor-not-allowed border-[#1f1f1f] bg-[#0d0d0d] text-[#5f5f5f]'
            }`}
          >
            Eliminar seleccion
          </button>
          <button
            type="button"
            onClick={() => setMobileExportOpen(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#d4af37] bg-[#1a1a1a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#d4af37] hover:text-black"
          >
            Exportar
          </button>
        </div>
      </div>
      <p className="pointer-events-none absolute bottom-2 left-0 right-0 px-6 text-center text-[10px] font-medium uppercase tracking-widest text-[#6f6f6f] md:hidden">
        Mantén presionado para mover • Pellizca para hacer zoom con tu navegador
      </p>
      {isMobilePaletteOpen ? (
        <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/60 backdrop-blur-sm md:hidden">
          <button
            type="button"
            aria-label="Cerrar herramientas"
            className="h-full w-full flex-1"
            onClick={handleMobilePaletteClose}
          />
          <div className="max-h-[78vh] w-full rounded-t-3xl border border-[#2a2a2a] bg-[#050505]/95 p-5 shadow-[0_-20px_48px_rgba(0,0,0,0.6)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Herramientas</h3>
                <p className="text-xs text-[#9a9a9a]">Arrastra un elemento y sueltalo en el lienzo.</p>
              </div>
              <button
                type="button"
                onClick={handleMobilePaletteClose}
                className="rounded-full border border-[#2a2a2a] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#9a9a9a] transition hover:border-[#d4af37] hover:text-white"
              >
                Cerrar
              </button>
            </div>
            <div className="h-[60vh]">
              <ToolPalette variant="mobile" onItemDragEnd={() => handleMobilePaletteClose()} />
            </div>
          </div>
        </div>
      ) : null}
      {isMobileExportOpen ? (
        <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/60 backdrop-blur-sm md:hidden">
          <button
            type="button"
            aria-label="Cerrar exportaciones"
            className="h-full w-full flex-1"
            onClick={handleMobileExportClose}
          />
          <div className="w-full rounded-t-3xl border border-[#2a2a2a] bg-[#050505]/95 p-5 shadow-[0_-20px_48px_rgba(0,0,0,0.6)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Exportar diseno</h3>
                <p className="text-xs text-[#9a9a9a]">Selecciona el formato para compartir o guardar.</p>
              </div>
              <button
                type="button"
                onClick={handleMobileExportClose}
                className="rounded-full border border-[#2a2a2a] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#9a9a9a] transition hover:border-[#d4af37] hover:text-white"
              >
                Cerrar
              </button>
            </div>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  handleExportJSON();
                  handleMobileExportClose();
                }}
                className="w-full rounded-2xl border border-[#2f2f2f] bg-[#111111] px-4 py-3 text-sm font-semibold text-white transition hover:border-[#d4af37] hover:bg-[#181818]"
              >
                Descargar JSON
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleExportPDF();
                  handleMobileExportClose();
                }}
                className="w-full rounded-2xl border border-[#d4af37] bg-[#1a1a1a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#d4af37] hover:text-black"
              >
                Generar PDF
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface CanvasElementNodeProps {
  element: CanvasElement;
  isSelected: boolean;
  isRotating: boolean;
  bounds: { width: number; height: number };
  onSelect: (id: string, event: KonvaEventObject<any>) => void;
  onResize: (id: string, dimensions: { width: number; height: number }) => void;
  onPositionChange: (id: string, position: { x: number; y: number }) => void;
  onRotationStart: (id: string) => void;
  onUpdate: (id: string, updates: Partial<CanvasElement>) => void;
}

function CanvasElementNode({
  element,
  isSelected,
  isRotating,
  bounds,
  onSelect,
  onResize,
  onPositionChange,
  onRotationStart,
  onUpdate,
}: CanvasElementNodeProps) {
  const baseSize = element.size ?? DEFAULT_ELEMENT_SIZE;
  const lockAspect = ['MesaRedonda', 'MesaCuadrada', 'PistaBaile', 'Salida'].includes(element.type);
  const width = element.width ?? baseSize;
  const isFreeform = !lockAspect;
  const height = element.height ?? baseSize;
  const rotation = element.rotation ?? 0;
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const handleHalf = RESIZE_HANDLE_SIZE / 2;
  const padding = useMemo(() => getVisualPadding(element.type, width, height), [element.type, height, width]);
  const customIconSrc = useMemo(
    () => (element.imageKey ? CUSTOM_ICON_REGISTRY[element.imageKey] : undefined),
    [element.imageKey]
  );
  const customIconImage = useCustomImage(customIconSrc);

  const dragBound = useCallback(
    (pos: Konva.Vector2d) =>
      clampPositionWithinStage({
        x: pos.x,
        y: pos.y,
        width,
        height,
        rotationDegrees: rotation,
        padding,
        stageWidth: bounds.width,
        stageHeight: bounds.height,
      }),
    [bounds.height, bounds.width, height, padding, rotation, width]
  );

  const handleSelect = useCallback(
    (event: KonvaEventObject<any>) => {
      event.cancelBubble = true;
      onSelect(element.id, event);
    },
    [element.id, onSelect]
  );

  const handleDragStart = useCallback(
    (event: KonvaEventObject<DragEvent>) => {
      event.cancelBubble = true;
      onSelect(element.id, event);
    },
    [element.id, onSelect]
  );

  const handleDragEnd = useCallback(
    (event: KonvaEventObject<DragEvent>) => {
      event.cancelBubble = true;
      const node = event.target;
      const next = dragBound({ x: node.x(), y: node.y() });
      node.position(next);
      onPositionChange(element.id, next);
    },
    [dragBound, element.id, onPositionChange]
  );

  const rotationRadians = useMemo(() => (rotation * Math.PI) / 180, [rotation]);
  const cosRotation = Math.cos(rotationRadians);
  const sinRotation = Math.sin(rotationRadians);

  const handleResize = useCallback(
    (event: KonvaEventObject<DragEvent>) => {
      event.cancelBubble = true;
      const stage = event.target.getStage();
      if (!stage) {
        return;
      }

      const pointer = stage.getPointerPosition();
      if (!pointer) {
        return;
      }

      const centerX = element.x + width / 2;
      const centerY = element.y + height / 2;

      const vx = pointer.x - centerX;
      const vy = pointer.y - centerY;

      const localX = cosRotation * vx + sinRotation * vy;
      const localY = -sinRotation * vx + cosRotation * vy;

      let nextWidth = width;
      let nextHeight = height;

      if (isFreeform) {
        nextWidth = clampSize(Math.max(Math.abs(localX) * 2, MIN_ELEMENT_SIZE));
        nextHeight = clampSize(Math.max(Math.abs(localY) * 2, MIN_ELEMENT_SIZE));
      } else {
        const extent = Math.max(Math.abs(localX), Math.abs(localY));
        const nextSize = clampSize(Math.max(extent * 2, MIN_ELEMENT_SIZE));
        nextWidth = nextSize;
        nextHeight = nextSize;
      }

      onResize(element.id, { width: nextWidth, height: nextHeight });

      const nextHalfWidth = nextWidth / 2;
      const nextHalfHeight = nextHeight / 2;
      const nextOffsetX = nextHalfWidth - handleHalf;
      const nextOffsetY = nextHalfHeight - handleHalf;
      const rotatedOffsetX = nextOffsetX * cosRotation - nextOffsetY * sinRotation;
      const rotatedOffsetY = nextOffsetX * sinRotation + nextOffsetY * cosRotation;
      const nextHandleX = nextHalfWidth + rotatedOffsetX - handleHalf;
      const nextHandleY = nextHalfHeight + rotatedOffsetY - handleHalf;
      event.target.position({ x: nextHandleX, y: nextHandleY });
    },
    [cosRotation, element.id, element.type, element.x, element.y, handleHalf, height, isFreeform, onResize, sinRotation, width]
  );

  const handleRotationHandleDown = useCallback(
    (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
      event.cancelBubble = true;
      onSelect(element.id, event);
      onRotationStart(element.id);
    },
    [element.id, onRotationStart, onSelect]
  );

  const rotationHandleDistance = Math.max(halfWidth, halfHeight) + 36;
  const rotationHandleAngle = rotationRadians - Math.PI / 2;
  const rotationHandleX = halfWidth + Math.cos(rotationHandleAngle) * rotationHandleDistance;
  const rotationHandleY = halfHeight + Math.sin(rotationHandleAngle) * rotationHandleDistance;

  const resizeOffsetX = halfWidth - handleHalf;
  const resizeOffsetY = halfHeight - handleHalf;
  const rotatedResizeOffsetX = resizeOffsetX * cosRotation - resizeOffsetY * sinRotation;
  const rotatedResizeOffsetY = resizeOffsetX * sinRotation + resizeOffsetY * cosRotation;
  const resizeHandleX = halfWidth + rotatedResizeOffsetX - handleHalf;
  const resizeHandleY = halfHeight + rotatedResizeOffsetY - handleHalf;

  const icon = useMemo(() => renderElementIconByType(element, width, height, customIconImage), [element, width, height, customIconImage]);

  const handleLabelDoubleClick = useCallback(() => {
    if (element.type !== 'Etiqueta') {
      return;
    }
    const next = window.prompt('Texto de la etiqueta', element.text ?? 'Etiqueta');
    if (next !== null) {
      onUpdate(element.id, { text: next });
    }
  }, [element.id, element.text, element.type, onUpdate]);

  return (
    <Group
      id={element.id}
      x={element.x}
      y={element.y}
      draggable
      dragBoundFunc={dragBound}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseDown={handleSelect}
      onTouchStart={handleSelect}
      onDblClick={handleLabelDoubleClick}
      onDblTap={handleLabelDoubleClick}
    >
      <Group x={halfWidth} y={halfHeight} offsetX={halfWidth} offsetY={halfHeight} rotation={rotation}>
        {isSelected ? (
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            cornerRadius={Math.min(width, height) * 0.18}
            stroke={HIGHLIGHT_GOLD}
            strokeWidth={2}
            dash={[8, 6]}
            listening={false}
            fillEnabled={false}
          />
        ) : null}
        {icon}
      </Group>
      {isSelected ? (
        <>
          <Line
            points={[halfWidth, halfHeight, rotationHandleX, rotationHandleY]}
            stroke={HANDLE_LINE_COLOR}
            strokeWidth={2}
            lineCap="round"
            opacity={0.85}
          />
          <Circle
            x={rotationHandleX}
            y={rotationHandleY}
            radius={ROTATION_HANDLE_RADIUS}
            fill={HIGHLIGHT_GOLD}
            stroke={TEXT_SILVER}
            strokeWidth={2}
            shadowBlur={isRotating ? 16 : 8}
            shadowColor="rgba(212, 175, 55, 0.45)"
            onMouseDown={handleRotationHandleDown}
            onTouchStart={handleRotationHandleDown}
          />
          <Rect
            x={resizeHandleX}
            y={resizeHandleY}
            width={RESIZE_HANDLE_SIZE}
            height={RESIZE_HANDLE_SIZE}
            cornerRadius={4}
            fill={HIGHLIGHT_GOLD}
            stroke={TEXT_SILVER}
            strokeWidth={1.5}
            draggable
            onDragMove={handleResize}
            onDragEnd={handleResize}
            onDragStart={handleSelect}
            hitStrokeWidth={24}
          />
        </>
      ) : null}
    </Group>
  );
}

function renderElementIconByType(
  element: CanvasElement,
  width: number,
  height: number,
  customImage?: HTMLImageElement | null
): JSX.Element {
  if (customImage) {
    return (
      <>
        <Rect x={0} y={0} width={width} height={height} fill="rgba(0, 0, 0, 0)" listening />
        <KonvaImage image={customImage} x={0} y={0} width={width} height={height} listening={false} />
      </>
    );
  }

  const type = element.type;
  const size = Math.min(width, height);
  const offsetX = (width - size) / 2;
  const offsetY = (height - size) / 2;
  const baseInset = size * 0.08;
  const interiorInset = size * 0.18;
  const lineStroke = Math.max(size * 0.02, 1.5);
  const centerX = width / 2;
  const centerY = height / 2;

  switch (type) {
    case 'MesaRedonda': {
      const outerRadius = size / 2 - baseInset;
      const innerRadius = outerRadius * 0.7;
      return (
        <>
          <Circle
            x={centerX}
            y={centerY}
            radius={outerRadius}
            fill="#111111"
            stroke={HIGHLIGHT_GOLD}
            strokeWidth={Math.max(size * 0.08, 4)}
            shadowBlur={outerRadius * 0.65}
            shadowColor="rgba(212, 175, 55, 0.35)"
          />
          <Circle x={centerX} y={centerY} radius={innerRadius} fill={TEXT_SILVER} opacity={0.25} />
          <Circle x={centerX} y={centerY} radius={innerRadius * 0.45} fill={PRIMARY_BG} opacity={0.9} />
        </>
      );
    }
    case 'Limite': {
      return (
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          stroke={HIGHLIGHT_GOLD}
          strokeWidth={Math.max(Math.min(width, height) * 0.04, 2)}
          dash={[12, 6]}
          fill="rgba(212, 175, 55, 0.05)"
          cornerRadius={Math.min(width, height) * 0.08}
        />
      );
    }
    case 'MesaCuadrada': {
      const cornerRadius = size * 0.16;
      return (
        <>
          <Rect
            x={offsetX + baseInset}
            y={offsetY + baseInset}
            width={size - baseInset * 2}
            height={size - baseInset * 2}
            cornerRadius={cornerRadius}
            fill="#111111"
            stroke={HIGHLIGHT_GOLD}
            strokeWidth={Math.max(size * 0.08, 4)}
            shadowBlur={size * 0.35}
            shadowColor="rgba(212, 175, 55, 0.3)"
          />
          <Rect
            x={offsetX + interiorInset}
            y={offsetY + interiorInset}
            width={size - interiorInset * 2}
            height={size - interiorInset * 2}
            cornerRadius={cornerRadius * 0.75}
            fill={TEXT_SILVER}
            opacity={0.2}
          />
        </>
      );
    }
    case 'PistaBaile': {
      const inset = baseInset;
      const borderRadius = size * 0.18;
      return (
        <>
          <Rect
            x={offsetX + inset}
            y={offsetY + inset}
            width={size - inset * 2}
            height={size - inset * 2}
            cornerRadius={borderRadius}
            fill="#0f0f0f"
            stroke={HIGHLIGHT_GOLD}
            strokeWidth={Math.max(size * 0.06, 3)}
          />
          <Line
            points={[
              offsetX + size * 0.25,
              offsetY + size * 0.25,
              offsetX + size * 0.75,
              offsetY + size * 0.25,
              offsetX + size * 0.75,
              offsetY + size * 0.75,
              offsetX + size * 0.25,
              offsetY + size * 0.75,
              offsetX + size * 0.25,
              offsetY + size * 0.25,
            ]}
            stroke={TEXT_SILVER}
            strokeWidth={lineStroke}
            opacity={0.65}
            closed
          />
          <Line
            points={[
              offsetX + size * 0.25,
              offsetY + size * 0.25,
              offsetX + size * 0.75,
              offsetY + size * 0.75,
            ]}
            stroke={TEXT_SILVER}
            strokeWidth={lineStroke}
            opacity={0.5}
          />
          <Line
            points={[
              offsetX + size * 0.75,
              offsetY + size * 0.25,
              offsetX + size * 0.25,
              offsetY + size * 0.75,
            ]}
            stroke={TEXT_SILVER}
            strokeWidth={lineStroke}
            opacity={0.5}
          />
        </>
      );
    }
    case 'Franja': {
      const strokeWidth = Math.max(height * 0.5, 2.5);
      return (
        <Line
          points={[0, height / 2, width, height / 2]}
          stroke={HIGHLIGHT_GOLD}
          strokeWidth={strokeWidth}
          dash={[16, 12]}
          lineCap="round"
          opacity={0.85}
        />
      );
    }
    case 'Barra': {
      const strokeWidth = Math.max(Math.min(width, height) * 0.06, 2.5);
      const radiusX = Math.max(width / 2 - strokeWidth / 2, strokeWidth);
      const radiusY = Math.max(height / 2 - strokeWidth / 2, strokeWidth);
      const innerRadiusX = Math.max(radiusX - strokeWidth * 0.55, radiusX * 0.65);
      const innerRadiusY = Math.max(radiusY - strokeWidth * 0.55, radiusY * 0.65);
      const coreRadiusX = Math.max(innerRadiusX * 0.6, innerRadiusX - strokeWidth);
      const coreRadiusY = Math.max(innerRadiusY * 0.6, innerRadiusY - strokeWidth);

      return (
        <>
          <Ellipse
            x={centerX}
            y={centerY}
            radiusX={radiusX}
            radiusY={radiusY}
            fill="#080808"
            stroke={HIGHLIGHT_GOLD}
            strokeWidth={strokeWidth}
            shadowBlur={Math.max(radiusX, radiusY) * 0.35}
            shadowColor="rgba(212, 175, 55, 0.3)"
          />
          <Ellipse
            x={centerX}
            y={centerY}
            radiusX={innerRadiusX}
            radiusY={innerRadiusY}
            fill={TEXT_SILVER}
            opacity={0.2}
          />
          <Ellipse
            x={centerX}
            y={centerY}
            radiusX={coreRadiusX}
            radiusY={coreRadiusY}
            fill={PRIMARY_BG}
            opacity={0.88}
          />
        </>
      );
    }
    case 'Etiqueta': {
      const cornerRadius = Math.min(width, height) * 0.15;
      const textValue = element.text ?? 'Etiqueta';
      const fontSize = Math.max(12, Math.min(width, height) * 0.24);
      return (
        <>
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            cornerRadius={cornerRadius}
            fill="rgba(212, 175, 55, 0.12)"
            stroke={HIGHLIGHT_GOLD}
            strokeWidth={1.5}
          />
          <Text
            x={0}
            y={0}
            width={width}
            height={height}
            text={textValue}
            fontSize={fontSize}
            fill="#f8fafc"
            align="center"
            verticalAlign="middle"
            listening={false}
            wrap="char"
          />
        </>
      );
    }
    case 'Salida': {
      const corridorHeight = size * 0.3;
      const corridorY = (size - corridorHeight) / 2;
      const arrowPoints = [
        size * 0.25,
        size * 0.35,
        size * 0.65,
        size * 0.35,
        size * 0.65,
        size * 0.25,
        size * 0.85,
        size * 0.5,
        size * 0.65,
        size * 0.75,
        size * 0.65,
        size * 0.65,
        size * 0.25,
        size * 0.65,
      ];
      return (
        <>
          <Rect
            x={offsetX + size * 0.18}
            y={offsetY + corridorY}
            width={size * 0.5}
            height={corridorHeight}
            cornerRadius={corridorHeight * 0.4}
            fill="#0f0f0f"
            stroke={TEXT_SILVER}
            strokeWidth={Math.max(size * 0.04, 2)}
            opacity={0.85}
          />
          <Line
            points={arrowPoints.map((value, index) =>
              index % 2 === 0 ? offsetX + value : offsetY + value
            )}
            closed
            fill={HIGHLIGHT_GOLD}
            stroke={PRIMARY_BG}
            strokeWidth={Math.max(size * 0.025, 1.5)}
            lineJoin="round"
            lineCap="round"
            opacity={0.9}
          />
        </>
      );
    }
    default: {
      const padding = size * 0.1;
      return (
        <Rect
          x={offsetX + padding}
          y={offsetY + padding}
          width={size - padding * 2}
          height={size - padding * 2}
          cornerRadius={size * 0.15}
          fill="#111111"
          stroke={HIGHLIGHT_GOLD}
          strokeWidth={Math.max(size * 0.05, 2)}
          opacity={0.9}
        />
      );
    }
  }
}
