import { memo } from 'react';

const PRESET_COLORS = [
  '#000000', '#808080', '#800000', '#808000',
  '#008000', '#008080', '#000080', '#800080',
  '#FFFFFF', '#C0C0C0', '#FF0000', '#FFFF00',
  '#00FF00', '#00FFFF', '#0000FF', '#FF00FF',
  '#FF8C00', '#FFD700', '#90EE90', '#87CEEB',
  '#DDA0DD', '#FA8072', '#A0522D', '#F5F5DC',
];

interface PaintColorPickerProps {
  strokeColor: string;
  onStrokeColorChange: (color: string) => void;
}

export const PaintColorPicker = memo(function PaintColorPicker({
  strokeColor,
  onStrokeColorChange,
}: PaintColorPickerProps) {
  return (
    <div className="paint-color-picker">
      <div className="paint-toolbar-section">
        <span className="paint-toolbar-label">Color</span>
        <div className="paint-color-grid">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              className={`paint-color-swatch ${strokeColor === color ? 'active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => onStrokeColorChange(color)}
              title={color}
              type="button"
            />
          ))}
        </div>
        <label className="paint-color-custom">
          <span className="paint-color-custom-label">Custom:</span>
          <input
            type="color"
            value={strokeColor}
            onChange={(e) => onStrokeColorChange(e.target.value)}
            className="paint-color-input"
          />
        </label>
      </div>
    </div>
  );
});
