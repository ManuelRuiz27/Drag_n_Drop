import type { ElementConfig } from '../context/types';
import type { Stage } from 'konva/lib/Stage';

type StageLike = Stage | { current: Stage | null } | null | undefined;

export interface PersistDesignOptions {
  method?: 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  token?: string;
  fetchImpl?: typeof fetch;
}

function resolveStage(stageLike: StageLike): Stage | null {
  if (!stageLike) {
    return null;
  }

  if ('current' in stageLike) {
    return stageLike.current;
  }

  return stageLike ?? null;
}

export function exportDesignToJSON(elements: ElementConfig[]): string {
  return JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      elements,
    },
    null,
    2
  );
}

export async function persistDesignToApi(
  elements: ElementConfig[],
  endpoint: string,
  options: PersistDesignOptions = {}
): Promise<Response> {
  if (!endpoint) {
    throw new Error('Cannot persist design: endpoint is required.');
  }

  const { method = 'POST', headers = {}, token, fetchImpl } = options;
  const fetchFn = fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : undefined);

  if (!fetchFn) {
    throw new Error('Cannot persist design: fetch is not available in this environment.');
  }

  const body = exportDesignToJSON(elements);
  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    finalHeaders.Authorization = finalHeaders.Authorization ?? `Bearer ${token}`;
  }

  const response = await fetchFn(endpoint, {
    method,
    headers: finalHeaders,
    body,
  });

  if (!response.ok) {
    let errorMessage: string | null = null;
    try {
      errorMessage = await response.text();
    } catch {
      errorMessage = null;
    }

    const message = errorMessage?.trim()
      ? ` - ${errorMessage.substring(0, 200)}`
      : '';

    throw new Error(`Failed to persist design (${response.status} ${response.statusText})${message}`);
  }

  return response;
}

export async function exportDesignToPDF(stageRef: StageLike): Promise<void> {
  const stage = resolveStage(stageRef);

  if (!stage) {
    throw new Error('Cannot export canvas: the stage reference is not available.');
  }

  const dataUrl = stage.toDataURL({ pixelRatio: 2 });

  const { jsPDF } = await import('jspdf');

  const orientation = stage.width() >= stage.height() ? 'landscape' : 'portrait';
  const pdf = new jsPDF({
    orientation,
    unit: 'pt',
    format: [stage.width(), stage.height()],
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  const imageProps = pdf.getImageProperties(dataUrl);
  let renderWidth = pdfWidth;
  let renderHeight = (imageProps.height * renderWidth) / imageProps.width;

  if (renderHeight > pdfHeight) {
    renderHeight = pdfHeight;
    renderWidth = (imageProps.width * renderHeight) / imageProps.height;
  }

  const offsetX = (pdfWidth - renderWidth) / 2;
  const offsetY = (pdfHeight - renderHeight) / 2;

  pdf.addImage(dataUrl, 'PNG', offsetX, offsetY, renderWidth, renderHeight);
  pdf.save('canvas-design.pdf');
}
