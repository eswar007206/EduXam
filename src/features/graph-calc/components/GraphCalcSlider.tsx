import { memo, useCallback } from 'react';
import type { SliderParam } from '../types';

interface Props {
  param: SliderParam;
  fnId: string;
  onChange: (fnId: string, paramName: string, value: number) => void;
}

export const GraphCalcSlider = memo(function GraphCalcSlider({ param, fnId, onChange }: Props) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(fnId, param.name, Number(e.target.value));
    },
    [fnId, param.name, onChange],
  );

  return (
    <div className="graph-calc-slider">
      <label className="graph-calc-slider-label">
        <span className="graph-calc-slider-name">{param.name}</span>
        <span className="graph-calc-slider-value">= {param.value.toFixed(1)}</span>
      </label>
      <input
        type="range"
        min={param.min}
        max={param.max}
        step={param.step}
        value={param.value}
        onChange={handleChange}
        className="graph-calc-slider-input"
      />
    </div>
  );
});
