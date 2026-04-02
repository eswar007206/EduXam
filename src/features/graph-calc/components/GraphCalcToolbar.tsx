import { memo } from 'react';
import {
  Minus,
  TrendingUp,
  Circle,
  Spline,
  Triangle,
  Waves,
  BarChart3,
  Superscript,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  MousePointer,
  GitBranchPlus,
  AreaChart,
  Table2,
  Undo2,
  Redo2,
} from 'lucide-react';
import type { GraphTool, GraphTypeTemplate } from '../types';
import { GRAPH_TYPE_TEMPLATES } from '../types';

interface Props {
  activeTool: GraphTool;
  onToolChange: (tool: GraphTool) => void;
  onAddTemplate: (template: GraphTypeTemplate) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const GRAPH_TYPE_ICONS: Record<string, typeof Minus> = {
  line: Minus,
  parabola: TrendingUp,
  circle: Circle,
  ellipse: Spline,
  absolute: Triangle,
  sin: Waves,
  cos: Waves,
  tan: Waves,
  log: BarChart3,
  exponential: Superscript,
  polynomial: TrendingUp,
  inequality: AreaChart,
};

const TOOLS: { tool: GraphTool; icon: typeof MousePointer; label: string }[] = [
  { tool: 'pointer', icon: MousePointer, label: 'Point Inspector' },
  { tool: 'tangent', icon: GitBranchPlus, label: 'Tangent Line' },
  { tool: 'area', icon: AreaChart, label: 'Area Under Curve' },
  { tool: 'table', icon: Table2, label: 'Value Table' },
];

export const GraphCalcToolbar = memo(function GraphCalcToolbar({
  activeTool,
  onToolChange,
  onAddTemplate,
  onZoomIn,
  onZoomOut,
  onResetView,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: Props) {
  return (
    <div className="graph-calc-toolbar">
      {/* Graph Types */}
      <div className="graph-calc-toolbar-section">
        <span className="graph-calc-toolbar-label">Graph Types</span>
        <div className="graph-calc-toolbar-grid">
          {GRAPH_TYPE_TEMPLATES.map(template => {
            const Icon = GRAPH_TYPE_ICONS[template.type] || Minus;
            return (
              <button
                key={template.type}
                className="graph-calc-type-btn"
                onClick={() => onAddTemplate(template)}
                title={`${template.label}: ${template.description}`}
                type="button"
              >
                <Icon size={13} />
                <span>{template.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tools */}
      <div className="graph-calc-toolbar-section">
        <span className="graph-calc-toolbar-label">Tools</span>
        <div className="graph-calc-tools-list">
          {TOOLS.map(({ tool, icon: Icon, label }) => (
            <button
              key={tool}
              className={`graph-calc-tool-btn ${activeTool === tool ? 'active' : ''}`}
              onClick={() => onToolChange(tool)}
              title={label}
              type="button"
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Undo / Redo */}
      <div className="graph-calc-toolbar-section">
        <span className="graph-calc-toolbar-label">History</span>
        <div className="graph-calc-zoom-controls">
          <button
            className="graph-calc-zoom-btn"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            type="button"
          >
            <Undo2 size={16} />
          </button>
          <button
            className="graph-calc-zoom-btn"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            type="button"
          >
            <Redo2 size={16} />
          </button>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="graph-calc-toolbar-section">
        <span className="graph-calc-toolbar-label">View</span>
        <div className="graph-calc-zoom-controls">
          <button className="graph-calc-zoom-btn" onClick={onZoomIn} title="Zoom In" type="button">
            <ZoomIn size={16} />
          </button>
          <button className="graph-calc-zoom-btn" onClick={onZoomOut} title="Zoom Out" type="button">
            <ZoomOut size={16} />
          </button>
          <button className="graph-calc-zoom-btn" onClick={onResetView} title="Reset View" type="button">
            <RotateCcw size={16} />
          </button>
        </div>
      </div>
    </div>
  );
});
