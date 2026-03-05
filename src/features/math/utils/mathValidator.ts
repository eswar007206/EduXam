/**
 * LaTeX Validation Utilities
 * Enterprise-grade validation and sanitization for LaTeX expressions
 * 
 * @module mathValidator
 * @category Math Feature
 */

/**
 * Validation result interface
 */
export interface ValidationResult {
  /** Whether the LaTeX is valid */
  isValid: boolean;
  
  /** Array of error messages (empty if valid) */
  errors: string[];
  
  /** Array of warning messages */
  warnings: string[];
  
  /** Sanitized LaTeX (with safe transformations applied) */
  sanitized: string;
}

/**
 * Common LaTeX command patterns for validation
 */
const LATEX_COMMAND_PATTERN = /\\[a-zA-Z]+/g;

/**
 * Dangerous LaTeX commands that should be blocked for security
 * These could potentially execute arbitrary code or cause XSS
 */
const DANGEROUS_COMMANDS = [
  '\\input',
  '\\include',
  '\\write',
  '\\immediate',
  '\\openout',
  '\\closeout',
  '\\csname',
  '\\expandafter',
  '\\catcode',
  '\\def',
  '\\edef',
  '\\gdef',
  '\\xdef',
  '\\let',
];

/**
 * Validate LaTeX expression for syntax and security
 * 
 * @param latex - LaTeX string to validate
 * @returns Validation result with errors, warnings, and sanitized output
 * 
 * @example
 * ```typescript
 * const result = validateLatex('\\frac{1}{2}');
 * if (result.isValid) {
 *   render(result.sanitized);
 * } else {
 *   console.error(result.errors);
 * }
 * ```
 */
export function validateLatex(latex: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Null/undefined check
  if (latex == null) {
    errors.push('LaTeX expression cannot be null or undefined');
    return {
      isValid: false,
      errors,
      warnings,
      sanitized: '',
    };
  }

  // Convert to string and trim
  const trimmed = String(latex).trim();

  // Empty check
  if (trimmed.length === 0) {
    errors.push('LaTeX expression cannot be empty');
    return {
      isValid: false,
      errors,
      warnings,
      sanitized: '',
    };
  }

  // Length check (prevent DoS attacks with extremely long expressions)
  const MAX_LENGTH = 10000;
  if (trimmed.length > MAX_LENGTH) {
    errors.push(`LaTeX expression too long (max ${MAX_LENGTH} characters)`);
    return {
      isValid: false,
      errors,
      warnings,
      sanitized: trimmed.slice(0, MAX_LENGTH),
    };
  }

  // Security: Check for dangerous commands
  const dangerousFound = DANGEROUS_COMMANDS.filter((cmd) =>
    trimmed.toLowerCase().includes(cmd.toLowerCase())
  );
  
  if (dangerousFound.length > 0) {
    errors.push(
      `Dangerous LaTeX commands not allowed: ${dangerousFound.join(', ')}`
    );
    return {
      isValid: false,
      errors,
      warnings,
      sanitized: '',
    };
  }

  // Check for balanced braces
  const braceBalance = checkBraceBalance(trimmed);
  if (!braceBalance.balanced) {
    errors.push(braceBalance.error || 'Unbalanced braces in LaTeX expression');
  }

  // Check for valid LaTeX commands
  const commands = trimmed.match(LATEX_COMMAND_PATTERN) || [];
  const unknownCommands = commands.filter((cmd) => !isKnownCommand(cmd));
  
  if (unknownCommands.length > 0) {
    warnings.push(
      `Unknown LaTeX commands (may not render): ${[...new Set(unknownCommands)].join(', ')}`
    );
  }

  // Sanitize the input
  const sanitized = sanitizeLatex(trimmed);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitized,
  };
}

/**
 * Check if braces are balanced in LaTeX expression
 * 
 * @param latex - LaTeX string to check
 * @returns Object with balance status and error message
 */
function checkBraceBalance(latex: string): { balanced: boolean; error?: string } {
  let balance = 0;
  let maxDepth = 0;
  
  for (let i = 0; i < latex.length; i++) {
    if (latex[i] === '{') {
      balance++;
      maxDepth = Math.max(maxDepth, balance);
    } else if (latex[i] === '}') {
      balance--;
    }
    
    if (balance < 0) {
      return {
        balanced: false,
        error: `Unexpected closing brace at position ${i}`,
      };
    }
  }
  
  if (balance > 0) {
    return {
      balanced: false,
      error: `${balance} unclosed brace(s)`,
    };
  }
  
  // Warn if nesting is too deep (potential performance issue)
  if (maxDepth > 20) {
    return {
      balanced: true,
      error: `Very deep brace nesting (${maxDepth} levels) may cause performance issues`,
    };
  }
  
  return { balanced: true };
}

/**
 * Check if a LaTeX command is known/supported
 * This is a basic check - KaTeX will do the final validation
 * 
 * @param command - LaTeX command (e.g., "\\frac")
 * @returns Whether the command is recognized
 */
function isKnownCommand(command: string): boolean {
  // List of common KaTeX-supported commands
  const knownCommands = [
    '\\frac', '\\sqrt', '\\sum', '\\int', '\\lim', '\\prod',
    '\\alpha', '\\beta', '\\gamma', '\\delta', '\\epsilon', '\\theta',
    '\\lambda', '\\mu', '\\pi', '\\sigma', '\\omega',
    '\\Delta', '\\Gamma', '\\Sigma', '\\Omega',
    '\\times', '\\div', '\\pm', '\\leq', '\\geq', '\\neq', '\\approx',
    '\\infty', '\\partial', '\\nabla', '\\forall', '\\exists',
    '\\sin', '\\cos', '\\tan', '\\log', '\\ln', '\\exp',
    '\\left', '\\right', '\\begin', '\\end',
    '\\text', '\\textbf', '\\textit',
    '\\cdot', '\\ldots', '\\dots',
    '\\overline', '\\underline', '\\hat', '\\bar', '\\vec',
    '\\binom', '\\iint', '\\iiint', '\\oint',
    '\\in', '\\notin', '\\subseteq', '\\subset', '\\cup', '\\cap',
    '\\rightarrow', '\\leftarrow', '\\leftrightarrow',
    '\\Rightarrow', '\\Leftarrow', '\\Leftrightarrow',
    '\\to', '\\mapsto', '\\implies', '\\iff',
    '\\mathbb', '\\mathcal', '\\mathbf', '\\mathrm',
    '\\pmatrix', '\\bmatrix', '\\vmatrix',
  ];
  
  return knownCommands.includes(command);
}

/**
 * Sanitize LaTeX expression
 * Removes or escapes potentially problematic characters
 * 
 * @param latex - LaTeX string to sanitize
 * @returns Sanitized LaTeX string
 */
export function sanitizeLatex(latex: string): string {
  let sanitized = latex;
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Remove or escape HTML-like tags (XSS prevention)
  sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
  sanitized = sanitized.replace(/<[^>]+>/g, '');
  
  // Normalize whitespace (but preserve intentional spaces in \text{})
  sanitized = sanitized.replace(/\s+/g, ' ');
  
  return sanitized.trim();
}

/**
 * Quick validation for user input (returns boolean only)
 * Useful for real-time validation without detailed errors
 * 
 * @param latex - LaTeX string to validate
 * @returns True if valid, false otherwise
 */
export function isValidLatex(latex: string): boolean {
  const result = validateLatex(latex);
  return result.isValid;
}

/**
 * Get human-readable error messages
 * 
 * @param latex - LaTeX string to validate
 * @returns Array of error messages (empty if valid)
 */
export function getLatexErrors(latex: string): string[] {
  const result = validateLatex(latex);
  return result.errors;
}

/**
 * Extract all LaTeX commands from an expression
 * Useful for debugging and analysis
 * 
 * @param latex - LaTeX string to analyze
 * @returns Array of unique LaTeX commands found
 */
export function extractCommands(latex: string): string[] {
  const commands = latex.match(LATEX_COMMAND_PATTERN) || [];
  return [...new Set(commands)];
}
