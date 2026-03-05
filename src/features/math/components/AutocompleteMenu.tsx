/**
 * Autocomplete Menu Component
 * Displays LaTeX suggestions for quick insertion
 * Uses Tailwind CSS classes to match project's UI/UX theme
 * 
 * @module AutocompleteMenu
 * @category Math Feature Components
 */

import { memo, useCallback, useEffect, useRef } from 'react';
import type { Suggestion } from '../utils/suggestions';
import { FastMathPreview } from './MathPreview';

export interface AutocompleteMenuProps {
  /** Array of suggestion items to display */
  suggestions: Suggestion[];
  
  /** Currently selected index for keyboard navigation */
  selectedIndex: number;
  
  /** Callback when a suggestion is selected */
  onSelect: (suggestion: Suggestion) => void;
  
  /** Callback when menu should close */
  onClose: () => void;
  
  /** Position for the menu */
  position: { top: number; left: number };
}

/**
 * AutocompleteMenu Component with Tailwind CSS styling
 */
export const AutocompleteMenu = memo(function AutocompleteMenu({
  suggestions,
  selectedIndex,
  onSelect,
  onClose,
  position,
}: AutocompleteMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<HTMLButtonElement[]>([]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedItem = itemRefs.current[selectedIndex];
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Handle item selection
  const handleItemClick = useCallback(
    (suggestion: Suggestion) => {
      onSelect(suggestion);
    },
    [onSelect]
  );

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="fixed bg-background border border-border rounded-lg shadow-lg min-w-70 max-w-100 max-h-75 overflow-hidden z-50 animate-in"
      style={{ top: position.top + 4, left: position.left }}
      role="listbox"
      aria-label="Math suggestions"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted">
        <span className="text-sm font-medium text-foreground">Suggestions</span>
        <span className="text-xs text-muted-foreground">↑↓ Tab Esc</span>
      </div>

      {/* Items */}
      <div className="overflow-y-auto max-h-62.5">
        {suggestions.map((suggestion, index) => (
          <button
            key={`${suggestion.trigger}-${index}`}
            ref={(el) => { if (el) itemRefs.current[index] = el; }}
            type="button"
            role="option"
            aria-selected={index === selectedIndex}
            className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors border-b border-border last:border-b-0 ${
              index === selectedIndex
                ? 'bg-accent border-l-2 border-l-primary'
                : 'hover:bg-accent/50'
            }`}
            onClick={() => handleItemClick(suggestion)}
          >
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-sm font-semibold text-primary">
                {suggestion.trigger}
              </span>
              <span className="text-sm text-foreground">{suggestion.label}</span>
              {suggestion.description && (
                <span className="text-xs text-muted-foreground">{suggestion.description}</span>
              )}
            </div>
            <div className="shrink-0 px-2 py-1 bg-muted rounded text-lg">
              <FastMathPreview latex={suggestion.replacement} displayMode={false} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
});

export default AutocompleteMenu;
