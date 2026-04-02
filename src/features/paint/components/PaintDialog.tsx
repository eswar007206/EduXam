import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { X, Paintbrush, Download } from 'lucide-react';
import { PaintCanvas } from './PaintCanvas';
import type { PaintCanvasHandle } from './PaintCanvas';
import { PaintToolbar } from './PaintToolbar';
import { PaintColorPicker } from './PaintColorPicker';
import { PaintBrushSizeSelector } from './PaintBrushSizeSelector';
import { usePaintHistory } from '../hooks/usePaintHistory';
import type { PaintDialogProps, PaintTool, PaintState, ShapeMode, Point } from '../types';

const CANVAS_WIDTH = 680;
const CANVAS_HEIGHT = 400;

export const PaintDialog = memo(function PaintDialog({
  isOpen,
  onInsert,
  onClose,
}: PaintDialogProps) {
  const canvasHandleRef = useRef<PaintCanvasHandle>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const textOpenedAtRef = useRef<number>(0);
  const history = usePaintHistory();
  const initializedRef = useRef(false);
  const [inserted, setInserted] = useState(false);

  const [textInput, setTextInput] = useState<{
    visible: boolean;
    x: number;
    y: number;
    value: string;
  }>({ visible: false, x: 0, y: 0, value: '' });

  const [paintState, setPaintState] = useState<PaintState>({
    activeTool: 'pencil',
    strokeColor: '#000000',
    fillColor: '#000000',
    brushSize: 2,
    shapeMode: 'outline',
    fontSize: 16,
  });

  // Push canvas to history after each draw action (NO auto-insert)
  const handleDrawComplete = useCallback(() => {
    const snapshot = canvasHandleRef.current?.getSnapshot();
    if (snapshot) history.pushState(snapshot);
    setInserted(false);
  }, [history]);

  // Undo / Redo
  const handleUndo = useCallback(() => {
    const prev = history.undo();
    if (prev) {
      canvasHandleRef.current?.restoreSnapshot(prev);
      setInserted(false);
    }
  }, [history]);

  const handleRedo = useCallback(() => {
    const next = history.redo();
    if (next) {
      canvasHandleRef.current?.restoreSnapshot(next);
      setInserted(false);
    }
  }, [history]);

  // Clear
  const handleClear = useCallback(() => {
    canvasHandleRef.current?.clearCanvas();
    history.clear();
    const snapshot = canvasHandleRef.current?.getSnapshot();
    if (snapshot) history.pushState(snapshot);
    setInserted(false);
  }, [history]);

  // Save & Insert — only way to get drawing into the answer box
  const handleSaveAndInsert = useCallback(() => {
    const dataUrl = canvasHandleRef.current?.toDataURL();
    if (dataUrl) onInsert(dataUrl);
    setInserted(true);
  }, [onInsert]);

  // Save & Insert then close
  const handleSaveInsertAndClose = useCallback(() => {
    const dataUrl = canvasHandleRef.current?.toDataURL();
    if (dataUrl) onInsert(dataUrl);
    onClose();
  }, [onInsert, onClose]);

  // Text tool click on canvas
  const handleTextToolClick = useCallback((position: Point) => {
    textOpenedAtRef.current = Date.now();
    setTextInput({ visible: true, x: position.x, y: position.y, value: '' });
  }, []);

  // Focus text input after it appears (useEffect is more reliable than autoFocus)
  useEffect(() => {
    if (textInput.visible && textInputRef.current) {
      requestAnimationFrame(() => {
        textInputRef.current?.focus();
      });
    }
  }, [textInput.visible]);

  // Commit text to canvas
  const commitText = useCallback(() => {
    if (textInput.value.trim()) {
      canvasHandleRef.current?.drawText(
        textInput.value,
        { x: textInput.x, y: textInput.y },
        paintState.fontSize
      );
    }
    setTextInput({ visible: false, x: 0, y: 0, value: '' });
  }, [textInput, paintState.fontSize]);

  // Guard: ignore blur if the input was just opened (prevents immediate close)
  const handleTextBlur = useCallback(() => {
    if (Date.now() - textOpenedAtRef.current < 200) return;
    commitText();
  }, [commitText]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (textInput.visible) {
          setTextInput({ visible: false, x: 0, y: 0, value: '' });
        } else {
          onClose();
        }
        e.preventDefault();
      } else if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSaveAndInsert();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose, handleUndo, handleRedo, handleSaveAndInsert, textInput.visible]);

  // Push initial blank canvas state
  useEffect(() => {
    if (isOpen && !initializedRef.current) {
      initializedRef.current = true;
      requestAnimationFrame(() => {
        const snapshot = canvasHandleRef.current?.getSnapshot();
        if (snapshot) history.pushState(snapshot);
      });
    }
    if (!isOpen) {
      initializedRef.current = false;
    }
  }, [isOpen, history]);

  // State updaters
  const setTool = useCallback((tool: PaintTool) => {
    setPaintState((s) => ({ ...s, activeTool: tool }));
    // Dismiss text input when switching tools
    setTextInput({ visible: false, x: 0, y: 0, value: '' });
  }, []);

  const setShapeMode = useCallback((mode: ShapeMode) => {
    setPaintState((s) => ({ ...s, shapeMode: mode }));
  }, []);

  const setStrokeColor = useCallback((color: string) => {
    setPaintState((s) => ({ ...s, strokeColor: color, fillColor: color }));
  }, []);

  const setBrushSize = useCallback((size: number) => {
    setPaintState((s) => ({ ...s, brushSize: size }));
  }, []);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      className="paint-dialog-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="paint-dialog-title"
    >
      <div className="paint-dialog">
        {/* Header */}
        <div className="paint-dialog-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Paintbrush size={18} style={{ color: 'hsl(var(--primary))' }} />
            <h2 id="paint-dialog-title" className="paint-dialog-title">
              Drawing Canvas
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="paint-dialog-close"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content: sidebar + canvas */}
        <div className="paint-dialog-content">
          <div className="paint-dialog-sidebar">
            <PaintToolbar
              activeTool={paintState.activeTool}
              shapeMode={paintState.shapeMode}
              onToolChange={setTool}
              onShapeModeChange={setShapeMode}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onClear={handleClear}
              canUndo={history.canUndo}
              canRedo={history.canRedo}
            />
            <PaintColorPicker
              strokeColor={paintState.strokeColor}
              onStrokeColorChange={setStrokeColor}
            />
            <PaintBrushSizeSelector
              size={paintState.brushSize}
              onChange={setBrushSize}
            />
          </div>

          <div className="paint-canvas-wrapper">
            <div ref={canvasContainerRef} style={{ position: 'relative', display: 'inline-block' }}>
              <PaintCanvas
                ref={canvasHandleRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                paintState={paintState}
                onDrawComplete={handleDrawComplete}
                onTextToolClick={handleTextToolClick}
              />
              {/* Text input overlay — positioned relative to canvas display size */}
              {textInput.visible && (() => {
                const displayW = canvasContainerRef.current?.clientWidth ?? CANVAS_WIDTH;
                const scale = displayW / CANVAS_WIDTH;
                return (
                  <input
                    ref={textInputRef}
                    className="paint-text-overlay"
                    style={{
                      left: textInput.x * scale,
                      top: textInput.y * scale,
                      fontSize: paintState.fontSize * scale,
                      color: paintState.strokeColor,
                    }}
                    value={textInput.value}
                    onChange={(e) =>
                      setTextInput((s) => ({ ...s, value: e.target.value }))
                    }
                    onMouseDown={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitText();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        setTextInput({ visible: false, x: 0, y: 0, value: '' });
                      }
                    }}
                    onBlur={handleTextBlur}
                  />
                );
              })()}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="paint-dialog-footer">
          <span style={{ flex: 1, fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
            <kbd style={{ padding: '0 4px', border: '1px solid hsl(var(--border))', borderRadius: '3px', fontSize: '0.6875rem' }}>Ctrl+S</kbd> Save & Insert
            {' / '}
            <kbd style={{ padding: '0 4px', border: '1px solid hsl(var(--border))', borderRadius: '3px', fontSize: '0.6875rem' }}>Ctrl+Z</kbd> Undo
            {' / '}
            <kbd style={{ padding: '0 4px', border: '1px solid hsl(var(--border))', borderRadius: '3px', fontSize: '0.6875rem' }}>Ctrl+Y</kbd> Redo
            {inserted && (
              <span style={{ marginLeft: '0.5rem', color: 'hsl(var(--primary))', fontWeight: 600 }}>Inserted!</span>
            )}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="paint-dialog-btn paint-dialog-btn-secondary"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSaveAndInsert}
            className="paint-dialog-btn paint-dialog-btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <Download size={14} />
            Save & Insert
          </button>
          <button
            type="button"
            onClick={handleSaveInsertAndClose}
            className="paint-dialog-btn paint-dialog-btn-primary"
          >
            Save, Insert & Close
          </button>
        </div>
      </div>
    </div>
  );
});

export default PaintDialog;
