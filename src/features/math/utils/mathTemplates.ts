/**
 * Math Template Definitions
 * Predefined LaTeX templates for quick insertion
 * 
 * @module mathTemplates
 * @category Math Feature
 */

export interface MathTemplate {
  /** Unique identifier for the template */
  id: string;
  
  /** User-friendly label */
  label: string;
  
  /** LaTeX template code */
  latex: string;
  
  /** Category for grouping in UI */
  category: 'basic' | 'advanced' | 'symbols' | 'calculus';
  
  /** Optional icon identifier (for UI) */
  icon?: string;
  
  /** Tooltip description */
  description?: string;
  
  /** Cursor position after insertion (index in latex string), -1 means end */
  cursorPosition?: number;
}

/**
 * Comprehensive collection of math templates
 * Organized by category for easy navigation
 */
export const mathTemplates: MathTemplate[] = [
  // Basic Templates
  {
    id: 'fraction',
    label: 'Fraction',
    latex: '\\frac{a}{b}',
    category: 'basic',
    description: 'Simple fraction a/b',
    cursorPosition: 6, // Inside first {}
  },
  {
    id: 'superscript',
    label: 'Superscript',
    latex: 'x^{n}',
    category: 'basic',
    description: 'Exponent or power',
    cursorPosition: 3,
  },
  {
    id: 'subscript',
    label: 'Subscript',
    latex: 'x_{i}',
    category: 'basic',
    description: 'Subscript notation',
    cursorPosition: 3,
  },
  {
    id: 'sqrt',
    label: 'Square Root',
    latex: '\\sqrt{x}',
    category: 'basic',
    description: 'Square root',
    cursorPosition: 6,
  },
  {
    id: 'nthroot',
    label: 'Nth Root',
    latex: '\\sqrt[n]{x}',
    category: 'basic',
    description: 'Nth root',
    cursorPosition: 6,
  },

  // Advanced Templates
  {
    id: 'sum',
    label: 'Summation',
    latex: '\\sum_{i=1}^{n}',
    category: 'advanced',
    description: 'Summation from i=1 to n',
  },
  {
    id: 'product',
    label: 'Product',
    latex: '\\prod_{i=1}^{n}',
    category: 'advanced',
    description: 'Product from i=1 to n',
  },
  {
    id: 'integral',
    label: 'Integral',
    latex: '\\int_{a}^{b}',
    category: 'calculus',
    description: 'Definite integral from a to b',
  },
  {
    id: 'integral-indefinite',
    label: 'Indefinite Integral',
    latex: '\\int',
    category: 'calculus',
    description: 'Indefinite integral',
  },
  {
    id: 'limit',
    label: 'Limit',
    latex: '\\lim_{x \\to \\infty}',
    category: 'calculus',
    description: 'Limit as x approaches infinity',
  },
  {
    id: 'derivative',
    label: 'Derivative',
    latex: '\\frac{d}{dx}',
    category: 'calculus',
    description: 'Derivative with respect to x',
  },
  {
    id: 'partial-derivative',
    label: 'Partial Derivative',
    latex: '\\frac{\\partial}{\\partial x}',
    category: 'calculus',
    description: 'Partial derivative',
  },

  // Symbol Templates
  {
    id: 'pi',
    label: 'Pi',
    latex: '\\pi',
    category: 'symbols',
    description: 'Greek letter pi (π)',
  },
  {
    id: 'theta',
    label: 'Theta',
    latex: '\\theta',
    category: 'symbols',
    description: 'Greek letter theta (θ)',
  },
  {
    id: 'infinity',
    label: 'Infinity',
    latex: '\\infty',
    category: 'symbols',
    description: 'Infinity symbol (∞)',
  },
  {
    id: 'neq',
    label: 'Not Equal',
    latex: '\\neq',
    category: 'symbols',
    description: 'Not equal to (≠)',
  },
  {
    id: 'leq',
    label: 'Less or Equal',
    latex: '\\leq',
    category: 'symbols',
    description: 'Less than or equal to (≤)',
  },
  {
    id: 'geq',
    label: 'Greater or Equal',
    latex: '\\geq',
    category: 'symbols',
    description: 'Greater than or equal to (≥)',
  },
  {
    id: 'approx',
    label: 'Approximately',
    latex: '\\approx',
    category: 'symbols',
    description: 'Approximately equal (≈)',
  },
  {
    id: 'times',
    label: 'Multiplication',
    latex: '\\times',
    category: 'symbols',
    description: 'Multiplication sign (×)',
  },
  {
    id: 'div',
    label: 'Division',
    latex: '\\div',
    category: 'symbols',
    description: 'Division sign (÷)',
  },
  {
    id: 'pm',
    label: 'Plus-Minus',
    latex: '\\pm',
    category: 'symbols',
    description: 'Plus-minus (±)',
  },
  {
    id: 'cdot',
    label: 'Dot Product',
    latex: '\\cdot',
    category: 'symbols',
    description: 'Center dot (·)',
  },
  {
    id: 'alpha',
    label: 'Alpha',
    latex: '\\alpha',
    category: 'symbols',
    description: 'Greek letter alpha (α)',
  },
  {
    id: 'beta',
    label: 'Beta',
    latex: '\\beta',
    category: 'symbols',
    description: 'Greek letter beta (β)',
  },
  {
    id: 'gamma',
    label: 'Gamma',
    latex: '\\gamma',
    category: 'symbols',
    description: 'Greek letter gamma (γ)',
  },
  {
    id: 'delta',
    label: 'Delta',
    latex: '\\delta',
    category: 'symbols',
    description: 'Greek letter delta (δ)',
  },
  {
    id: 'lambda',
    label: 'Lambda',
    latex: '\\lambda',
    category: 'symbols',
    description: 'Greek letter lambda (λ)',
  },
  {
    id: 'sigma',
    label: 'Sigma',
    latex: '\\sigma',
    category: 'symbols',
    description: 'Greek letter sigma (σ)',
  },
  {
    id: 'omega',
    label: 'Omega',
    latex: '\\omega',
    category: 'symbols',
    description: 'Greek letter omega (ω)',
  },
  {
    id: 'forall',
    label: 'For All',
    latex: '\\forall',
    category: 'symbols',
    description: 'Universal quantifier (∀)',
  },
  {
    id: 'exists',
    label: 'Exists',
    latex: '\\exists',
    category: 'symbols',
    description: 'Existential quantifier (∃)',
  },
  {
    id: 'nabla',
    label: 'Nabla',
    latex: '\\nabla',
    category: 'symbols',
    description: 'Nabla/gradient (∇)',
  },
  {
    id: 'partial',
    label: 'Partial',
    latex: '\\partial',
    category: 'symbols',
    description: 'Partial derivative (∂)',
  },
  {
    id: 'in-set',
    label: 'Element Of',
    latex: '\\in',
    category: 'symbols',
    description: 'Element of set (∈)',
  },
  {
    id: 'notin-set',
    label: 'Not In',
    latex: '\\notin',
    category: 'symbols',
    description: 'Not element of (∉)',
  },
  {
    id: 'subset',
    label: 'Subset',
    latex: '\\subseteq',
    category: 'symbols',
    description: 'Subset or equal (⊆)',
  },
  {
    id: 'union',
    label: 'Union',
    latex: '\\cup',
    category: 'symbols',
    description: 'Set union (∪)',
  },
  {
    id: 'intersection',
    label: 'Intersection',
    latex: '\\cap',
    category: 'symbols',
    description: 'Set intersection (∩)',
  },
  {
    id: 'rightarrow',
    label: 'Arrow →',
    latex: '\\rightarrow',
    category: 'symbols',
    description: 'Right arrow (→)',
  },
  {
    id: 'leftrightarrow',
    label: 'Arrow ↔',
    latex: '\\leftrightarrow',
    category: 'symbols',
    description: 'Double arrow (↔)',
  },
  {
    id: 'implies',
    label: 'Implies',
    latex: '\\Rightarrow',
    category: 'symbols',
    description: 'Implies (⇒)',
  },
  {
    id: 'iff',
    label: 'Iff',
    latex: '\\Leftrightarrow',
    category: 'symbols',
    description: 'If and only if (⇔)',
  },

  // Advanced Structures
  {
    id: 'matrix-2x2',
    label: '2×2 Matrix',
    latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
    category: 'advanced',
    description: '2-by-2 matrix',
  },
  {
    id: 'matrix-3x3',
    label: '3×3 Matrix',
    latex: '\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}',
    category: 'advanced',
    description: '3-by-3 matrix',
  },
  {
    id: 'determinant',
    label: 'Determinant',
    latex: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}',
    category: 'advanced',
    description: '2×2 determinant',
  },
  {
    id: 'cases',
    label: 'Piecewise',
    latex: '\\begin{cases} x, & \\text{if } x > 0 \\\\ 0, & \\text{otherwise} \\end{cases}',
    category: 'advanced',
    description: 'Piecewise function',
  },
  {
    id: 'vector',
    label: 'Vector',
    latex: '\\vec{v}',
    category: 'advanced',
    description: 'Vector notation',
  },
  {
    id: 'overline',
    label: 'Overline',
    latex: '\\overline{AB}',
    category: 'advanced',
    description: 'Line segment or conjugate',
  },
  {
    id: 'hat',
    label: 'Hat',
    latex: '\\hat{x}',
    category: 'advanced',
    description: 'Unit vector / estimator',
  },
  {
    id: 'binomial',
    label: 'Binomial',
    latex: '\\binom{n}{k}',
    category: 'advanced',
    description: 'Binomial coefficient (n choose k)',
  },
  {
    id: 'absolute',
    label: 'Absolute',
    latex: '\\left| x \\right|',
    category: 'basic',
    description: 'Absolute value |x|',
  },
  {
    id: 'parentheses',
    label: 'Parentheses',
    latex: '\\left( \\frac{a}{b} \\right)',
    category: 'basic',
    description: 'Auto-sized parentheses',
  },
  {
    id: 'brackets',
    label: 'Brackets',
    latex: '\\left[ x \\right]',
    category: 'basic',
    description: 'Auto-sized brackets',
  },
  {
    id: 'log-base',
    label: 'Logarithm',
    latex: '\\log_{b}(x)',
    category: 'basic',
    description: 'Logarithm base b',
  },
  {
    id: 'trig-sin',
    label: 'Sine',
    latex: '\\sin(\\theta)',
    category: 'basic',
    description: 'Sine function',
  },
  {
    id: 'trig-cos',
    label: 'Cosine',
    latex: '\\cos(\\theta)',
    category: 'basic',
    description: 'Cosine function',
  },

  // Calculus extras
  {
    id: 'double-integral',
    label: 'Double Integral',
    latex: '\\iint',
    category: 'calculus',
    description: 'Double integral',
  },
  {
    id: 'triple-integral',
    label: 'Triple Integral',
    latex: '\\iiint',
    category: 'calculus',
    description: 'Triple integral',
  },
  {
    id: 'contour-integral',
    label: 'Contour Integral',
    latex: '\\oint',
    category: 'calculus',
    description: 'Contour/closed integral',
  },
  {
    id: 'dx-notation',
    label: 'dx Notation',
    latex: '\\,dx',
    category: 'calculus',
    description: 'Differential dx',
  },
  {
    id: 'limit-zero',
    label: 'Limit → 0',
    latex: '\\lim_{x \\to 0}',
    category: 'calculus',
    description: 'Limit as x approaches 0',
  },
  {
    id: 'gradient',
    label: 'Gradient',
    latex: '\\nabla f',
    category: 'calculus',
    description: 'Gradient of f',
  },
  {
    id: 'series',
    label: 'Series',
    latex: '\\sum_{n=0}^{\\infty} a_n',
    category: 'calculus',
    description: 'Infinite series',
  },
  {
    id: 'taylor',
    label: 'Taylor Term',
    latex: '\\frac{f^{(n)}(a)}{n!}(x-a)^n',
    category: 'calculus',
    description: 'Taylor series term',
  },
];

/**
 * Get templates by category
 * 
 * @param category - Template category to filter by
 * @returns Array of templates in that category
 */
export function getTemplatesByCategory(
  category: MathTemplate['category']
): MathTemplate[] {
  return mathTemplates.filter((t) => t.category === category);
}

/**
 * Get template by ID
 * 
 * @param id - Template ID
 * @returns Template or undefined if not found
 */
export function getTemplateById(id: string): MathTemplate | undefined {
  return mathTemplates.find((t) => t.id === id);
}

/**
 * Get all template categories
 * 
 * @returns Array of unique categories
 */
export function getAllCategories(): MathTemplate['category'][] {
  return ['basic', 'advanced', 'symbols', 'calculus'];
}

/**
 * Search templates by label or description
 * Case-insensitive search
 * 
 * @param query - Search query
 * @returns Matching templates
 */
export function searchTemplates(query: string): MathTemplate[] {
  if (!query || query.trim().length === 0) {
    return mathTemplates;
  }

  const normalizedQuery = query.toLowerCase().trim();

  return mathTemplates.filter(
    (t) =>
      t.label.toLowerCase().includes(normalizedQuery) ||
      t.description?.toLowerCase().includes(normalizedQuery) ||
      t.latex.includes(query) // Exact match for LaTeX code
  );
}
