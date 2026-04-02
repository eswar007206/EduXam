import { memo } from 'react';
import { Plus } from 'lucide-react';
import type { GraphFunction } from '../types';
import { GraphCalcEquationRow } from './GraphCalcEquationRow';

interface Props {
  functions: GraphFunction[];
  onAddFunction: () => void;
  onExpressionChange: (id: string, expr: string) => void;
  onToggleVisibility: (id: string) => void;
  onRemove: (id: string) => void;
  onSliderChange: (fnId: string, paramName: string, value: number) => void;
}

export const GraphCalcEquationPanel = memo(function GraphCalcEquationPanel({
  functions,
  onAddFunction,
  onExpressionChange,
  onToggleVisibility,
  onRemove,
  onSliderChange,
}: Props) {
  return (
    <div className="graph-calc-equation-panel">
      <div className="graph-calc-equation-list">
        {functions.map(fn => (
          <GraphCalcEquationRow
            key={fn.id}
            fn={fn}
            onExpressionChange={onExpressionChange}
            onToggleVisibility={onToggleVisibility}
            onRemove={onRemove}
            onSliderChange={onSliderChange}
          />
        ))}
      </div>
      {functions.length < 10 && (
        <button className="graph-calc-add-btn" onClick={onAddFunction} type="button">
          <Plus size={14} />
          <span>Add Equation</span>
        </button>
      )}
    </div>
  );
});
