import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
// Underline is included in StarterKit v3 — no separate import needed
import { Extension } from '@tiptap/core';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import CharacterCount from '@tiptap/extension-character-count';
import './RichTextEditor.css';
import TableDialog from './TableDialog';
import { useState, useCallback, memo } from 'react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Table as TableIcon,
  ListOrdered,
  List,
  Heading1,
  Heading2,
  Sigma,
  Code2,
  Paintbrush,
  LineChart,
} from 'lucide-react';
import CodeEditorPanel from './CodeEditorPanel';
import type { SupportedLanguage } from '@/services/codeExecutionService';
import {
  ConfiguredMathematicsExtension,
  SuggestionExtension,
  MathDialog,
  AutocompleteMenu,
} from '@/features/math';
import type {
  Suggestion,
  SuggestionCallbackProps,
} from '@/features/math';
import { PaintDialog } from '@/features/paint';
import { GraphCalcDialog } from '@/features/graph-calc';

// Extend TextStyle to support fontSize
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

// Create a custom extension for font size
const FontSize = Extension.create({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.fontSize.replace(/['"]+/g, ''),
            renderHTML: (attributes: { fontSize?: string }) => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontSize }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
        },
    };
  },
});

const FONT_FAMILY_OPTIONS = [
  { label: 'Arial', value: 'Arial' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Courier New', value: 'Courier New' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Verdana', value: 'Verdana' },
];

const FONT_SIZE_OPTIONS = [
  { label: '8px', value: '8px' },
  { label: '10px', value: '10px' },
  { label: '12px', value: '12px' },
  { label: '14px', value: '14px' },
  { label: '16px', value: '16px' },
  { label: '18px', value: '18px' },
  { label: '20px', value: '20px' },
  { label: '24px', value: '24px' },
  { label: '28px', value: '28px' },
  { label: '32px', value: '32px' },
  { label: '36px', value: '36px' },
  { label: '48px', value: '48px' },
];

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  showCompiler?: boolean;
  onToggleCompiler?: () => void;
  compilerCode?: string;
  onCompilerCodeChange?: (code: string) => void;
  compilerLanguage?: SupportedLanguage;
  onCompilerLanguageChange?: (lang: SupportedLanguage) => void;
  allowCodeCompiler?: boolean;
  allowDrawingCanvas?: boolean;
  allowGraphCalculator?: boolean;
}

const COMPILER_LANGUAGES: { label: string; value: SupportedLanguage }[] = [
  { label: 'Python', value: 'python' },
  { label: 'C', value: 'c' },
  { label: 'C++', value: 'cpp' },
  { label: 'Java', value: 'java' },
];

const RichTextEditor = memo(function RichTextEditor({
  content,
  onChange,
  showCompiler = false,
  onToggleCompiler,
  compilerCode = '',
  onCompilerCodeChange,
  compilerLanguage = 'python',
  onCompilerLanguageChange,
  allowCodeCompiler = true,
  allowDrawingCanvas = true,
  allowGraphCalculator = true,
}: RichTextEditorProps) {
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [, setResizingImage] = useState<HTMLImageElement | null>(null);

  // Math feature state
  const [showMathDialog, setShowMathDialog] = useState(false);
  const [mathLatex, setMathLatex] = useState('');

  // Paint feature state
  const [showPaintDialog, setShowPaintDialog] = useState(false);

  // Graph calculator feature state
  const [showGraphCalcDialog, setShowGraphCalcDialog] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionProps, setSuggestionProps] = useState<SuggestionCallbackProps | null>(null);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          HTMLAttributes: {
            class: 'bullet-list',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'ordered-list',
          },
        },
      }),
      TextStyle,
      FontFamily,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      CharacterCount,
      Image.configure({
        HTMLAttributes: {
          class: 'resizable-image',
        },
      }),
      Table.configure({
        resizable: true,
        cellMinWidth: 100,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      ConfiguredMathematicsExtension,
      SuggestionExtension.configure({
        minChars: 2,
        maxSuggestions: 8,
        onShowSuggestions: (props: SuggestionCallbackProps) => {
          setSuggestions(props.suggestions);
          setSuggestionProps(props);
          setSelectedSuggestionIndex(0);
        },
        onHideSuggestions: () => {
          setSuggestions([]);
          setSuggestionProps(null);
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      handleDrop: (view, event, _slice, moved) => {
        if (!moved && event.dataTransfer?.files.length) {
          const images = Array.from(event.dataTransfer.files).filter((file) =>
            file.type.startsWith('image/')
          );

          if (images.length) {
            images.forEach((image) => {
              const reader = new FileReader();
              reader.onload = (readerEvent) => {
                const node = view.state.schema.nodes.image.create({
                  src: readerEvent.target?.result,
                });
                const transaction = view.state.tr.replaceSelectionWith(node);
                view.dispatch(transaction);
              };
              reader.readAsDataURL(image);
            });
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
              const reader = new FileReader();
              reader.onload = (readerEvent) => {
                const node = view.state.schema.nodes.image.create({
                  src: readerEvent.target?.result,
                });
                const transaction = view.state.tr.replaceSelectionWith(node);
                view.dispatch(transaction);
              };
              reader.readAsDataURL(file);
              return true;
            }
          }
        }
        return false;
      },
    },
  });

  const insertTable = useCallback(
    (rows: number, cols: number) => {
      editor?.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
      setShowTableDialog(false);
    },
    [editor]
  );

  // Math dialog handlers
  const handleMathInsert = useCallback((latex: string) => {
    if (editor) {
      editor.chain().focus().insertContent({
        type: 'inlineMath',
        attrs: { latex },
      }).run();
    }
    setMathLatex('');
  }, [editor]);

  const handleOpenMathDialog = useCallback(() => {
    setMathLatex('');
    setShowMathDialog(true);
  }, []);

  // Paint dialog handler
  const handlePaintInsert = useCallback((dataUrl: string) => {
    if (editor) {
      editor.chain().focus().setImage({ src: dataUrl }).run();
    }
  }, [editor]);

  // Graph calculator handler
  const handleGraphCalcInsert = useCallback((dataUrl: string) => {
    if (editor) {
      editor.chain().focus().setImage({ src: dataUrl }).run();
    }
  }, [editor]);

  // Autocomplete suggestion selection handler
  const handleSuggestionSelect = useCallback((suggestion: Suggestion) => {
    if (suggestionProps) {
      suggestionProps.insertSuggestion(suggestion);
    }
    setSuggestions([]);
    setSuggestionProps(null);
  }, [suggestionProps]);

  if (!editor) {
    return null;
  }

  const handleImageResize = (event: React.MouseEvent<HTMLImageElement>) => {
    const img = event.target as HTMLImageElement;
    setResizingImage((prev) => {
      if (!prev) {
        img.classList.add('selected');
        return img;
      } else {
        img.classList.remove('selected');
        return null;
      }
    });
  };

  return (
    <div className="rich-text-editor">
      <div className="editor-toolbar">
        {/* Font Family */}
        <div className="toolbar-group">
          <select
            className="font-select"
            onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
            value={editor.getAttributes('textStyle').fontFamily || 'Arial'}
          >
            {FONT_FAMILY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Font Size */}
        <div className="toolbar-group">
          <select
            className="font-size-select"
            onChange={(e) => editor.chain().focus().setFontSize(e.target.value).run()}
            value={editor.getAttributes('textStyle').fontSize || '16px'}
          >
            {FONT_SIZE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Text Formatting */}
        <div className="toolbar-group">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`toolbar-button ${editor.isActive('bold') ? 'active' : ''}`}
            title="Bold"
          >
            <Bold size={18} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`toolbar-button ${editor.isActive('italic') ? 'active' : ''}`}
            title="Italic"
          >
            <Italic size={18} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`toolbar-button ${editor.isActive('underline') ? 'active' : ''}`}
            title="Underline"
          >
            <UnderlineIcon size={18} />
          </button>
        </div>

        {/* Headings */}
        <div className="toolbar-group">
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`toolbar-button ${editor.isActive('heading', { level: 1 }) ? 'active' : ''}`}
            title="Heading 1"
          >
            <Heading1 size={18} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`toolbar-button ${editor.isActive('heading', { level: 2 }) ? 'active' : ''}`}
            title="Heading 2"
          >
            <Heading2 size={18} />
          </button>
        </div>

        {/* Alignment */}
        <div className="toolbar-group">
          <button
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={`toolbar-button ${editor.isActive({ textAlign: 'left' }) ? 'active' : ''}`}
            title="Align Left"
          >
            <AlignLeft size={18} />
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={`toolbar-button ${editor.isActive({ textAlign: 'center' }) ? 'active' : ''}`}
            title="Align Center"
          >
            <AlignCenter size={18} />
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={`toolbar-button ${editor.isActive({ textAlign: 'right' }) ? 'active' : ''}`}
            title="Align Right"
          >
            <AlignRight size={18} />
          </button>
        </div>

        {/* Lists */}
        <div className="toolbar-group">
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`toolbar-button ${editor.isActive('bulletList') ? 'active' : ''}`}
            title="Bullet List"
          >
            <List size={18} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`toolbar-button ${editor.isActive('orderedList') ? 'active' : ''}`}
            title="Ordered List"
          >
            <ListOrdered size={18} />
          </button>
        </div>

        {/* Table, Image & Math */}
        <div className="toolbar-group">
          <button
            onClick={() => setShowTableDialog(true)}
            className="toolbar-button"
            title="Insert Table"
          >
            <TableIcon size={18} />
          </button>
          <button
            onClick={handleOpenMathDialog}
            className="toolbar-button"
            title="Insert Math Expression"
          >
            <Sigma size={18} />
          </button>
        </div>

        {/* Special Tools: Code Compiler & Paint */}
        <div className="toolbar-group toolbar-group-special">
          {allowCodeCompiler && onToggleCompiler && (
            <button
              onClick={onToggleCompiler}
              className={`toolbar-button-special toolbar-button-compiler ${showCompiler ? 'active' : ''}`}
              title={showCompiler ? 'Hide Code Compiler' : 'Insert Code Compiler'}
            >
              <Code2 size={16} />
              <span>{showCompiler ? 'Hide Compiler' : 'Code Compiler'}</span>
            </button>
          )}
          {allowDrawingCanvas && (
            <button
              onClick={() => setShowPaintDialog(true)}
              className="toolbar-button-special toolbar-button-paint"
              title="Drawing Canvas"
            >
              <Paintbrush size={16} />
              <span>Drawing Canvas</span>
            </button>
          )}
          {allowGraphCalculator && (
            <button
              onClick={() => setShowGraphCalcDialog(true)}
              className="toolbar-button-special toolbar-button-graph"
              title="Graphing Calculator"
            >
              <LineChart size={16} />
              <span>Graph Calculator</span>
            </button>
          )}
        </div>
      </div>

      {/* Editor Content */}
      <div className="editor-content" onClick={(e) => {
        if ((e.target as HTMLElement).tagName === 'IMG') {
          handleImageResize(e as unknown as React.MouseEvent<HTMLImageElement>);
        }
      }}>
        <EditorContent editor={editor} />
      </div>

      {/* Inline Code Compiler */}
      {allowCodeCompiler && showCompiler && onCompilerCodeChange && (
        <div className="border-t-2 border-dashed border-black/30">
          <div className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: '#1e3a8a' }}>
            <div className="flex items-center gap-2">
              <Code2 size={16} className="text-white" />
              <span className="text-sm font-semibold text-white">Code Compiler</span>
            </div>
            <div className="flex items-center gap-1">
              {COMPILER_LANGUAGES.map((lang) => (
                <button
                  key={lang.value}
                  onClick={() => onCompilerLanguageChange?.(lang.value)}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    compilerLanguage === lang.value
                      ? 'bg-white text-black'
                      : 'text-white/70 hover:text-white hover:bg-white/15'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
          <div className="p-3 bg-card">
            <CodeEditorPanel
              language={compilerLanguage}
              value={compilerCode}
              onChange={onCompilerCodeChange}
            />
          </div>
        </div>
      )}

      {/* Table Dialog */}
      {showTableDialog && (
        <TableDialog onInsert={insertTable} onClose={() => setShowTableDialog(false)} />
      )}

      {/* Math Dialog */}
      <MathDialog
        isOpen={showMathDialog}
        onInsert={handleMathInsert}
        onClose={() => setShowMathDialog(false)}
        onLatexChange={setMathLatex}
        latexValue={mathLatex}
      />

      {/* Paint Dialog */}
      {showPaintDialog && (
        <PaintDialog
          isOpen={showPaintDialog}
          onInsert={handlePaintInsert}
          onClose={() => setShowPaintDialog(false)}
        />
      )}

      {/* Graph Calculator Dialog */}
      {showGraphCalcDialog && (
        <GraphCalcDialog
          isOpen={showGraphCalcDialog}
          onInsert={handleGraphCalcInsert}
          onClose={() => setShowGraphCalcDialog(false)}
        />
      )}

      {/* Autocomplete Menu */}
      {suggestions.length > 0 && suggestionProps?.clientRect && (
        <AutocompleteMenu
          suggestions={suggestions}
          selectedIndex={selectedSuggestionIndex}
          onSelect={handleSuggestionSelect}
          onClose={() => {
            setSuggestions([]);
            setSuggestionProps(null);
          }}
          position={{
            top: suggestionProps.clientRect.top,
            left: suggestionProps.clientRect.left,
          }}
        />
      )}
    </div>
  );
});

export default RichTextEditor;
