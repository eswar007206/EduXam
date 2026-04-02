import type { GraphViewport } from '../types';

export function mathToPixel(
  mathX: number,
  mathY: number,
  viewport: GraphViewport,
  canvasWidth: number,
  canvasHeight: number,
): { px: number; py: number } {
  const px = (mathX - viewport.centerX) / viewport.scaleX + canvasWidth / 2;
  const py = canvasHeight / 2 - (mathY - viewport.centerY) / viewport.scaleY;
  return { px, py };
}

export function pixelToMath(
  px: number,
  py: number,
  viewport: GraphViewport,
  canvasWidth: number,
  canvasHeight: number,
): { mx: number; my: number } {
  const mx = (px - canvasWidth / 2) * viewport.scaleX + viewport.centerX;
  const my = (canvasHeight / 2 - py) * viewport.scaleY + viewport.centerY;
  return { mx, my };
}

export function getVisibleRange(
  viewport: GraphViewport,
  canvasWidth: number,
  canvasHeight: number,
): { xMin: number; xMax: number; yMin: number; yMax: number } {
  const halfW = (canvasWidth / 2) * viewport.scaleX;
  const halfH = (canvasHeight / 2) * viewport.scaleY;
  return {
    xMin: viewport.centerX - halfW,
    xMax: viewport.centerX + halfW,
    yMin: viewport.centerY - halfH,
    yMax: viewport.centerY + halfH,
  };
}

export function computeGridSpacing(unitsPerPixel: number, pixelTarget: number = 60): number {
  const rawSpacing = unitsPerPixel * pixelTarget;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawSpacing)));
  const normalized = rawSpacing / magnitude;

  if (normalized < 1.5) return magnitude;
  if (normalized < 3.5) return 2 * magnitude;
  if (normalized < 7.5) return 5 * magnitude;
  return 10 * magnitude;
}

export function formatTickLabel(value: number): string {
  if (Math.abs(value) < 1e-10) return '0';
  if (Math.abs(value) >= 10000 || (Math.abs(value) < 0.01 && value !== 0)) {
    return value.toExponential(1);
  }
  return parseFloat(value.toPrecision(10)).toString();
}
