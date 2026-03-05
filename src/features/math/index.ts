/**
 * Math Feature - Barrel Export
 * 
 * Provides centralized exports for all math feature components,
 * utilities, and extensions.
 * 
 * @module math
 * @category Math Feature
 */

// ============================================
// Components
// ============================================

export { MathPreview, FastMathPreview, type MathPreviewProps } from './components/MathPreview';
export { MathDialog, type MathDialogProps } from './components/MathDialog';
export { AutocompleteMenu, type AutocompleteMenuProps } from './components/AutocompleteMenu';
export { MathTemplatePanel, type MathTemplatePanelProps } from './components/MathTemplatePanel';

// ============================================
// Extensions
// ============================================

export { 
  SuggestionExtension, 
  suggestionPluginKey,
  type SuggestionPluginOptions,
  type SuggestionCallbackProps,
} from './extensions/SuggestionExtension';

export { 
  ConfiguredMathematicsExtension,
  default as MathematicsExtension,
} from './extensions/MathematicsExtension';

// ============================================
// Utilities
// ============================================

export {
  type Suggestion,
  mathSuggestions,
  searchSuggestions,
  getSuggestionByTrigger,
  getAllTriggers,
} from './utils/suggestions';

export {
  type ValidationResult,
  validateLatex,
  isValidLatex,
  getLatexErrors,
  sanitizeLatex,
  extractCommands,
} from './utils/mathValidator';

export {
  type MathTemplate,
  mathTemplates,
  getTemplatesByCategory,
  getTemplateById,
  getAllCategories,
  searchTemplates,
} from './utils/mathTemplates';

// ============================================
// Styles (import side effect)
// ============================================

import './styles/math.css';
