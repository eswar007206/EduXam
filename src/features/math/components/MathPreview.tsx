/**
 * Math Preview Component
 * Renders LaTeX expressions using KaTeX with error handling
 * 
 * @module MathPreview
 * @category Math Feature Components
 */

import { useEffect, useRef, useMemo, memo, useCallback } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { validateLatex, type ValidationResult } from '../utils/mathValidator';

export interface MathPreviewProps {
  /** LaTeX expression to render */
  latex: string;
  
  /** Display mode: inline or block */
  displayMode?: boolean;
  
  /** Additional CSS class names */
  className?: string;
  
  /** Show validation errors inline */
  showErrors?: boolean;
  
  /** Callback when rendering succeeds */
  onRenderSuccess?: () => void;
  
  /** Callback when rendering fails */
  onRenderError?: (error: string) => void;
}

/**
 * MathPreview Component
 * 
 * Features:
 * - Real-time KaTeX rendering
 * - Input validation and sanitization
 * - Error handling with user-friendly messages
 * - Performance optimized with memoization
 * - Accessibility support
 * 
 * @example
 * ```tsx
 * <MathPreview 
 *   latex="\frac{2}{2}" 
 *   displayMode={false}
 *   showErrors={true}
 * />
 * ```
 */
export const MathPreview = memo(function MathPreview({
  latex,
  displayMode = false,
  className = '',
  showErrors = true,
  onRenderSuccess,
  onRenderError,
}: MathPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Use useMemo for derived validation state (enterprise pattern - no setState needed)
  const validation: ValidationResult = useMemo(() => {
    return validateLatex(latex);
  }, [latex]);

  // Compute render error from validation (derived state)
  const renderError = useMemo(() => {
    return validation.isValid ? null : validation.errors.join('; ');
  }, [validation]);

  // Memoized render function
  const renderMath = useCallback(() => {
    if (!containerRef.current) return;

    if (!validation.isValid) {
      // Show error state in container
      containerRef.current.textContent = latex;
      containerRef.current.style.color = '#ef4444';
      onRenderError?.(validation.errors.join('; '));
      return;
    }

    try {
      katex.render(validation.sanitized, containerRef.current, {
        displayMode,
        throwOnError: false,
        errorColor: '#ef4444',
        strict: false,
        trust: false,
        maxSize: 500,
        maxExpand: 1000,
      });
      
      containerRef.current.style.color = '';
      onRenderSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to render LaTeX';
      
      if (containerRef.current) {
        containerRef.current.textContent = latex;
        containerRef.current.style.color = '#ef4444';
      }
      
      onRenderError?.(errorMessage);
    }
  }, [latex, displayMode, validation, onRenderSuccess, onRenderError]);

  // Effect only for DOM manipulation
  useEffect(() => {
    renderMath();
  }, [renderMath]);

  return (
    <div className={`math-preview ${className}`}>
      <div
        ref={containerRef}
        className={`math-preview-content ${displayMode ? 'math-preview-block' : 'math-preview-inline'}`}
        role="img"
        aria-label={`Mathematical expression: ${latex}`}
      />
      
      {showErrors && (
        <>
          {validation.errors.length > 0 && (
            <div className="math-preview-errors" role="alert">
              {validation.errors.map((error, index) => (
                <div key={index} className="math-preview-error">
                  ❌ {error}
                </div>
              ))}
            </div>
          )}
          
          {validation.warnings.length > 0 && (
            <div className="math-preview-warnings">
              {validation.warnings.map((warning, index) => (
                <div key={index} className="math-preview-warning">
                  ⚠️ {warning}
                </div>
              ))}
            </div>
          )}
          
          {renderError && (
            <div className="math-preview-render-error" role="alert">
              ❌ Render Error: {renderError}
            </div>
          )}
        </>
      )}
    </div>
  );
});

/**
 * Lightweight preview component without validation (for performance)
 * Use this when you're confident the LaTeX is already validated
 */
export const FastMathPreview = memo(function FastMathPreview({
  latex,
  displayMode = false,
  className = '',
}: Pick<MathPreviewProps, 'latex' | 'displayMode' | 'className'>) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && latex) {
      try {
        katex.render(latex, containerRef.current, {
          displayMode,
          throwOnError: false,
          trust: false,
        });
      } catch {
        // Silently fail for fast preview
        if (containerRef.current) {
          containerRef.current.textContent = latex;
        }
      }
    }
  }, [latex, displayMode]);

  return (
    <div
      ref={containerRef}
      className={`math-preview-fast ${className}`}
      role="img"
      aria-label={`Mathematical expression: ${latex}`}
    />
  );
});

export default MathPreview;
