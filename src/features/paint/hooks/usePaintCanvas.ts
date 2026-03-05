import { useRef, useCallback, useEffect } from 'react';
import type { PaintState, Point } from '../types';
import { SHAPE_TOOLS } from '../types';

interface UsePaintCanvasOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  paintState: PaintState;
  onDrawComplete: () => void;
  onTextToolClick?: (position: Point) => void;
}

// ── Polygon helper: generates points for a regular polygon ──
function regularPolygonPoints(cx: number, cy: number, rx: number, ry: number, sides: number, rotationOffset = -Math.PI / 2): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = rotationOffset + (2 * Math.PI * i) / sides;
    pts.push({ x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) });
  }
  return pts;
}

// ── Star helper: generates points for an n-pointed star ──
function starPoints(cx: number, cy: number, rx: number, ry: number, points: number, innerRatio = 0.4): Point[] {
  const pts: Point[] = [];
  const totalPts = points * 2;
  for (let i = 0; i < totalPts; i++) {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / totalPts;
    const isOuter = i % 2 === 0;
    const r = isOuter ? 1 : innerRatio;
    pts.push({ x: cx + rx * r * Math.cos(angle), y: cy + ry * r * Math.sin(angle) });
  }
  return pts;
}

// ── Draw arbitrary polygon path ──
function tracePath(ctx: CanvasRenderingContext2D, pts: Point[], close = true) {
  if (pts.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  if (close) ctx.closePath();
}

export function usePaintCanvas({
  canvasRef,
  paintState,
  onDrawComplete,
  onTextToolClick,
}: UsePaintCanvasOptions) {
  const isDrawingRef = useRef(false);
  const startPointRef = useRef<Point>({ x: 0, y: 0 });
  const previewSnapshotRef = useRef<ImageData | null>(null);
  const paintStateRef = useRef(paintState);
  paintStateRef.current = paintState;

  const getCtx = useCallback(() => {
    return canvasRef.current?.getContext('2d') ?? null;
  }, [canvasRef]);

  const getCanvasPoint = useCallback(
    (e: MouseEvent): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    [canvasRef]
  );

  // ── Helper: apply stroke/fill for a shape path already traced ──
  const applyShapeStyle = useCallback((ctx: CanvasRenderingContext2D) => {
    const { strokeColor, fillColor, brushSize, shapeMode } = paintStateRef.current;
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = strokeColor;
    if (shapeMode === 'filled') {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    ctx.stroke();
  }, []);

  // ── Bounding box from start/end ──
  const getBounds = useCallback((start: Point, end: Point) => {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.abs(end.x - start.x);
    const h = Math.abs(end.y - start.y);
    const cx = x + w / 2;
    const cy = y + h / 2;
    return { x, y, w, h, cx, cy, rx: w / 2, ry: h / 2 };
  }, []);

  // ════════════════════════════════════════════
  // Shape drawing functions
  // ════════════════════════════════════════════

  const drawLine = useCallback(
    (ctx: CanvasRenderingContext2D, start: Point, end: Point) => {
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.strokeStyle = paintStateRef.current.strokeColor;
      ctx.lineWidth = paintStateRef.current.brushSize;
      ctx.lineCap = 'round';
      ctx.stroke();
    },
    []
  );

  const drawArrow = useCallback(
    (ctx: CanvasRenderingContext2D, start: Point, end: Point) => {
      const headLength = Math.max(15, paintStateRef.current.brushSize * 3);
      const angle = Math.atan2(end.y - start.y, end.x - start.x);

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.strokeStyle = paintStateRef.current.strokeColor;
      ctx.lineWidth = paintStateRef.current.brushSize;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(end.x - headLength * Math.cos(angle - Math.PI / 6), end.y - headLength * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(end.x - headLength * Math.cos(angle + Math.PI / 6), end.y - headLength * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fillStyle = paintStateRef.current.strokeColor;
      ctx.fill();
    },
    []
  );

  const drawRectangle = useCallback(
    (ctx: CanvasRenderingContext2D, start: Point, end: Point) => {
      const { x, y, w, h } = getBounds(start, end);
      ctx.lineWidth = paintStateRef.current.brushSize;
      ctx.strokeStyle = paintStateRef.current.strokeColor;
      if (paintStateRef.current.shapeMode === 'filled') {
        ctx.fillStyle = paintStateRef.current.fillColor;
        ctx.fillRect(x, y, w, h);
      }
      ctx.strokeRect(x, y, w, h);
    },
    [getBounds]
  );

  const drawRoundedRect = useCallback(
    (ctx: CanvasRenderingContext2D, start: Point, end: Point) => {
      const { x, y, w, h } = getBounds(start, end);
      const radius = Math.min(20, w / 4, h / 4);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.arcTo(x + w, y, x + w, y + radius, radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
      ctx.lineTo(x + radius, y + h);
      ctx.arcTo(x, y + h, x, y + h - radius, radius);
      ctx.lineTo(x, y + radius);
      ctx.arcTo(x, y, x + radius, y, radius);
      ctx.closePath();
      applyShapeStyle(ctx);
    },
    [getBounds, applyShapeStyle]
  );

  const drawEllipse = useCallback(
    (ctx: CanvasRenderingContext2D, start: Point, end: Point) => {
      const { cx, cy, rx, ry } = getBounds(start, end);
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2);
      applyShapeStyle(ctx);
    },
    [getBounds, applyShapeStyle]
  );

  const drawTriangle = useCallback(
    (ctx: CanvasRenderingContext2D, start: Point, end: Point) => {
      const { x, y, w, h } = getBounds(start, end);
      const pts: Point[] = [
        { x: x + w / 2, y },
        { x: x + w, y: y + h },
        { x, y: y + h },
      ];
      tracePath(ctx, pts);
      applyShapeStyle(ctx);
    },
    [getBounds, applyShapeStyle]
  );

  const drawRightTriangle = useCallback(
    (ctx: CanvasRenderingContext2D, start: Point, end: Point) => {
      const { x, y, w, h } = getBounds(start, end);
      const pts: Point[] = [
        { x, y },
        { x, y: y + h },
        { x: x + w, y: y + h },
      ];
      tracePath(ctx, pts);
      applyShapeStyle(ctx);
    },
    [getBounds, applyShapeStyle]
  );

  const drawDiamond = useCallback(
    (ctx: CanvasRenderingContext2D, start: Point, end: Point) => {
      const { cx, cy, rx, ry } = getBounds(start, end);
      const pts: Point[] = [
        { x: cx, y: cy - ry },
        { x: cx + rx, y: cy },
        { x: cx, y: cy + ry },
        { x: cx - rx, y: cy },
      ];
      tracePath(ctx, pts);
      applyShapeStyle(ctx);
    },
    [getBounds, applyShapeStyle]
  );

  const drawPentagon = useCallback(
    (ctx: CanvasRenderingContext2D, start: Point, end: Point) => {
      const { cx, cy, rx, ry } = getBounds(start, end);
      const pts = regularPolygonPoints(cx, cy, rx, ry, 5);
      tracePath(ctx, pts);
      applyShapeStyle(ctx);
    },
    [getBounds, applyShapeStyle]
  );

  const drawHexagon = useCallback(
    (ctx: CanvasRenderingContext2D, start: Point, end: Point) => {
      const { cx, cy, rx, ry } = getBounds(start, end);
      const pts = regularPolygonPoints(cx, cy, rx, ry, 6, 0);
      tracePath(ctx, pts);
      applyShapeStyle(ctx);
    },
    [getBounds, applyShapeStyle]
  );

  const drawStar5 = useCallback(
    (ctx: CanvasRenderingContext2D, start: Point, end: Point) => {
      const { cx, cy, rx, ry } = getBounds(start, end);
      const pts = starPoints(cx, cy, rx, ry, 5);
      tracePath(ctx, pts);
      applyShapeStyle(ctx);
    },
    [getBounds, applyShapeStyle]
  );

  const drawStar6 = useCallback(
    (ctx: CanvasRenderingContext2D, start: Point, end: Point) => {
      const { cx, cy, rx, ry } = getBounds(start, end);
      const pts = starPoints(cx, cy, rx, ry, 6, 0.45);
      tracePath(ctx, pts);
      applyShapeStyle(ctx);
    },
    [getBounds, applyShapeStyle]
  );

  const drawHeart = useCallback(
    (ctx: CanvasRenderingContext2D, start: Point, end: Point) => {
      const { x, y, w, h } = getBounds(start, end);
      ctx.beginPath();
      const topY = y + h * 0.3;
      ctx.moveTo(x + w / 2, y + h);
      // Left curve
      ctx.bezierCurveTo(x - w * 0.1, y + h * 0.55, x - w * 0.05, topY - h * 0.2, x + w * 0.25, topY - h * 0.2);
      ctx.bezierCurveTo(x + w * 0.4, topY - h * 0.2, x + w / 2, topY, x + w / 2, topY + h * 0.1);
      // Right curve
      ctx.bezierCurveTo(x + w / 2, topY, x + w * 0.6, topY - h * 0.2, x + w * 0.75, topY - h * 0.2);
      ctx.bezierCurveTo(x + w * 1.05, topY - h * 0.2, x + w * 1.1, y + h * 0.55, x + w / 2, y + h);
      ctx.closePath();
      applyShapeStyle(ctx);
    },
    [getBounds, applyShapeStyle]
  );

  const drawLightning = useCallback(
    (ctx: CanvasRenderingContext2D, start: Point, end: Point) => {
      const { x, y, w, h } = getBounds(start, end);
      const pts: Point[] = [
        { x: x + w * 0.35, y },
        { x: x + w * 0.75, y },
        { x: x + w * 0.45, y: y + h * 0.4 },
        { x: x + w * 0.7, y: y + h * 0.4 },
        { x: x + w * 0.2, y: y + h },
        { x: x + w * 0.4, y: y + h * 0.55 },
        { x: x + w * 0.15, y: y + h * 0.55 },
      ];
      tracePath(ctx, pts);
      applyShapeStyle(ctx);
    },
    [getBounds, applyShapeStyle]
  );

  // ── Dispatch shape draw by tool name ──
  const drawShape = useCallback(
    (ctx: CanvasRenderingContext2D, tool: string, start: Point, end: Point) => {
      switch (tool) {
        case 'line': drawLine(ctx, start, end); break;
        case 'arrow': drawArrow(ctx, start, end); break;
        case 'rectangle': drawRectangle(ctx, start, end); break;
        case 'roundedRect': drawRoundedRect(ctx, start, end); break;
        case 'ellipse': drawEllipse(ctx, start, end); break;
        case 'triangle': drawTriangle(ctx, start, end); break;
        case 'rightTriangle': drawRightTriangle(ctx, start, end); break;
        case 'diamond': drawDiamond(ctx, start, end); break;
        case 'pentagon': drawPentagon(ctx, start, end); break;
        case 'hexagon': drawHexagon(ctx, start, end); break;
        case 'star5': drawStar5(ctx, start, end); break;
        case 'star6': drawStar6(ctx, start, end); break;
        case 'heart': drawHeart(ctx, start, end); break;
        case 'lightning': drawLightning(ctx, start, end); break;
      }
    },
    [drawLine, drawArrow, drawRectangle, drawRoundedRect, drawEllipse,
     drawTriangle, drawRightTriangle, drawDiamond, drawPentagon,
     drawHexagon, drawStar5, drawStar6, drawHeart, drawLightning]
  );

  // ── Flood fill ──
  const floodFill = useCallback(
    (ctx: CanvasRenderingContext2D, startPoint: Point, fillColorHex: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const width = canvas.width;
      const height = canvas.height;

      const fillR = parseInt(fillColorHex.slice(1, 3), 16);
      const fillG = parseInt(fillColorHex.slice(3, 5), 16);
      const fillB = parseInt(fillColorHex.slice(5, 7), 16);

      const sx = Math.max(0, Math.min(Math.floor(startPoint.x), width - 1));
      const sy = Math.max(0, Math.min(Math.floor(startPoint.y), height - 1));
      const startIdx = (sy * width + sx) * 4;
      const targetR = data[startIdx];
      const targetG = data[startIdx + 1];
      const targetB = data[startIdx + 2];
      const targetA = data[startIdx + 3];

      if (targetR === fillR && targetG === fillG && targetB === fillB && targetA === 255) return;

      const tolerance = 10;
      const matchesTarget = (idx: number) =>
        Math.abs(data[idx] - targetR) <= tolerance &&
        Math.abs(data[idx + 1] - targetG) <= tolerance &&
        Math.abs(data[idx + 2] - targetB) <= tolerance &&
        Math.abs(data[idx + 3] - targetA) <= tolerance;

      const stack: number[] = [sx, sy];
      const visited = new Uint8Array(width * height);

      while (stack.length > 0) {
        const cy = stack.pop()!;
        const cx = stack.pop()!;
        if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;
        const visitIdx = cy * width + cx;
        if (visited[visitIdx]) continue;
        const pixelIdx = visitIdx * 4;
        if (!matchesTarget(pixelIdx)) continue;

        visited[visitIdx] = 1;
        data[pixelIdx] = fillR;
        data[pixelIdx + 1] = fillG;
        data[pixelIdx + 2] = fillB;
        data[pixelIdx + 3] = 255;

        stack.push(cx + 1, cy);
        stack.push(cx - 1, cy);
        stack.push(cx, cy + 1);
        stack.push(cx, cy - 1);
      }

      ctx.putImageData(imageData, 0, 0);
    },
    [canvasRef]
  );

  // ════════════════════════════════════════════
  // Mouse event handlers
  // ════════════════════════════════════════════

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      const ctx = getCtx();
      if (!ctx) return;
      const point = getCanvasPoint(e);
      const { activeTool } = paintStateRef.current;

      if (activeTool === 'text') {
        onTextToolClick?.(point);
        return;
      }

      if (activeTool === 'fill') {
        floodFill(ctx, point, paintStateRef.current.strokeColor);
        onDrawComplete();
        return;
      }

      isDrawingRef.current = true;
      startPointRef.current = point;

      if (activeTool === 'pencil' || activeTool === 'eraser') {
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineWidth = paintStateRef.current.brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle =
          activeTool === 'eraser'
            ? '#FFFFFF'
            : paintStateRef.current.strokeColor;
      } else if (SHAPE_TOOLS.includes(activeTool)) {
        const canvas = canvasRef.current!;
        previewSnapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      }
    },
    [getCtx, getCanvasPoint, floodFill, onDrawComplete, onTextToolClick, canvasRef]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDrawingRef.current) return;
      const ctx = getCtx();
      if (!ctx) return;
      const point = getCanvasPoint(e);
      const { activeTool } = paintStateRef.current;

      if (activeTool === 'pencil' || activeTool === 'eraser') {
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      } else if (SHAPE_TOOLS.includes(activeTool)) {
        if (previewSnapshotRef.current) {
          ctx.putImageData(previewSnapshotRef.current, 0, 0);
        }
        drawShape(ctx, activeTool, startPointRef.current, point);
      }
    },
    [getCtx, getCanvasPoint, drawShape]
  );

  const handleMouseUp = useCallback(
    (_e: MouseEvent) => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;

      previewSnapshotRef.current = null;
      onDrawComplete();
    },
    [onDrawComplete]
  );

  // Attach canvas listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [canvasRef, handleMouseDown, handleMouseMove, handleMouseUp]);

  // ── Public API ──
  const clearCanvas = useCallback(() => {
    const ctx = getCtx();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [getCtx, canvasRef]);

  const getSnapshot = useCallback((): ImageData | null => {
    const ctx = getCtx();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return null;
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }, [getCtx, canvasRef]);

  const restoreSnapshot = useCallback(
    (imageData: ImageData) => {
      const ctx = getCtx();
      if (!ctx) return;
      ctx.putImageData(imageData, 0, 0);
    },
    [getCtx]
  );

  const toDataURL = useCallback((): string => {
    return canvasRef.current?.toDataURL('image/png') ?? '';
  }, [canvasRef]);

  const drawText = useCallback(
    (text: string, position: Point, fontSize: number) => {
      const ctx = getCtx();
      if (!ctx) return;
      ctx.font = `${fontSize}px Arial, sans-serif`;
      ctx.fillStyle = paintStateRef.current.strokeColor;
      ctx.textBaseline = 'top';
      ctx.fillText(text, position.x, position.y);
      onDrawComplete();
    },
    [getCtx, onDrawComplete]
  );

  return { clearCanvas, getSnapshot, restoreSnapshot, toDataURL, drawText };
}
