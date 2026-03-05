import { memo } from 'react';

const PRESET_SIZES = [1, 2, 4, 6, 8, 12, 16, 24];

interface PaintBrushSizeSelectorProps {
  size: number;
  onChange: (size: number) => void;
}

export const PaintBrushSizeSelector = memo(function PaintBrushSizeSelector({
  size,
  onChange,
}: PaintBrushSizeSelectorProps) {
  return (
    <div className="paint-brush-size">
      <span className="paint-toolbar-label">Size: {size}px</span>
      <input
        type="range"
        min={1}
        max={30}
        value={size}
        onChange={(e) => onChange(Number(e.target.value))}
        className="paint-brush-slider"
      />
      <div className="paint-brush-presets">
        {PRESET_SIZES.map((s) => (
          <button
            key={s}
            className={`paint-brush-preset ${size === s ? 'active' : ''}`}
            onClick={() => onChange(s)}
            title={`${s}px`}
            type="button"
          >
            <span
              className="paint-brush-dot"
              style={{
                width: Math.min(s, 16),
                height: Math.min(s, 16),
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
});
