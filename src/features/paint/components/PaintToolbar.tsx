import { memo } from 'react';
import {
  Pencil, Eraser, Minus, Square, RectangleHorizontal,
  Circle as CircleIcon, Triangle, Diamond, Pentagon, Hexagon,
  Star, MoveRight, Heart, Zap,
  Type, PaintBucket, Undo2, Redo2, Trash2,
} from 'lucide-react';
import type { PaintTool, ShapeMode } from '../types';
import { FILLABLE_SHAPES } from '../types';

// ── Basic drawing tools ──
const BASIC_TOOLS: { tool: PaintTool; icon: typeof Pencil; label: string }[] = [
  { tool: 'pencil',  icon: Pencil,      label: 'Pencil' },
  { tool: 'eraser',  icon: Eraser,      label: 'Eraser' },
  { tool: 'fill',    icon: PaintBucket, label: 'Fill' },
  { tool: 'text',    icon: Type,        label: 'Text' },
];

// ── Lines ──
const LINE_TOOLS: { tool: PaintTool; icon: typeof Pencil; label: string }[] = [
  { tool: 'line',   icon: Minus,     label: 'Line' },
  { tool: 'arrow',  icon: MoveRight, label: 'Arrow' },
];

// ── Shapes ──
const SHAPE_TOOL_LIST: { tool: PaintTool; icon: typeof Pencil; label: string }[] = [
  { tool: 'rectangle',     icon: Square,               label: 'Rectangle' },
  { tool: 'roundedRect',   icon: RectangleHorizontal,  label: 'Rounded Rect' },
  { tool: 'ellipse',       icon: CircleIcon,            label: 'Ellipse' },
  { tool: 'triangle',      icon: Triangle,              label: 'Triangle' },
  { tool: 'rightTriangle', icon: Triangle,              label: 'Right Triangle' },
  { tool: 'diamond',       icon: Diamond,               label: 'Diamond' },
  { tool: 'pentagon',      icon: Pentagon,               label: 'Pentagon' },
  { tool: 'hexagon',       icon: Hexagon,                label: 'Hexagon' },
  { tool: 'star5',         icon: Star,                   label: '5-Point Star' },
  { tool: 'star6',         icon: Star,                   label: '6-Point Star' },
  { tool: 'heart',         icon: Heart,                  label: 'Heart' },
  { tool: 'lightning',     icon: Zap,                    label: 'Lightning' },
];

interface PaintToolbarProps {
  activeTool: PaintTool;
  shapeMode: ShapeMode;
  onToolChange: (tool: PaintTool) => void;
  onShapeModeChange: (mode: ShapeMode) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

function ToolGrid({ tools, activeTool, onToolChange }: {
  tools: typeof BASIC_TOOLS;
  activeTool: PaintTool;
  onToolChange: (t: PaintTool) => void;
}) {
  return (
    <div className="paint-toolbar-grid">
      {tools.map(({ tool, icon: Icon, label }) => (
        <button
          key={tool}
          className={`paint-tool-btn ${activeTool === tool ? 'active' : ''}`}
          onClick={() => onToolChange(tool)}
          title={label}
          type="button"
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}

export const PaintToolbar = memo(function PaintToolbar({
  activeTool, shapeMode,
  onToolChange, onShapeModeChange,
  onUndo, onRedo, onClear,
  canUndo, canRedo,
}: PaintToolbarProps) {
  return (
    <div className="paint-toolbar">
      {/* Basic tools: pencil, eraser, fill, text */}
      <div className="paint-toolbar-section">
        <span className="paint-toolbar-label">Tools</span>
        <ToolGrid tools={BASIC_TOOLS} activeTool={activeTool} onToolChange={onToolChange} />
      </div>

      {/* Lines: line, curve, arrow */}
      <div className="paint-toolbar-section">
        <span className="paint-toolbar-label">Lines</span>
        <ToolGrid tools={LINE_TOOLS} activeTool={activeTool} onToolChange={onToolChange} />
      </div>

      {/* All shapes */}
      <div className="paint-toolbar-section">
        <span className="paint-toolbar-label">Shapes</span>
        <ToolGrid tools={SHAPE_TOOL_LIST} activeTool={activeTool} onToolChange={onToolChange} />
      </div>

      {/* Outline / Filled toggle — visible for fillable shapes */}
      {FILLABLE_SHAPES.includes(activeTool) && (
        <div className="paint-toolbar-section">
          <span className="paint-toolbar-label">Fill Mode</span>
          <div className="paint-shape-toggle">
            <button
              className={`paint-tool-btn small ${shapeMode === 'outline' ? 'active' : ''}`}
              onClick={() => onShapeModeChange('outline')}
              title="Outline only"
              type="button"
            >
              Outline
            </button>
            <button
              className={`paint-tool-btn small ${shapeMode === 'filled' ? 'active' : ''}`}
              onClick={() => onShapeModeChange('filled')}
              title="Filled shape"
              type="button"
            >
              Filled
            </button>
          </div>
        </div>
      )}

      {/* Actions: undo, redo, clear */}
      <div className="paint-toolbar-section">
        <span className="paint-toolbar-label">Actions</span>
        <div className="paint-toolbar-grid">
          <button
            className="paint-tool-btn"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            type="button"
          >
            <Undo2 size={16} />
          </button>
          <button
            className="paint-tool-btn"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            type="button"
          >
            <Redo2 size={16} />
          </button>
          <button
            className="paint-tool-btn destructive"
            onClick={onClear}
            title="Clear Canvas"
            type="button"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
});
