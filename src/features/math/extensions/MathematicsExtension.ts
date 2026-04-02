/**
 * Mathematics Extension for TipTap
 * Configures @tiptap/extension-mathematics with KaTeX rendering
 * 
 * @module MathematicsExtension
 * @category Math Feature Extensions
 */

import { Mathematics } from '@tiptap/extension-mathematics';
import 'katex/dist/katex.min.css';

/**
 * Custom Mathematics Extension Configuration
 * 
 * Features:
 * - Inline and block math support
 * - KaTeX rendering with security settings
 * - Error handling
 * - Performance optimization
 * 
 * Usage: Type $latex$ (e.g., $\frac{1}{2}$) and it will auto-convert
 * Or use the math dialog button in the toolbar
 * 
 * @example
 * ```typescript
 * const editor = useEditor({
 *   extensions: [
 *     ConfiguredMathematicsExtension,
 *   ],
 * });
 * ```
 */
export const ConfiguredMathematicsExtension = Mathematics.configure({
  /**
   * KaTeX rendering options
   */
  katexOptions: {
    // Don't throw on errors, show error message instead
    throwOnError: false,
    
    // Error color for invalid LaTeX
    errorColor: '#ef4444',
    
    // Strict mode - catch more potential issues
    strict: 'warn',
    
    // Security: Don't trust user input
    trust: false,
    
    // Prevent extremely large expressions (DoS mitigation)
    maxSize: 500,
    
    // Prevent infinite expansion
    maxExpand: 1000,
    
    // Custom macros for common patterns
    macros: {
      '\\RR': '\\mathbb{R}',
      '\\NN': '\\mathbb{N}',
      '\\ZZ': '\\mathbb{Z}',
      '\\QQ': '\\mathbb{Q}',
      '\\CC': '\\mathbb{C}',
    },
  },
});

/**
 * Export the extension as default
 */
export default ConfiguredMathematicsExtension;
