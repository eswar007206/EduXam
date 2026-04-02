import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import type { GraphCalcCanvasHandle, GraphViewport, GraphFunction, GraphTool } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../types';
import { useGraphCanvas } from '../hooks/useGraphCanvas';

interface Props {
  viewport: GraphViewport;
  viewportRef: React.RefObject<GraphViewport>;
  functions: GraphFunction[];
  functionsRef: React.RefObject<GraphFunction[]>;
  activeTool: GraphTool;
  onPan: (dx: number, dy: number) => void;
  onZoom: (factor: number, cx: number, cy: number) => void;
  onHoverPoint: (info: { x: number; y: number; fnId: string; pixelX: number; pixelY: number } | null) => void;
  onTangentClick?: (info: { fnId: string; x: number; y: number; slope: number } | null) => void;
  onAreaSelect?: (info: { fnId: string; xStart: number; xEnd: number; area: number } | null) => void;
}

export const GraphCalcCanvas = forwardRef<GraphCalcCanvasHandle, Props>(
  function GraphCalcCanvas(props, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const { render } = useGraphCanvas({
      canvasRef,
      viewportRef: props.viewportRef,
      functionsRef: props.functionsRef,
      activeTool: props.activeTool,
      onPan: props.onPan,
      onZoom: props.onZoom,
      onHoverPoint: props.onHoverPoint,
      onTangentClick: props.onTangentClick,
      onAreaSelect: props.onAreaSelect,
    });

    useImperativeHandle(ref, () => ({
      toDataURL: () => canvasRef.current?.toDataURL('image/png') ?? '',
      resetView: () => {},
      getViewport: () => props.viewportRef.current,
    }));

    useEffect(() => {
      render();
    }, [props.viewport, props.functions, render]);

    const cursorStyle =
      props.activeTool === 'pointer'
        ? 'crosshair'
        : props.activeTool === 'area'
          ? 'col-resize'
          : 'pointer';

    return (
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="graph-calc-canvas"
        style={{ cursor: cursorStyle }}
      />
    );
  },
);
