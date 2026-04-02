import { useState, useCallback, useRef } from 'react';
import type { GraphViewport } from '../types';
import { DEFAULT_VIEWPORT, CANVAS_WIDTH, CANVAS_HEIGHT } from '../types';

export function useGraphViewport() {
  const [viewport, setViewport] = useState<GraphViewport>(DEFAULT_VIEWPORT);
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  const pan = useCallback((deltaPixelX: number, deltaPixelY: number) => {
    setViewport(v => ({
      ...v,
      centerX: v.centerX - deltaPixelX * v.scaleX,
      centerY: v.centerY + deltaPixelY * v.scaleY,
    }));
  }, []);

  const zoom = useCallback((
    factor: number,
    anchorPixelX: number,
    anchorPixelY: number,
  ) => {
    setViewport(v => {
      const anchorMathX = (anchorPixelX - CANVAS_WIDTH / 2) * v.scaleX + v.centerX;
      const anchorMathY = (CANVAS_HEIGHT / 2 - anchorPixelY) * v.scaleY + v.centerY;

      const MIN_SCALE = 1e-6;
      const MAX_SCALE = 1000;
      const newScaleX = Math.max(MIN_SCALE, Math.min(MAX_SCALE, v.scaleX / factor));
      const newScaleY = Math.max(MIN_SCALE, Math.min(MAX_SCALE, v.scaleY / factor));

      const newCenterX = anchorMathX - (anchorPixelX - CANVAS_WIDTH / 2) * newScaleX;
      const newCenterY = anchorMathY + (anchorPixelY - CANVAS_HEIGHT / 2) * newScaleY;

      return {
        centerX: newCenterX,
        centerY: newCenterY,
        scaleX: newScaleX,
        scaleY: newScaleY,
      };
    });
  }, []);

  const reset = useCallback(() => {
    setViewport(DEFAULT_VIEWPORT);
  }, []);

  return { viewport, viewportRef, pan, zoom, reset, setViewport };
}
