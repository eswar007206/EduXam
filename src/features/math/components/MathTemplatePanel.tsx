/**
 * Math Template Panel Component
 * Quick-insert panel for common LaTeX templates
 * Uses Tailwind CSS classes to match project's UI/UX theme
 * 
 * @module MathTemplatePanel
 * @category Math Feature Components
 */

import { memo, useState, useCallback } from 'react';
import { mathTemplates, type MathTemplate, getAllCategories } from '../utils/mathTemplates';
import { FastMathPreview } from './MathPreview';

export interface MathTemplatePanelProps {
  /** Callback when template is selected */
  onInsert: (latex: string) => void;
  
  /** Additional CSS class names */
  className?: string;
  
  /** Show category tabs */
  showCategories?: boolean;
}

/**
 * MathTemplatePanel Component with Tailwind CSS styling
 */
export const MathTemplatePanel = memo(function MathTemplatePanel({
  onInsert,
  className = '',
  showCategories = true,
}: MathTemplatePanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<MathTemplate['category']>('basic');
  const categories = getAllCategories();

  const handleTemplateClick = useCallback(
    (template: MathTemplate) => {
      onInsert(template.latex);
    },
    [onInsert]
  );

  const filteredTemplates = showCategories
    ? mathTemplates.filter((t) => t.category === selectedCategory)
    : mathTemplates;

  return (
    <div className={`space-y-3 ${className}`}>
      {showCategories && (
        <div className="flex flex-wrap gap-1" role="tablist">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={selectedCategory === category}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                selectedCategory === category
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent border border-border'
              }`}
              onClick={() => setSelectedCategory(category)}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      )}

      <div className="template-grid" role="tabpanel">
        {filteredTemplates.map((template) => {
          // Scale down complex templates to fit in grid cells
          const isComplex = template.latex.includes('\\begin') || template.latex.length > 30;
          return (
            <button
              key={template.id}
              type="button"
              className="template-button"
              onClick={() => handleTemplateClick(template)}
              title={template.description || template.label}
              aria-label={`Insert ${template.label}`}
            >
              <span className="template-label">{template.label}</span>
              <div
                className="template-preview"
                style={isComplex ? { fontSize: '0.7rem' } : undefined}
              >
                <FastMathPreview
                  latex={template.latex}
                  displayMode={false}
                />
              </div>
            </button>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-4 text-muted-foreground text-sm">
          No templates in this category
        </div>
      )}
    </div>
  );
});

export default MathTemplatePanel;
