import { memo, useCallback } from 'react';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import type { GraphFunction } from '../types';
import { GraphCalcSlider } from './GraphCalcSlider';

interface Props {
  fn: GraphFunction;
  onExpressionChange: (id: string, expr: string) => void;
  onToggleVisibility: (id: string) => void;
  onRemove: (id: string) => void;
  onSliderChange: (fnId: string, paramName: string, value: number) => void;
}

export const GraphCalcEquationRow = memo(function GraphCalcEquationRow({
  fn,
  onExpressionChange,
  onToggleVisibility,
  onRemove,
  onSliderChange,
}: Props) {
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onExpressionChange(fn.id, e.target.value);
    },
    [fn.id, onExpressionChange],
  );

  return (
    <div className="graph-calc-equation-row">
      <div className="graph-calc-equation-main">
        <div className="graph-calc-color-swatch" style={{ backgroundColor: fn.color }} />

        <div className="graph-calc-equation-input-wrapper">
          <span className="graph-calc-equation-prefix">y =</span>
          <input
            type="text"
            className={`graph-calc-equation-input ${fn.error ? 'error' : ''}`}
            value={fn.expression}
            onChange={handleInputChange}
            placeholder="x^2 + sin(x)"
            spellCheck={false}
            autoComplete="off"
          />
        </div>

        <button
          className="graph-calc-eq-btn"
          onClick={() => onToggleVisibility(fn.id)}
          title={fn.visible ? 'Hide' : 'Show'}
          type="button"
        >
          {fn.visible ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
        <button
          className="graph-calc-eq-btn graph-calc-eq-btn-delete"
          onClick={() => onRemove(fn.id)}
          title="Remove"
          type="button"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {fn.error && <div className="graph-calc-equation-error">{fn.error}</div>}

      {fn.sliderParams && fn.sliderParams.length > 0 && (
        <div className="graph-calc-sliders-row">
          {fn.sliderParams.map(param => (
            <GraphCalcSlider
              key={param.name}
              param={param}
              fnId={fn.id}
              onChange={onSliderChange}
            />
          ))}
        </div>
      )}
    </div>
  );
});
