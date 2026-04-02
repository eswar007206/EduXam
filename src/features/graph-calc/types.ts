export interface GraphPoint {
  x: number;
  y: number;
}

export interface GraphViewport {
  centerX: number;
  centerY: number;
  scaleX: number; // math units per pixel
  scaleY: number;
}

export interface GraphFunction {
  id: string;
  expression: string;
  color: string;
  visible: boolean;
  error: string | null;
  type: GraphFunctionType;
  sliderParams?: SliderParam[];
}

export type GraphFunctionType = 'explicit' | 'implicit' | 'parametric';

export interface SliderParam {
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
}

export type GraphTool =
  | 'pointer'
  | 'tangent'
  | 'area'
  | 'table';

export type BuiltInGraphType =
  | 'line'
  | 'parabola'
  | 'circle'
  | 'ellipse'
  | 'absolute'
  | 'sin'
  | 'cos'
  | 'tan'
  | 'log'
  | 'exponential'
  | 'polynomial'
  | 'inequality';

export interface GraphCalcDialogProps {
  isOpen: boolean;
  onInsert: (dataUrl: string) => void;
  onClose: () => void;
}

export interface GraphCalcCanvasHandle {
  toDataURL: () => string;
  resetView: () => void;
  getViewport: () => GraphViewport;
}

export const DEFAULT_VIEWPORT: GraphViewport = {
  centerX: 0,
  centerY: 0,
  scaleX: 0.025,
  scaleY: 0.025,
};

export const CANVAS_WIDTH = 560;
export const CANVAS_HEIGHT = 330;

export interface GraphTypeTemplate {
  type: BuiltInGraphType;
  label: string;
  expression: string;
  sliderParams: SliderParam[];
  description: string;
}

export const GRAPH_TYPE_TEMPLATES: GraphTypeTemplate[] = [
  {
    type: 'line',
    label: 'Line',
    expression: 'm*x + b',
    sliderParams: [
      { name: 'm', value: 1, min: -10, max: 10, step: 0.1 },
      { name: 'b', value: 0, min: -10, max: 10, step: 0.1 },
    ],
    description: 'y = mx + b',
  },
  {
    type: 'parabola',
    label: 'Parabola',
    expression: 'a*x^2 + b*x + c',
    sliderParams: [
      { name: 'a', value: 1, min: -5, max: 5, step: 0.1 },
      { name: 'b', value: 0, min: -10, max: 10, step: 0.1 },
      { name: 'c', value: 0, min: -10, max: 10, step: 0.1 },
    ],
    description: 'y = ax² + bx + c',
  },
  {
    type: 'circle',
    label: 'Circle',
    expression: 'sqrt(r^2 - (x - h)^2) + k',
    sliderParams: [
      { name: 'r', value: 3, min: 0.5, max: 10, step: 0.1 },
      { name: 'h', value: 0, min: -10, max: 10, step: 0.1 },
      { name: 'k', value: 0, min: -10, max: 10, step: 0.1 },
    ],
    description: '(x-h)² + (y-k)² = r²',
  },
  {
    type: 'ellipse',
    label: 'Ellipse',
    expression: 'b * sqrt(1 - (x/a)^2)',
    sliderParams: [
      { name: 'a', value: 4, min: 0.5, max: 10, step: 0.1 },
      { name: 'b', value: 2, min: 0.5, max: 10, step: 0.1 },
    ],
    description: '(x/a)² + (y/b)² = 1',
  },
  {
    type: 'absolute',
    label: 'Absolute',
    expression: 'a * abs(x - h) + k',
    sliderParams: [
      { name: 'a', value: 1, min: -5, max: 5, step: 0.1 },
      { name: 'h', value: 0, min: -10, max: 10, step: 0.1 },
      { name: 'k', value: 0, min: -10, max: 10, step: 0.1 },
    ],
    description: 'y = a|x - h| + k',
  },
  {
    type: 'sin',
    label: 'Sine',
    expression: 'a * sin(b * x + c) + d',
    sliderParams: [
      { name: 'a', value: 1, min: -5, max: 5, step: 0.1 },
      { name: 'b', value: 1, min: -5, max: 5, step: 0.1 },
      { name: 'c', value: 0, min: -6.28, max: 6.28, step: 0.1 },
      { name: 'd', value: 0, min: -5, max: 5, step: 0.1 },
    ],
    description: 'y = a·sin(bx + c) + d',
  },
  {
    type: 'cos',
    label: 'Cosine',
    expression: 'a * cos(b * x + c) + d',
    sliderParams: [
      { name: 'a', value: 1, min: -5, max: 5, step: 0.1 },
      { name: 'b', value: 1, min: -5, max: 5, step: 0.1 },
      { name: 'c', value: 0, min: -6.28, max: 6.28, step: 0.1 },
      { name: 'd', value: 0, min: -5, max: 5, step: 0.1 },
    ],
    description: 'y = a·cos(bx + c) + d',
  },
  {
    type: 'tan',
    label: 'Tangent',
    expression: 'a * tan(b * x)',
    sliderParams: [
      { name: 'a', value: 1, min: -5, max: 5, step: 0.1 },
      { name: 'b', value: 1, min: -5, max: 5, step: 0.1 },
    ],
    description: 'y = a·tan(bx)',
  },
  {
    type: 'log',
    label: 'Logarithm',
    expression: 'a * log(b * x + c) + d',
    sliderParams: [
      { name: 'a', value: 1, min: -5, max: 5, step: 0.1 },
      { name: 'b', value: 1, min: 0.1, max: 5, step: 0.1 },
      { name: 'c', value: 0, min: -10, max: 10, step: 0.1 },
      { name: 'd', value: 0, min: -10, max: 10, step: 0.1 },
    ],
    description: 'y = a·ln(bx + c) + d',
  },
  {
    type: 'exponential',
    label: 'Exponential',
    expression: 'a * E^(b * x) + c',
    sliderParams: [
      { name: 'a', value: 1, min: -5, max: 5, step: 0.1 },
      { name: 'b', value: 1, min: -3, max: 3, step: 0.1 },
      { name: 'c', value: 0, min: -10, max: 10, step: 0.1 },
    ],
    description: 'y = a·eᵇˣ + c',
  },
  {
    type: 'polynomial',
    label: 'Cubic',
    expression: 'a*x^3 + b*x^2 + c*x + d',
    sliderParams: [
      { name: 'a', value: 1, min: -3, max: 3, step: 0.1 },
      { name: 'b', value: 0, min: -5, max: 5, step: 0.1 },
      { name: 'c', value: 0, min: -5, max: 5, step: 0.1 },
      { name: 'd', value: 0, min: -5, max: 5, step: 0.1 },
    ],
    description: 'y = ax³ + bx² + cx + d',
  },
  {
    type: 'inequality',
    label: 'Inequality',
    expression: 'a*x + b',
    sliderParams: [
      { name: 'a', value: 1, min: -5, max: 5, step: 0.1 },
      { name: 'b', value: 0, min: -10, max: 10, step: 0.1 },
    ],
    description: 'y > ax + b (shaded)',
  },
];
