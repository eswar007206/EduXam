import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import type { PaintState, Point } from '../types';
import { usePaintCanvas } from '../hooks/usePaintCanvas';

export interface PaintCanvasHandle {
  getSnapshot: () => ImageData | null;
  restoreSnapshot: (data: ImageData) => void;
  clearCanvas: () => void;
  toDataURL: () => string;
  drawText: (text: string, position: Point, fontSize: number) => void;
}

interface Props {
  width: number;
  height: number;
  paintState: PaintState;
  onDrawComplete: () => void;
  onTextToolClick?: (position: Point) => void;
}

function getCursorForTool(tool: string): string {
  switch (tool) {
    case 'pencil': return 'crosshair';
    case 'eraser': return 'cell';
    case 'text': return 'text';
    case 'fill': return 'crosshair';
    default: return 'crosshair';
  }
}

export const PaintCanvas = forwardRef<PaintCanvasHandle, Props>(
  function PaintCanvas({ width, height, paintState, onDrawComplete, onTextToolClick }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const { clearCanvas, getSnapshot, restoreSnapshot, toDataURL, drawText } =
      usePaintCanvas({ canvasRef, paintState, onDrawComplete, onTextToolClick });

    useImperativeHandle(ref, () => ({
      getSnapshot,
      restoreSnapshot,
      clearCanvas,
      toDataURL,
      drawText,
    }));

    // Initialize canvas with white background
    useEffect(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="paint-canvas"
        style={{ cursor: getCursorForTool(paintState.activeTool) }}
      />
    );
  }
);
