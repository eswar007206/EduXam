/**
 * Suggestion Extension for TipTap
 * Provides autocomplete suggestions for LaTeX expressions
 * 
 * This is a simplified, enterprise-grade implementation that works
 * with the existing TipTap architecture.
 * 
 * @module SuggestionExtension
 * @category Math Feature Extensions
 */

import { Extension, type Editor } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { searchSuggestions, type Suggestion } from '../utils/suggestions';

/**
 * Suggestion plugin options
 */
export interface SuggestionPluginOptions {
  /** Minimum characters to type before showing suggestions */
  minChars: number;

  /** Maximum suggestions to show */
  maxSuggestions: number;

  /** Callback when suggestions should be shown */
  onShowSuggestions: (props: SuggestionCallbackProps) => void;

  /** Callback when suggestions should be hidden */
  onHideSuggestions: () => void;
}

/**
 * Callback props passed to suggestion handlers
 */
export interface SuggestionCallbackProps {
  /** Current query text */
  query: string;
  
  /** Matching suggestions */
  suggestions: Suggestion[];
  
  /** Text range to replace */
  range: { from: number; to: number };
  
  /** Position for menu placement */
  clientRect: DOMRect | null;
  
  /** Function to insert a suggestion */
  insertSuggestion: (suggestion: Suggestion) => void;
}

/**
 * Plugin key for accessing suggestion state
 */
export const suggestionPluginKey = new PluginKey('mathSuggestion');

/**
 * Internal state for the suggestion plugin
 */
interface SuggestionPluginState {
  active: boolean;
  query: string;
  range: { from: number; to: number } | null;
  suggestions: Suggestion[];
  selectedIndex: number;
}

/**
 * Create the suggestion plugin
 */
function createSuggestionPlugin(options: SuggestionPluginOptions, tiptapEditor: Editor): Plugin {
  return new Plugin({
    key: suggestionPluginKey,

    state: {
      init(): SuggestionPluginState {
        return {
          active: false,
          query: '',
          range: null,
          suggestions: [],
          selectedIndex: 0,
        };
      },

      apply(tr, prev, _oldState, newState): SuggestionPluginState {
        // Handle meta actions
        const meta = tr.getMeta(suggestionPluginKey);
        if (meta?.type === 'close') {
          return {
            active: false,
            query: '',
            range: null,
            suggestions: [],
            selectedIndex: 0,
          };
        }
        if (meta?.type === 'selectIndex') {
          return { ...prev, selectedIndex: meta.index };
        }

        // Check for text changes
        if (!tr.docChanged) {
          return prev;
        }

        const { selection } = newState;
        const { from, to } = selection;

        // Only work at cursor position (not selections)
        if (from !== to) {
          if (prev.active) {
            options.onHideSuggestions();
          }
          return { ...prev, active: false, query: '', range: null, suggestions: [] };
        }

        // Get text before cursor
        const textBefore = newState.doc.textBetween(
          Math.max(0, from - 30),
          from,
          '\n',
          '\n'
        );

        // Find the last word before cursor (potential trigger)
        const match = textBefore.match(/(\w+)$/);

        if (!match || match[1].length < options.minChars) {
          if (prev.active) {
            options.onHideSuggestions();
          }
          return { ...prev, active: false, query: '', range: null, suggestions: [] };
        }

        const query = match[1];
        const startPos = from - query.length;

        // Search for suggestions
        const suggestions = searchSuggestions(query, options.maxSuggestions);

        if (suggestions.length === 0) {
          if (prev.active) {
            options.onHideSuggestions();
          }
          return { ...prev, active: false, query: '', range: null, suggestions: [] };
        }

        return {
          active: true,
          query,
          range: { from: startPos, to: from },
          suggestions,
          selectedIndex: prev.query === query ? prev.selectedIndex : 0,
        };
      },
    },

    view() {
      let lastQuery = '';
      let lastActive = false;
      
      return {
        update: (view: EditorView) => {
          const state = suggestionPluginKey.getState(view.state) as SuggestionPluginState;

          // Only call callbacks when state actually changes
          if (!state.active && lastActive) {
            lastActive = false;
            lastQuery = '';
            options.onHideSuggestions();
            return;
          }

          if (!state.active || !state.range) {
            lastActive = false;
            lastQuery = '';
            return;
          }

          // Skip if query hasn't changed
          if (state.query === lastQuery && state.active === lastActive) {
            return;
          }

          lastQuery = state.query;
          lastActive = state.active;

          // Get coordinates for menu placement
          const coords = view.coordsAtPos(state.range.from);
          const clientRect = coords ? new DOMRect(
            coords.left,
            coords.bottom,
            0,
            0
          ) : null;

          // Notify callback
          options.onShowSuggestions({
            query: state.query,
            suggestions: state.suggestions,
            range: state.range,
            clientRect,
            insertSuggestion: (suggestion: Suggestion) => {
              if (state.range) {
                const { from, to } = state.range;
                if (suggestion.unicode) {
                  const tr = view.state.tr
                    .delete(from, to)
                    .insertText(suggestion.unicode, from);
                  view.dispatch(tr.setMeta(suggestionPluginKey, { type: 'close' }));
                } else {
                  // Delete trigger text and close suggestions via ProseMirror
                  const tr = view.state.tr.delete(from, to);
                  view.dispatch(tr.setMeta(suggestionPluginKey, { type: 'close' }));
                  // Use TipTap editor for proper NodeView initialization
                  tiptapEditor.chain().focus().insertContent({
                    type: 'inlineMath',
                    attrs: { latex: suggestion.replacement },
                  }).run();
                }
              }
            },
          });
        },

        destroy: () => {
          options.onHideSuggestions();
        },
      };
    },

    props: {
      handleKeyDown: (view: EditorView, event: KeyboardEvent): boolean => {
        const state = suggestionPluginKey.getState(view.state) as SuggestionPluginState;

        if (!state.active || state.suggestions.length === 0) {
          return false;
        }

        // Arrow Down - Next suggestion
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          const newIndex = (state.selectedIndex + 1) % state.suggestions.length;
          view.dispatch(
            view.state.tr.setMeta(suggestionPluginKey, { type: 'selectIndex', index: newIndex })
          );
          return true;
        }

        // Arrow Up - Previous suggestion
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          const newIndex = (state.selectedIndex - 1 + state.suggestions.length) % state.suggestions.length;
          view.dispatch(
            view.state.tr.setMeta(suggestionPluginKey, { type: 'selectIndex', index: newIndex })
          );
          return true;
        }

        // Tab or Enter - Insert selection
        if (event.key === 'Tab' || event.key === 'Enter') {
          event.preventDefault();
          const suggestion = state.suggestions[state.selectedIndex];

          if (suggestion && state.range) {
            const { from, to } = state.range;
            if (suggestion.unicode) {
              const tr = view.state.tr
                .delete(from, to)
                .insertText(suggestion.unicode, from);
              view.dispatch(tr.setMeta(suggestionPluginKey, { type: 'close' }));
            } else {
              // Delete trigger text and close suggestions via ProseMirror
              const tr = view.state.tr.delete(from, to);
              view.dispatch(tr.setMeta(suggestionPluginKey, { type: 'close' }));
              // Use TipTap editor for proper NodeView initialization
              tiptapEditor.chain().focus().insertContent({
                type: 'inlineMath',
                attrs: { latex: suggestion.replacement },
              }).run();
            }
            options.onHideSuggestions();
          }

          return true;
        }

        // Escape - Close menu
        if (event.key === 'Escape') {
          event.preventDefault();
          view.dispatch(
            view.state.tr.setMeta(suggestionPluginKey, { type: 'close' })
          );
          options.onHideSuggestions();
          return true;
        }

        return false;
      },
    },
  });
}

/**
 * TipTap Suggestion Extension
 * 
 * Integrates with TipTap to provide autocomplete suggestions.
 * 
 * @example
 * ```typescript
 * const editor = useEditor({
 *   extensions: [
 *     SuggestionExtension.configure({
 *       minChars: 2,
 *       maxSuggestions: 8,
 *       onShowSuggestions: (props) => {
 *         setSuggestions(props.suggestions);
 *         setInsertFn(() => props.insertSuggestion);
 *       },
 *       onHideSuggestions: () => {
 *         setSuggestions([]);
 *       },
 *     }),
 *   ],
 * });
 * ```
 */
export const SuggestionExtension = Extension.create<SuggestionPluginOptions>({
  name: 'mathSuggestion',

  addOptions() {
    return {
      minChars: 2,
      maxSuggestions: 8,
      onShowSuggestions: () => {},
      onHideSuggestions: () => {},
    };
  },

  addProseMirrorPlugins() {
    return [createSuggestionPlugin(this.options, this.editor)];
  },
});

export default SuggestionExtension;
