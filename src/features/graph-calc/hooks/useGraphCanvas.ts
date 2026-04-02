import { useRef, useCallback, useEffect } from 'react';
import type { GraphViewport, GraphFunction, GraphTool, GraphPoint } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../types';
import { parseExpression, numericalDerivative, numericalIntegral } from '../utils/mathParser';
import {
  mathToPixel,
  pixelToMath,
  getVisibleRange,
  computeGridSpacing,
  formatTickLabel,
} from '../utils/graphHelpers';

interface UseGraphCanvasOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  viewportRef: React.RefObject<GraphViewport>;
  functionsRef: React.RefObject<GraphFunction[]>;
  activeTool: GraphTool;
  onPan: (dx: number, dy: number) => void;
  onZoom: (factor: number, cx: number, cy: number) => void;
  onHoverPoint: (info: { x: number; y: number; fnId: string; pixelX: number; pixelY: number } | null) => void;
  onTangentClick?: (info: { fnId: string; x: number; y: number; slope: number } | null) => void;
  onAreaSelect?: (info: { fnId: string; xStart: number; xEnd: number; area: number } | null) => void;
}

function renderGrid(
  ctx: CanvasRenderingContext2D,
  viewport: GraphViewport,
  width: number,
  height: number,
) {
  const range = getVisibleRange(viewport, width, height);
  const spacingX = computeGridSpacing(viewport.scaleX);
  const spacingY = computeGridSpacing(viewport.scaleY);

  // Sub-grid lines
  ctx.strokeStyle = '#f3f4f6';
  ctx.lineWidth = 0.5;
  const subX = spacingX / 5;
  const subY = spacingY / 5;

  const startSubX = Math.floor(range.xMin / subX) * subX;
  ctx.beginPath();
  for (let x = startSubX; x <= range.xMax; x += subX) {
    const { px } = mathToPixel(x, 0, viewport, width, height);
    ctx.moveTo(px, 0);
    ctx.lineTo(px, height);
  }

  const startSubY = Math.floor(range.yMin / subY) * subY;
  for (let y = startSubY; y <= range.yMax; y += subY) {
    const { py } = mathToPixel(0, y, viewport, width, height);
    ctx.moveTo(0, py);
    ctx.lineTo(width, py);
  }
  ctx.stroke();

  // Major grid lines
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 0.75;

  const startX = Math.floor(range.xMin / spacingX) * spacingX;
  ctx.beginPath();
  for (let x = startX; x <= range.xMax; x += spacingX) {
    const { px } = mathToPixel(x, 0, viewport, width, height);
    ctx.moveTo(px, 0);
    ctx.lineTo(px, height);
  }

  const startY = Math.floor(range.yMin / spacingY) * spacingY;
  for (let y = startY; y <= range.yMax; y += spacingY) {
    const { py } = mathToPixel(0, y, viewport, width, height);
    ctx.moveTo(0, py);
    ctx.lineTo(width, py);
  }
  ctx.stroke();
}

function renderAxes(
  ctx: CanvasRenderingContext2D,
  viewport: GraphViewport,
  width: number,
  height: number,
) {
  const range = getVisibleRange(viewport, width, height);
  const spacingX = computeGridSpacing(viewport.scaleX);
  const spacingY = computeGridSpacing(viewport.scaleY);

  // Y-axis
  if (range.xMin <= 0 && range.xMax >= 0) {
    const { px } = mathToPixel(0, 0, viewport, width, height);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, height);
    ctx.stroke();

    // Arrow tip
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px - 5, 10);
    ctx.lineTo(px + 5, 10);
    ctx.closePath();
    ctx.fill();
  }

  // X-axis
  if (range.yMin <= 0 && range.yMax >= 0) {
    const { py } = mathToPixel(0, 0, viewport, width, height);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(width, py);
    ctx.stroke();

    // Arrow tip
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.moveTo(width, py);
    ctx.lineTo(width - 10, py - 5);
    ctx.lineTo(width - 10, py + 5);
    ctx.closePath();
    ctx.fill();
  }

  // Tick labels
  ctx.fillStyle = '#6b7280';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const originPixel = mathToPixel(0, 0, viewport, width, height);

  // X-axis labels
  const startX = Math.floor(range.xMin / spacingX) * spacingX;
  for (let x = startX; x <= range.xMax; x += spacingX) {
    if (Math.abs(x) < spacingX * 0.01) continue; // skip origin
    const { px } = mathToPixel(x, 0, viewport, width, height);
    const labelY = Math.max(0, Math.min(height - 15, originPixel.py + 5));
    ctx.fillText(formatTickLabel(x), px, labelY);
  }

  // Y-axis labels
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const startY = Math.floor(range.yMin / spacingY) * spacingY;
  for (let y = startY; y <= range.yMax; y += spacingY) {
    if (Math.abs(y) < spacingY * 0.01) continue;
    const { py } = mathToPixel(0, y, viewport, width, height);
    const labelX = Math.max(30, Math.min(width, originPixel.px - 5));
    ctx.fillText(formatTickLabel(y), labelX, py);
  }
}

function renderFunction(
  ctx: CanvasRenderingContext2D,
  fn: GraphFunction,
  viewport: GraphViewport,
  width: number,
  height: number,
  isInequality: boolean = false,
) {
  const parsed = parseExpression(fn.expression);
  if (!parsed.success || !parsed.evaluate) return;

  const scope: Record<string, number> = {};
  if (fn.sliderParams) {
    for (const p of fn.sliderParams) {
      scope[p.name] = p.value;
    }
  }

  const points: (GraphPoint & { px: number; py: number } | null)[] = [];

  for (let px = 0; px <= width; px++) {
    const { mx } = pixelToMath(px, 0, viewport, width, height);
    const my = parsed.evaluate({ ...scope, x: mx });

    if (!isFinite(my)) {
      points.push(null);
      continue;
    }

    const { py } = mathToPixel(mx, my, viewport, width, height);

    if (py < -height * 5 || py > height * 6) {
      points.push(null);
      continue;
    }

    points.push({ x: mx, y: my, px, py });
  }

  // Draw inequality shading
  if (isInequality) {
    ctx.fillStyle = fn.color + '30'; // 0.19 alpha
    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      if (!pt) continue;
      ctx.fillRect(pt.px, 0, 1, pt.py);
    }
  }

  // Draw curve as connected segments, breaking at discontinuities
  ctx.strokeStyle = fn.color;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  let drawing = false;
  ctx.beginPath();

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    if (!pt) {
      drawing = false;
      continue;
    }

    // Check for discontinuity
    if (drawing && i > 0) {
      const prev = points[i - 1];
      if (prev && Math.abs(pt.py - prev.py) > height / 2) {
        ctx.stroke();
        ctx.beginPath();
        drawing = false;
      }
    }

    if (!drawing) {
      ctx.moveTo(pt.px, pt.py);
      drawing = true;
    } else {
      ctx.lineTo(pt.px, pt.py);
    }
  }

  ctx.stroke();
}

export function useGraphCanvas({
  canvasRef,
  viewportRef,
  functionsRef,
  activeTool,
  onPan,
  onZoom,
  onHoverPoint,
  onTangentClick,
  onAreaSelect,
}: UseGraphCanvasOptions) {
  const isPanningRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;
  const areaStartRef = useRef<{ px: number; mx: number } | null>(null);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const viewport = viewportRef.current;
    const functions = functionsRef.current;
    const width = CANVAS_WIDTH;
    const height = CANVAS_HEIGHT;

    // Clear
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Grid
    renderGrid(ctx, viewport, width, height);

    // Axes
    renderAxes(ctx, viewport, width, height);

    // Functions
    for (const fn of functions) {
      if (!fn.visible || !fn.expression.trim()) continue;
      renderFunction(ctx, fn, viewport, width, height, false);
    }
  }, [canvasRef, viewportRef, functionsRef]);

  const findNearestPoint = useCallback(
    (pixelX: number, pixelY: number): { fnId: string; x: number; y: number; dist: number } | null => {
      const viewport = viewportRef.current;
      const functions = functionsRef.current;
      let closest: { fnId: string; x: number; y: number; dist: number } | null = null;

      for (const fn of functions) {
        if (!fn.visible || !fn.expression.trim()) continue;
        const parsed = parseExpression(fn.expression);
        if (!parsed.success || !parsed.evaluate) continue;

        const scope: Record<string, number> = {};
        if (fn.sliderParams) {
          for (const p of fn.sliderParams) scope[p.name] = p.value;
        }

        const { mx } = pixelToMath(pixelX, pixelY, viewport, CANVAS_WIDTH, CANVAS_HEIGHT);
        const my = parsed.evaluate({ ...scope, x: mx });
        if (!isFinite(my)) continue;

        const { py } = mathToPixel(mx, my, viewport, CANVAS_WIDTH, CANVAS_HEIGHT);
        const dist = Math.abs(py - pixelY);

        if (dist < 15 && (!closest || dist < closest.dist)) {
          closest = { fnId: fn.id, x: mx, y: my, dist };
        }
      }

      return closest;
    },
    [viewportRef, functionsRef],
  );

  // Attach mouse event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
      const y = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);

      if (activeToolRef.current === 'tangent') {
        const nearest = findNearestPoint(x, y);
        if (nearest && onTangentClick) {
          const fn = functionsRef.current.find(f => f.id === nearest.fnId);
          if (fn) {
            const parsed = parseExpression(fn.expression);
            if (parsed.evaluate) {
              const scope: Record<string, number> = {};
              if (fn.sliderParams) for (const p of fn.sliderParams) scope[p.name] = p.value;
              const slope = numericalDerivative(parsed.evaluate, nearest.x, 1e-7, scope);
              onTangentClick({ fnId: fn.id, x: nearest.x, y: nearest.y, slope });
            }
          }
        }
        return;
      }

      if (activeToolRef.current === 'area') {
        const { mx } = pixelToMath(x, y, viewportRef.current, CANVAS_WIDTH, CANVAS_HEIGHT);
        areaStartRef.current = { px: x, mx };
        return;
      }

      // Default: pan
      isPanningRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isPanningRef.current) {
        const dx = e.clientX - lastMouseRef.current.x;
        const dy = e.clientY - lastMouseRef.current.y;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
        const rect = canvas.getBoundingClientRect();
        onPan(dx * (CANVAS_WIDTH / rect.width), dy * (CANVAS_HEIGHT / rect.height));
        return;
      }

      // Hover point detection
      const rect = canvas.getBoundingClientRect();
      const px = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
      const py = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
      const nearest = findNearestPoint(px, py);

      if (nearest) {
        onHoverPoint({ x: nearest.x, y: nearest.y, fnId: nearest.fnId, pixelX: e.clientX - rect.left, pixelY: e.clientY - rect.top });
      } else {
        onHoverPoint(null);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (activeToolRef.current === 'area' && areaStartRef.current) {
        const rect = canvas.getBoundingClientRect();
        const px = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
        const { mx: xEnd } = pixelToMath(px, 0, viewportRef.current, CANVAS_WIDTH, CANVAS_HEIGHT);
        const xStart = areaStartRef.current.mx;

        // Find the function under cursor at start
        const nearest = findNearestPoint(areaStartRef.current.px, CANVAS_HEIGHT / 2);
        if (nearest && onAreaSelect) {
          const fn = functionsRef.current.find(f => f.id === nearest.fnId);
          if (fn) {
            const parsed = parseExpression(fn.expression);
            if (parsed.evaluate) {
              const scope: Record<string, number> = {};
              if (fn.sliderParams) for (const p of fn.sliderParams) scope[p.name] = p.value;
              const area = numericalIntegral(parsed.evaluate, Math.min(xStart, xEnd), Math.max(xStart, xEnd), 100, scope);
              onAreaSelect({ fnId: fn.id, xStart: Math.min(xStart, xEnd), xEnd: Math.max(xStart, xEnd), area });
            }
          }
        }
        areaStartRef.current = null;
        return;
      }

      isPanningRef.current = false;
    };

    const handleMouseLeave = () => {
      isPanningRef.current = false;
      onHoverPoint(null);
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const px = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
      const py = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      onZoom(factor, px, py);
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    // Touch support
    let lastTouchDist = 0;
    let lastTouchCenter = { x: 0, y: 0 };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isPanningRef.current = true;
        lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastTouchDist = Math.sqrt(dx * dx + dy * dy);
        lastTouchCenter = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1 && isPanningRef.current) {
        const dx = e.touches[0].clientX - lastMouseRef.current.x;
        const dy = e.touches[0].clientY - lastMouseRef.current.y;
        lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        const rect = canvas.getBoundingClientRect();
        onPan(dx * (CANVAS_WIDTH / rect.width), dy * (CANVAS_HEIGHT / rect.height));
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (lastTouchDist > 0) {
          const factor = dist / lastTouchDist;
          const rect = canvas.getBoundingClientRect();
          const cx = ((lastTouchCenter.x - rect.left) * CANVAS_WIDTH) / rect.width;
          const cy = ((lastTouchCenter.y - rect.top) * CANVAS_HEIGHT) / rect.height;
          onZoom(factor, cx, cy);
        }
        lastTouchDist = dist;
        lastTouchCenter = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        };
      }
    };

    const handleTouchEnd = () => {
      isPanningRef.current = false;
      lastTouchDist = 0;
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [canvasRef, onPan, onZoom, onHoverPoint, onTangentClick, onAreaSelect, findNearestPoint, viewportRef, functionsRef]);

  return { render, findNearestPoint };
}
