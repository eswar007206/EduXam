export type PaintTool =
  | 'pencil'
  | 'eraser'
  | 'line'
  | 'rectangle'
  | 'roundedRect'
  | 'ellipse'
  | 'triangle'
  | 'rightTriangle'
  | 'diamond'
  | 'pentagon'
  | 'hexagon'
  | 'star5'
  | 'star6'
  | 'arrow'
  | 'heart'
  | 'lightning'
  | 'text'
  | 'fill';

export type ShapeMode = 'outline' | 'filled';

export interface Point {
  x: number;
  y: number;
}

export interface PaintState {
  activeTool: PaintTool;
  strokeColor: string;
  fillColor: string;
  brushSize: number;
  shapeMode: ShapeMode;
  fontSize: number;
}

export interface PaintDialogProps {
  isOpen: boolean;
  onInsert: (dataUrl: string) => void;
  onClose: () => void;
}

// Tools that use the shape-preview (snapshot-restore) technique
export const SHAPE_TOOLS: PaintTool[] = [
  'line', 'rectangle', 'roundedRect', 'ellipse',
  'triangle', 'rightTriangle', 'diamond', 'pentagon', 'hexagon',
  'star5', 'star6', 'arrow', 'heart', 'lightning',
];

// Tools that show the outline/filled toggle
export const FILLABLE_SHAPES: PaintTool[] = [
  'rectangle', 'roundedRect', 'ellipse',
  'triangle', 'rightTriangle', 'diamond', 'pentagon', 'hexagon',
  'star5', 'star6', 'heart', 'lightning',
];
