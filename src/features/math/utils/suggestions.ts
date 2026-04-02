/**
 * Math Autocomplete Suggestions
 * Enterprise-grade autocomplete data for LaTeX math expressions
 * 
 * @module suggestions
 * @category Math Feature
 */

export interface Suggestion {
  /** Trigger word that user types (e.g., "frac") */
  trigger: string;
  
  /** LaTeX command to insert (e.g., "\\frac{}{}") */
  replacement: string;
  
  /** User-friendly display name */
  label: string;
  
  /** Optional description for tooltip */
  description?: string;
  
  /** Category for grouping */
  category: 'common' | 'greek' | 'operators' | 'symbols' | 'advanced';
  
  /** Priority for sorting (higher = shown first) */
  priority?: number;

  /** Unicode character for simple symbols (inserted directly instead of LaTeX) */
  unicode?: string;
}

/**
 * Comprehensive list of LaTeX autocomplete suggestions
 * Organized by category and frequency of use
 */
export const mathSuggestions: Suggestion[] = [
  // Common Mathematical Expressions (High Priority)
  {
    trigger: 'frac',
    replacement: '\\frac{}{}',
    label: 'Fraction',
    description: 'Insert a fraction',
    category: 'common',
    priority: 100,
  },
  {
    trigger: 'sqrt',
    replacement: '\\sqrt{}',
    label: 'Square Root',
    description: 'Insert square root',
    category: 'common',
    priority: 95,
  },
  {
    trigger: 'sum',
    replacement: '\\sum_{}^{}',
    label: 'Summation',
    description: 'Insert summation notation',
    category: 'common',
    priority: 90,
  },
  {
    trigger: 'int',
    replacement: '\\int_{}^{}',
    label: 'Integral',
    description: 'Insert integral',
    category: 'common',
    priority: 88,
  },
  {
    trigger: 'lim',
    replacement: '\\lim_{}',
    label: 'Limit',
    description: 'Insert limit notation',
    category: 'common',
    priority: 85,
  },
  {
    trigger: 'prod',
    replacement: '\\prod_{}^{}',
    label: 'Product',
    description: 'Insert product notation',
    category: 'common',
    priority: 80,
  },

  // Greek Letters (Lowercase)
  {
    trigger: 'alpha',
    replacement: '\\alpha',
    label: 'Alpha (α)',
    category: 'greek',
    priority: 75,
    unicode: 'α',
  },
  {
    trigger: 'beta',
    replacement: '\\beta',
    label: 'Beta (β)',
    category: 'greek',
    priority: 74,
    unicode: 'β',
  },
  {
    trigger: 'gamma',
    replacement: '\\gamma',
    label: 'Gamma (γ)',
    category: 'greek',
    priority: 73,
    unicode: 'γ',
  },
  {
    trigger: 'delta',
    replacement: '\\delta',
    label: 'Delta (δ)',
    category: 'greek',
    priority: 72,
    unicode: 'δ',
  },
  {
    trigger: 'epsilon',
    replacement: '\\epsilon',
    label: 'Epsilon (ε)',
    category: 'greek',
    priority: 71,
    unicode: 'ε',
  },
  {
    trigger: 'theta',
    replacement: '\\theta',
    label: 'Theta (θ)',
    category: 'greek',
    priority: 70,
    unicode: 'θ',
  },
  {
    trigger: 'lambda',
    replacement: '\\lambda',
    label: 'Lambda (λ)',
    category: 'greek',
    priority: 69,
    unicode: 'λ',
  },
  {
    trigger: 'mu',
    replacement: '\\mu',
    label: 'Mu (μ)',
    category: 'greek',
    priority: 68,
    unicode: 'μ',
  },
  {
    trigger: 'pi',
    replacement: '\\pi',
    label: 'Pi (π)',
    category: 'greek',
    priority: 90, // High priority - commonly used
    unicode: 'π',
  },
  {
    trigger: 'sigma',
    replacement: '\\sigma',
    label: 'Sigma (σ)',
    category: 'greek',
    priority: 67,
    unicode: 'σ',
  },
  {
    trigger: 'omega',
    replacement: '\\omega',
    label: 'Omega (ω)',
    category: 'greek',
    priority: 66,
    unicode: 'ω',
  },

  // Greek Letters (Uppercase)
  {
    trigger: 'Delta',
    replacement: '\\Delta',
    label: 'Delta (Δ)',
    category: 'greek',
    priority: 65,
    unicode: 'Δ',
  },
  {
    trigger: 'Gamma',
    replacement: '\\Gamma',
    label: 'Gamma (Γ)',
    category: 'greek',
    priority: 64,
    unicode: 'Γ',
  },
  {
    trigger: 'Sigma',
    replacement: '\\Sigma',
    label: 'Sigma (Σ)',
    category: 'greek',
    priority: 63,
    unicode: 'Σ',
  },
  {
    trigger: 'Omega',
    replacement: '\\Omega',
    label: 'Omega (Ω)',
    category: 'greek',
    priority: 62,
    unicode: 'Ω',
  },

  // Mathematical Operators
  {
    trigger: 'times',
    replacement: '\\times',
    label: 'Multiplication (×)',
    category: 'operators',
    priority: 60,
    unicode: '×',
  },
  {
    trigger: 'div',
    replacement: '\\div',
    label: 'Division (÷)',
    category: 'operators',
    priority: 59,
    unicode: '÷',
  },
  {
    trigger: 'pm',
    replacement: '\\pm',
    label: 'Plus-Minus (±)',
    category: 'operators',
    priority: 58,
    unicode: '±',
  },
  {
    trigger: 'leq',
    replacement: '\\leq',
    label: 'Less than or equal (≤)',
    category: 'operators',
    priority: 57,
    unicode: '≤',
  },
  {
    trigger: 'geq',
    replacement: '\\geq',
    label: 'Greater than or equal (≥)',
    category: 'operators',
    priority: 56,
    unicode: '≥',
  },
  {
    trigger: 'neq',
    replacement: '\\neq',
    label: 'Not equal (≠)',
    category: 'operators',
    priority: 55,
    unicode: '≠',
  },
  {
    trigger: 'approx',
    replacement: '\\approx',
    label: 'Approximately (≈)',
    category: 'operators',
    priority: 54,
    unicode: '≈',
  },

  // Symbols
  {
    trigger: 'infty',
    replacement: '\\infty',
    label: 'Infinity (∞)',
    category: 'symbols',
    priority: 53,
    unicode: '∞',
  },
  {
    trigger: 'partial',
    replacement: '\\partial',
    label: 'Partial Derivative (∂)',
    category: 'symbols',
    priority: 52,
    unicode: '∂',
  },
  {
    trigger: 'nabla',
    replacement: '\\nabla',
    label: 'Nabla (∇)',
    category: 'symbols',
    priority: 51,
    unicode: '∇',
  },
  {
    trigger: 'forall',
    replacement: '\\forall',
    label: 'For All (∀)',
    category: 'symbols',
    priority: 50,
    unicode: '∀',
  },
  {
    trigger: 'exists',
    replacement: '\\exists',
    label: 'Exists (∃)',
    category: 'symbols',
    priority: 49,
    unicode: '∃',
  },

  // Advanced Expressions
  {
    trigger: 'matrix',
    replacement: '\\begin{matrix}  &  \\\\  &  \\end{matrix}',
    label: 'Matrix',
    description: 'Insert matrix',
    category: 'advanced',
    priority: 45,
  },
  {
    trigger: 'cases',
    replacement: '\\begin{cases}  &  \\\\  &  \\end{cases}',
    label: 'Piecewise Function',
    description: 'Insert piecewise function',
    category: 'advanced',
    priority: 44,
  },
];

/**
 * Search suggestions by trigger prefix
 * Uses case-insensitive matching and returns sorted by priority
 * 
 * @param query - User's typed text
 * @param maxResults - Maximum number of results to return (default: 8)
 * @returns Filtered and sorted suggestions
 * 
 * @example
 * ```typescript
 * searchSuggestions('fr') // Returns: [frac, ...]
 * searchSuggestions('al') // Returns: [alpha, ...]
 * ```
 */
export function searchSuggestions(query: string, maxResults = 8): Suggestion[] {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const normalizedQuery = query.toLowerCase().trim();
  
  const matches = mathSuggestions.filter((suggestion) =>
    suggestion.trigger.toLowerCase().startsWith(normalizedQuery)
  );

  // Sort by priority (descending) and then alphabetically
  matches.sort((a, b) => {
    const priorityDiff = (b.priority || 0) - (a.priority || 0);
    if (priorityDiff !== 0) return priorityDiff;
    return a.trigger.localeCompare(b.trigger);
  });

  return matches.slice(0, maxResults);
}

/**
 * Get suggestion by exact trigger match
 * 
 * @param trigger - Exact trigger word to match
 * @returns Matching suggestion or undefined
 */
export function getSuggestionByTrigger(trigger: string): Suggestion | undefined {
  return mathSuggestions.find(
    (s) => s.trigger.toLowerCase() === trigger.toLowerCase()
  );
}

/**
 * Get all triggers for validation
 * 
 * @returns Array of all trigger words
 */
export function getAllTriggers(): string[] {
  return mathSuggestions.map((s) => s.trigger);
}
