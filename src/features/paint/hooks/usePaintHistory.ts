import { useRef, useCallback, useState } from 'react';

const MAX_HISTORY = 30;

export function usePaintHistory() {
  const historyRef = useRef<ImageData[]>([]);
  const indexRef = useRef<number>(-1);
  const [, setTick] = useState(0);
  const rerender = () => setTick((t) => t + 1);

  const pushState = useCallback((imageData: ImageData) => {
    historyRef.current = historyRef.current.slice(0, indexRef.current + 1);
    historyRef.current.push(imageData);

    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    } else {
      indexRef.current += 1;
    }
    rerender();
  }, []);

  const undo = useCallback((): ImageData | null => {
    if (indexRef.current > 0) {
      indexRef.current -= 1;
      rerender();
      return historyRef.current[indexRef.current];
    }
    return null;
  }, []);

  const redo = useCallback((): ImageData | null => {
    if (indexRef.current < historyRef.current.length - 1) {
      indexRef.current += 1;
      rerender();
      return historyRef.current[indexRef.current];
    }
    return null;
  }, []);

  const clear = useCallback(() => {
    historyRef.current = [];
    indexRef.current = -1;
    rerender();
  }, []);

  return {
    pushState,
    undo,
    redo,
    clear,
    get canUndo() { return indexRef.current > 0; },
    get canRedo() { return indexRef.current < historyRef.current.length - 1; },
  };
}
