import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { X, LineChart, Download } from 'lucide-react';
import { GraphCalcCanvas } from './GraphCalcCanvas';
import { GraphCalcToolbar } from './GraphCalcToolbar';
import { GraphCalcEquationPanel } from './GraphCalcEquationPanel';
import { GraphCalcInfoPanel } from './GraphCalcInfoPanel';
import { useGraphViewport } from '../hooks/useGraphViewport';
import { useGraphFunctions } from '../hooks/useGraphFunctions';
import type { GraphCalcDialogProps, GraphCalcCanvasHandle, GraphTool, GraphTypeTemplate } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../types';
import { parseExpression } from '../utils/mathParser';
import { getVisibleRange } from '../utils/graphHelpers';

export const GraphCalcDialog = memo(function GraphCalcDialog({
  isOpen,
  onInsert,
  onClose,
}: GraphCalcDialogProps) {
  const canvasHandleRef = useRef<GraphCalcCanvasHandle>(null);
  const [activeTool, setActiveTool] = useState<GraphTool>('pointer');
  const [inserted, setInserted] = useState(false);
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    fnId: string;
    pixelX: number;
    pixelY: number;
  } | null>(null);
  const [tangentInfo, setTangentInfo] = useState<{
    fnId: string;
    x: number;
    y: number;
    slope: number;
  } | null>(null);
  const [areaInfo, setAreaInfo] = useState<{
    fnId: string;
    xStart: number;
    xEnd: number;
    area: number;
  } | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [tableData, setTableData] = useState<Array<{ x: number; y: number }>>([]);
  const [selectedFnForTable, setSelectedFnForTable] = useState<string | null>(null);

  const { viewport, viewportRef, pan, zoom, reset: resetView } = useGraphViewport();
  const {
    functions,
    functionsRef,
    addFunction,
    addFromTemplate,
    removeFunction,
    updateExpression,
    toggleVisibility,
    updateSliderParam,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useGraphFunctions();

  // Start with one empty equation row
  const initializedRef = useRef(false);
  useEffect(() => {
    if (isOpen && !initializedRef.current) {
      initializedRef.current = true;
      addFunction('');
    }
  }, [isOpen, addFunction]);

  // Generate table data when table tool is active
  useEffect(() => {
    if (activeTool !== 'table' || !showTable || !selectedFnForTable) return;
    const fn = functions.find(f => f.id === selectedFnForTable);
    if (!fn || !fn.expression.trim()) return;

    const parsed = parseExpression(fn.expression);
    if (!parsed.success || !parsed.evaluate) return;

    const scope: Record<string, number> = {};
    if (fn.sliderParams) {
      for (const p of fn.sliderParams) scope[p.name] = p.value;
    }

    const range = getVisibleRange(viewport, CANVAS_WIDTH, CANVAS_HEIGHT);
    const step = (range.xMax - range.xMin) / 20;
    const data: Array<{ x: number; y: number }> = [];
    for (let x = range.xMin; x <= range.xMax; x += step) {
      const y = parsed.evaluate({ ...scope, x });
      if (isFinite(y)) {
        data.push({ x: parseFloat(x.toFixed(4)), y: parseFloat(y.toFixed(4)) });
      }
    }
    setTableData(data);
  }, [activeTool, showTable, selectedFnForTable, functions, viewport]);

  // Handle tool change
  const handleToolChange = useCallback((tool: GraphTool) => {
    setActiveTool(tool);
    setTangentInfo(null);
    setAreaInfo(null);
    if (tool === 'table') {
      const firstVisible = functionsRef.current.find(f => f.visible && f.expression.trim());
      if (firstVisible) {
        setSelectedFnForTable(firstVisible.id);
        setShowTable(true);
      }
    } else {
      setShowTable(false);
    }
  }, [functionsRef]);

  // Save & Insert
  const handleSaveAndInsert = useCallback(() => {
    const dataUrl = canvasHandleRef.current?.toDataURL();
    if (dataUrl) onInsert(dataUrl);
    setInserted(true);
    setTimeout(() => setInserted(false), 2000);
  }, [onInsert]);

  // Save, Insert & Close
  const handleSaveInsertAndClose = useCallback(() => {
    const dataUrl = canvasHandleRef.current?.toDataURL();
    if (dataUrl) onInsert(dataUrl);
    onClose();
  }, [onInsert, onClose]);

  // Zoom buttons
  const handleZoomIn = useCallback(() => {
    zoom(1.5, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  }, [zoom]);

  const handleZoomOut = useCallback(() => {
    zoom(1 / 1.5, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  }, [zoom]);

  const handleAddFunction = useCallback(() => {
    addFunction('');
  }, [addFunction]);

  const handleAddTemplate = useCallback(
    (template: GraphTypeTemplate) => {
      addFromTemplate(template);
    },
    [addFromTemplate],
  );

  // Handle tangent click
  const handleTangentClick = useCallback(
    (info: { fnId: string; x: number; y: number; slope: number } | null) => {
      setTangentInfo(info);
    },
    [],
  );

  // Handle area select
  const handleAreaSelect = useCallback(
    (info: { fnId: string; xStart: number; xEnd: number; area: number } | null) => {
      setAreaInfo(info);
    },
    [],
  );

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSaveAndInsert();
      } else if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
      } else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === '+' || e.key === '=') {
        if (!e.ctrlKey && !(e.target instanceof HTMLInputElement)) {
          e.preventDefault();
          handleZoomIn();
        }
      } else if (e.key === '-') {
        if (!e.ctrlKey && !(e.target instanceof HTMLInputElement)) {
          e.preventDefault();
          handleZoomOut();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose, handleSaveAndInsert, handleZoomIn, handleZoomOut, undo, redo]);

  // Backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  if (!isOpen) return null;

  return (
    <div
      className="graph-calc-dialog-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="graph-calc-dialog-title"
    >
      <div className="graph-calc-dialog">
        {/* Header */}
        <div className="graph-calc-dialog-header">
          <div className="graph-calc-dialog-header-left">
            <LineChart size={18} className="graph-calc-header-icon" />
            <h2 id="graph-calc-dialog-title" className="graph-calc-dialog-title">
              Graphing Calculator
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="graph-calc-dialog-close"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Equation Panel */}
        <div className="graph-calc-equation-area">
          <GraphCalcEquationPanel
            functions={functions}
            onAddFunction={handleAddFunction}
            onExpressionChange={updateExpression}
            onToggleVisibility={toggleVisibility}
            onRemove={removeFunction}
            onSliderChange={updateSliderParam}
          />
        </div>

        {/* Content: sidebar + canvas */}
        <div className="graph-calc-dialog-content">
          <div className="graph-calc-dialog-sidebar">
            <GraphCalcToolbar
              activeTool={activeTool}
              onToolChange={handleToolChange}
              onAddTemplate={handleAddTemplate}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onResetView={resetView}
              onUndo={undo}
              onRedo={redo}
              canUndo={canUndo}
              canRedo={canRedo}
            />
          </div>

          <div className="graph-calc-canvas-wrapper">
            <GraphCalcCanvas
              ref={canvasHandleRef}
              viewport={viewport}
              viewportRef={viewportRef}
              functions={functions}
              functionsRef={functionsRef}
              activeTool={activeTool}
              onPan={pan}
              onZoom={zoom}
              onHoverPoint={setHoverInfo}
              onTangentClick={handleTangentClick}
              onAreaSelect={handleAreaSelect}
            />
            <GraphCalcInfoPanel
              hoverInfo={hoverInfo}
              tangentInfo={tangentInfo}
              areaInfo={areaInfo}
            />
          </div>

          {/* Table view */}
          {showTable && tableData.length > 0 && (
            <div className="graph-calc-table-panel">
              <div className="graph-calc-table-header">
                <strong>Value Table</strong>
                <button
                  type="button"
                  className="graph-calc-eq-btn"
                  onClick={() => setShowTable(false)}
                >
                  <X size={14} />
                </button>
              </div>
              <div className="graph-calc-table-scroll">
                <table className="graph-calc-table">
                  <thead>
                    <tr>
                      <th>x</th>
                      <th>y</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((row, i) => (
                      <tr key={i}>
                        <td>{row.x}</td>
                        <td>{row.y}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="graph-calc-dialog-footer">
          <span className="graph-calc-shortcuts-hint">
            <kbd className="graph-calc-kbd">Ctrl+S</kbd> Save & Insert
            {' / '}
            <kbd className="graph-calc-kbd">+/-</kbd> Zoom
            {' / '}
            <kbd className="graph-calc-kbd">Esc</kbd> Close
            {inserted && (
              <span className="graph-calc-inserted-msg">Inserted!</span>
            )}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="graph-calc-dialog-btn graph-calc-dialog-btn-secondary"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSaveAndInsert}
            className="graph-calc-dialog-btn graph-calc-dialog-btn-secondary"
          >
            <Download size={14} />
            Save & Insert
          </button>
          <button
            type="button"
            onClick={handleSaveInsertAndClose}
            className="graph-calc-dialog-btn graph-calc-dialog-btn-primary"
          >
            Save, Insert & Close
          </button>
        </div>
      </div>
    </div>
  );
});

export default GraphCalcDialog;
