/**
 * Math Dialog Component
 * Modal dialog for inserting/editing LaTeX mathematical expressions
 * Uses Tailwind CSS classes to match project's UI/UX theme
 * 
 * @module MathDialog
 * @category Math Feature Components
 */

import { useCallback, memo, useRef, useEffect, useMemo, useState } from 'react';
import MathPreview from './MathPreview';
import MathTemplatePanel from './MathTemplatePanel';
import { validateLatex } from '../utils/mathValidator';
import { X } from 'lucide-react';

export interface MathDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  
  /** Initial LaTeX value (for editing) */
  initialValue?: string;
  
  /** Callback when insert/update is clicked */
  onInsert: (latex: string) => void;
  
  /** Callback when dialog is closed */
  onClose: () => void;
  
  /** Dialog title */
  title?: string;
  
  /** Display mode for preview */
  displayMode?: boolean;
  
  /** Callback when latex value changes (controlled component) */
  onLatexChange?: (latex: string) => void;
  
  /** Current latex value (for controlled mode) */
  latexValue?: string;
}

/**
 * MathDialog Component - Matches project's TableDialog UI/UX style
 */
export const MathDialog = memo(function MathDialog({
  isOpen,
  initialValue = '',
  onInsert,
  onClose,
  title = 'Insert Mathematical Expression',
  displayMode = false,
  onLatexChange,
  latexValue,
}: MathDialogProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isDirty, setIsDirty] = useState(false);
  
  // Current latex value - controlled or use initialValue
  const currentLatex = latexValue ?? initialValue;
  
  // Validate current input
  const validation = useMemo(() => {
    return validateLatex(currentLatex);
  }, [currentLatex]);
  
  const isValid = validation.isValid;

  // Only show errors after user has typed something (dirty state)
  const showValidationErrors = isDirty && !isValid && currentLatex.trim().length === 0;
  const showSyntaxErrors = isDirty && !isValid && currentLatex.trim().length > 0;

  // Reset dirty state when dialog opens/closes
  const prevIsOpenRef = useRef(isOpen);
  useEffect(() => {
    const wasOpen = prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;

    if (isOpen && !wasOpen) {
      // Dialog just opened — mark dirty only if editing existing content
      if (initialValue.length > 0) {
        // Defer to avoid synchronous setState-in-effect lint error
        requestAnimationFrame(() => setIsDirty(true));
      }
    } else if (!isOpen && wasOpen) {
      requestAnimationFrame(() => setIsDirty(false));
    }
  }, [isOpen, initialValue]);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [isOpen]);

  // Handle input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!isDirty) setIsDirty(true);
      onLatexChange?.(e.target.value);
    },
    [onLatexChange, isDirty]
  );

  // Handle insert
  const handleInsert = useCallback(() => {
    setIsDirty(true);
    const currentValidation = validateLatex(currentLatex);
    
    if (currentValidation.isValid && currentLatex.trim().length > 0) {
      onInsert(currentValidation.sanitized);
      onClose();
    }
  }, [currentLatex, onInsert, onClose]);

  // Handle template insertion
  const handleTemplateInsert = useCallback((templateLatex: string) => {
    const newValue = currentLatex.trim().length > 0 
      ? `${currentLatex} ${templateLatex}` 
      : templateLatex;
    onLatexChange?.(newValue);
    
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [currentLatex, onLatexChange]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleInsert();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [handleInsert, onClose]
  );

  // Close on backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="math-dialog-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="math-dialog-title"
    >
      <div className="math-dialog">
        {/* Header */}
        <div className="math-dialog-header">
          <h2 id="math-dialog-title" className="math-dialog-title">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="math-dialog-close"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="math-dialog-content">
          {/* LaTeX Input */}
          <div className="math-dialog-section">
            <label htmlFor="latex-input" className="math-dialog-label">
              LaTeX Code
              <span className="math-dialog-hint">
                (Use backslash commands like \frac, \sqrt, \pi)
              </span>
            </label>
            <textarea
              ref={inputRef}
              id="latex-input"
              name="latexExpression"
              className={`math-dialog-input ${
                (showValidationErrors || showSyntaxErrors) ? 'error' : ''
              }`}
              value={currentLatex}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="\frac{a}{b}, x^2, \sqrt{x}, \pi, \sum_{i=1}^{n}"
              rows={3}
              spellCheck={false}
              autoComplete="off"
            />

            {/* Validation Errors - only after user interaction */}
            {showValidationErrors && (
              <div className="math-dialog-errors">
                {validation.errors.map((error, index) => (
                  <div key={index} className="math-dialog-error">
                    {error}
                  </div>
                ))}
              </div>
            )}
            {showSyntaxErrors && (
              <div className="math-dialog-errors">
                {validation.errors.map((error, index) => (
                  <div key={index} className="math-dialog-error">
                    {error}
                  </div>
                ))}
              </div>
            )}
            {isDirty && validation.warnings.length > 0 && (
              <div className="math-dialog-warnings">
                {validation.warnings.map((warning, index) => (
                  <div key={index} className="math-dialog-warning">
                    ⚠️ {warning}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live Preview */}
          <div className="math-dialog-section">
            <div className="math-dialog-label">Preview</div>
            <div className="math-dialog-preview-container">
              {currentLatex.trim().length > 0 ? (
                <MathPreview
                  latex={currentLatex}
                  displayMode={displayMode}
                  showErrors={false}
                  className="math-dialog-preview"
                />
              ) : (
                <span className="math-dialog-preview-empty">
                  Preview will appear here...
                </span>
              )}
            </div>
          </div>

          {/* Templates */}
          <div className="math-dialog-section">
            <div className="math-dialog-label" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
              <span>📐</span> Quick Templates
            </div>
            <div className="math-dialog-templates">
              <MathTemplatePanel
                onInsert={handleTemplateInsert}
                showCategories={true}
              />
            </div>
          </div>

          {/* Keyboard Hints */}
          <div className="math-dialog-help">
            <strong>Tip:</strong> Press <kbd className="math-dialog-kbd">Ctrl+Enter</kbd> to insert, <kbd className="math-dialog-kbd">Esc</kbd> to cancel
          </div>
        </div>

        {/* Footer */}
        <div className="math-dialog-footer">
          <button
            type="button"
            onClick={onClose}
            className="math-dialog-button math-dialog-button-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleInsert}
            disabled={!isValid || currentLatex.trim().length === 0}
            className="math-dialog-button math-dialog-button-primary"
          >
            {initialValue ? 'Update' : 'Insert'}
          </button>
        </div>
      </div>
    </div>
  );
});

export default MathDialog;
