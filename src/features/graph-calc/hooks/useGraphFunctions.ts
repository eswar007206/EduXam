import { useState, useCallback, useRef } from 'react';
import type { GraphFunction, SliderParam, GraphTypeTemplate } from '../types';
import { parseExpression } from '../utils/mathParser';
import { getNextColor } from '../utils/graphColors';

let nextId = 1;

const MAX_HISTORY = 30;

export function useGraphFunctions() {
  const [functions, setFunctions] = useState<GraphFunction[]>([]);
  const functionsRef = useRef(functions);
  functionsRef.current = functions;

  // Undo/redo history
  const historyRef = useRef<GraphFunction[][]>([]);
  const historyIndexRef = useRef(-1);
  const [, setTick] = useState(0);
  const skipHistoryRef = useRef(false);

  const pushHistory = useCallback((snapshot: GraphFunction[]) => {
    if (skipHistoryRef.current) return;
    const h = historyRef.current;
    const idx = historyIndexRef.current;
    // Truncate any redo-forward states
    historyRef.current = h.slice(0, idx + 1);
    historyRef.current.push(snapshot.map(f => ({ ...f, sliderParams: f.sliderParams?.map(p => ({ ...p })) })));
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    }
    historyIndexRef.current = historyRef.current.length - 1;
    setTick(t => t + 1);
  }, []);

  // Wrap setFunctions to auto-push history on every state change
  const setFunctionsWithHistory = useCallback((updater: (prev: GraphFunction[]) => GraphFunction[]) => {
    setFunctions(prev => {
      const next = updater(prev);
      // Push history after the update (use setTimeout to capture the new state)
      if (!skipHistoryRef.current) {
        // We push the previous state before this change
        // On first call, push prev as baseline if history is empty
        if (historyRef.current.length === 0) {
          historyRef.current.push(prev.map(f => ({ ...f, sliderParams: f.sliderParams?.map(p => ({ ...p })) })));
          historyIndexRef.current = 0;
        }
        pushHistory(next);
      }
      return next;
    });
  }, [pushHistory]);

  const undo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx <= 0) return;
    historyIndexRef.current = idx - 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    skipHistoryRef.current = true;
    setFunctions(snapshot.map(f => ({ ...f, sliderParams: f.sliderParams?.map(p => ({ ...p })) })));
    skipHistoryRef.current = false;
    setTick(t => t + 1);
  }, []);

  const redo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx >= historyRef.current.length - 1) return;
    historyIndexRef.current = idx + 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    skipHistoryRef.current = true;
    setFunctions(snapshot.map(f => ({ ...f, sliderParams: f.sliderParams?.map(p => ({ ...p })) })));
    skipHistoryRef.current = false;
    setTick(t => t + 1);
  }, []);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  const addFunction = useCallback((expression: string = '', sliderParams?: SliderParam[]) => {
    const usedColors = functionsRef.current.map(f => f.color);
    const color = getNextColor(usedColors);
    const parseResult = expression ? parseExpression(expression) : null;

    const newFn: GraphFunction = {
      id: `fn-${nextId++}`,
      expression,
      color,
      visible: true,
      error: parseResult?.success === false ? (parseResult.error ?? 'Invalid expression') : null,
      type: 'explicit',
      sliderParams: sliderParams ? sliderParams.map(p => ({ ...p })) : undefined,
    };

    setFunctionsWithHistory(prev => [...prev, newFn]);
    return newFn.id;
  }, []);

  const addFromTemplate = useCallback((template: GraphTypeTemplate) => {
    // For circle/ellipse, add both upper and lower halves
    if (template.type === 'circle') {
      const usedColors = functionsRef.current.map(f => f.color);
      const color = getNextColor(usedColors);
      const upperExpr = template.expression;
      const lowerExpr = template.expression.replace('sqrt(', '-sqrt(');

      const upperFn: GraphFunction = {
        id: `fn-${nextId++}`,
        expression: upperExpr,
        color,
        visible: true,
        error: null,
        type: 'explicit',
        sliderParams: template.sliderParams.map(p => ({ ...p })),
      };
      const lowerFn: GraphFunction = {
        id: `fn-${nextId++}`,
        expression: lowerExpr,
        color,
        visible: true,
        error: null,
        type: 'explicit',
        sliderParams: template.sliderParams.map(p => ({ ...p })),
      };
      setFunctionsWithHistory(prev => [...prev, upperFn, lowerFn]);
      return upperFn.id;
    }

    if (template.type === 'ellipse') {
      const usedColors = functionsRef.current.map(f => f.color);
      const color = getNextColor(usedColors);
      const upperExpr = template.expression;
      const lowerExpr = '-(' + template.expression + ')';

      const upperFn: GraphFunction = {
        id: `fn-${nextId++}`,
        expression: upperExpr,
        color,
        visible: true,
        error: null,
        type: 'explicit',
        sliderParams: template.sliderParams.map(p => ({ ...p })),
      };
      const lowerFn: GraphFunction = {
        id: `fn-${nextId++}`,
        expression: lowerExpr,
        color,
        visible: true,
        error: null,
        type: 'explicit',
        sliderParams: template.sliderParams.map(p => ({ ...p })),
      };
      setFunctionsWithHistory(prev => [...prev, upperFn, lowerFn]);
      return upperFn.id;
    }

    return addFunction(template.expression, template.sliderParams);
  }, [addFunction]);

  const removeFunction = useCallback((id: string) => {
    setFunctionsWithHistory(prev => prev.filter(f => f.id !== id));
  }, [setFunctionsWithHistory]);

  const updateExpression = useCallback((id: string, expression: string) => {
    const parseResult = expression.trim()
      ? parseExpression(expression)
      : { success: true, error: null };
    setFunctionsWithHistory(prev =>
      prev.map(f =>
        f.id === id
          ? { ...f, expression, error: parseResult.success ? null : (parseResult.error ?? 'Invalid expression') }
          : f,
      ),
    );
  }, [setFunctionsWithHistory]);

  const toggleVisibility = useCallback((id: string) => {
    setFunctionsWithHistory(prev =>
      prev.map(f => (f.id === id ? { ...f, visible: !f.visible } : f)),
    );
  }, [setFunctionsWithHistory]);

  const updateSliderParam = useCallback((fnId: string, paramName: string, value: number) => {
    setFunctionsWithHistory(prev =>
      prev.map(f => {
        if (f.id !== fnId || !f.sliderParams) return f;
        return {
          ...f,
          sliderParams: f.sliderParams.map(p =>
            p.name === paramName ? { ...p, value } : p,
          ),
        };
      }),
    );
  }, [setFunctionsWithHistory]);

  const updateColor = useCallback((id: string, color: string) => {
    setFunctionsWithHistory(prev =>
      prev.map(f => (f.id === id ? { ...f, color } : f)),
    );
  }, [setFunctionsWithHistory]);

  const clearAll = useCallback(() => {
    setFunctionsWithHistory(() => []);
  }, [setFunctionsWithHistory]);

  return {
    functions,
    functionsRef,
    addFunction,
    addFromTemplate,
    removeFunction,
    updateExpression,
    toggleVisibility,
    updateSliderParam,
    updateColor,
    clearAll,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
