/**
 * useCodeMirrorEditor Hook
 *
 * React hook for managing a CodeMirror 6 editor instance.
 * Handles controlled component pattern, theme synchronization,
 * and editor lifecycle management.
 *
 * Features:
 * - Line numbers with active line highlighting
 * - Fold gutter for collapsing JSON blocks
 * - Bracket matching
 * - Search and replace (Ctrl+F / Ctrl+H)
 * - JSON syntax highlighting and linting
 * - Undo/redo history
 *
 * @module hooks/editors/useCodeMirrorEditor
 */

import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
  redo,
  undo,
} from '@codemirror/commands';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { bracketMatching, foldGutter, foldKeymap } from '@codemirror/language';
import { linter, lintGutter } from '@codemirror/lint';
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search';
import { Compartment, EditorState, type Extension } from '@codemirror/state';
import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder as placeholderExtension,
  rectangularSelection,
} from '@codemirror/view';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { createCodeMirrorTheme } from '@/ts/ui/codemirrorTheme.js';

export interface UseCodeMirrorEditorOptions {
  /** Initial/controlled value */
  value: string;
  /** Called when the editor content changes */
  onChange?: (value: string) => void;
  /** Called when valid JSON is detected (debounced) */
  onValidJson?: (parsed: unknown) => void;
  /** Placeholder text shown when editor is empty */
  placeholder?: string;
  /** Whether the editor is read-only */
  disabled?: boolean;
  /** Debounce delay for JSON validation in ms */
  debounceMs?: number;
  /** Whether to show lint gutter markers */
  showLintGutter?: boolean;
  /** Whether to show line numbers (default: true) */
  showLineNumbers?: boolean;
  /** Whether to show fold gutter (default: true) */
  showFoldGutter?: boolean;
}

export interface UseCodeMirrorEditorResult {
  /** Ref to attach to the container element */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** The EditorView instance (may be null before mount) */
  view: EditorView | null;
  /** Trigger undo programmatically */
  triggerUndo: () => boolean;
  /** Trigger redo programmatically */
  triggerRedo: () => boolean;
  /** Check if undo is available */
  canUndo: boolean;
  /** Check if redo is available */
  canRedo: boolean;
  /** Open the search panel */
  openSearch: () => void;
}

/**
 * Hook for managing a CodeMirror 6 editor with JSON support.
 *
 * Features:
 * - Controlled component pattern (syncs external value)
 * - JSON syntax highlighting and linting
 * - Line numbers with active line highlighting
 * - Fold gutter for collapsing JSON blocks
 * - Bracket matching with visual feedback
 * - Search and replace (Ctrl+F / Ctrl+H)
 * - Theme integration with application themes
 * - Undo/redo history
 * - Debounced JSON validation
 */
export function useCodeMirrorEditor(
  options: UseCodeMirrorEditorOptions
): UseCodeMirrorEditorResult {
  const {
    value,
    onChange,
    onValidJson,
    placeholder = '',
    disabled = false,
    debounceMs = 300,
    showLintGutter = true,
    showLineNumbers = true,
    showFoldGutter = true,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isExternalUpdate = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Store callbacks in refs to avoid stale closures in the editor
  const onChangeRef = useRef(onChange);
  const onValidJsonRef = useRef(onValidJson);
  onChangeRef.current = onChange;
  onValidJsonRef.current = onValidJson;

  // Compartments for dynamic reconfiguration
  const themeCompartment = useRef(new Compartment());
  const readOnlyCompartment = useRef(new Compartment());
  const placeholderCompartment = useRef(new Compartment());

  // Get current theme from context
  const { currentThemeId } = useTheme();

  // Create the update listener extension - uses refs to avoid stale closures
  const updateListener = useMemo(() => {
    return EditorView.updateListener.of((update) => {
      if (update.docChanged && !isExternalUpdate.current) {
        const newValue = update.state.doc.toString();
        // Use ref to always call current onChange
        onChangeRef.current?.(newValue);

        // Debounced JSON validation
        if (onValidJsonRef.current) {
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }
          debounceTimerRef.current = setTimeout(() => {
            try {
              const parsed = JSON.parse(newValue);
              onValidJsonRef.current?.(parsed);
            } catch {
              // Invalid JSON, don't call onValidJson
            }
          }, debounceMs);
        }
      }
    });
  }, [debounceMs]); // Only depends on debounceMs now, callbacks accessed via refs

  // Create a custom JSON linter that doesn't show errors for empty content
  const customJsonLinter = useMemo(() => {
    return linter(
      (view) => {
        const content = view.state.doc.toString().trim();
        // Don't lint empty content - no annoying errors when editor is empty
        if (!content) return [];
        // Use the built-in JSON parser for non-empty content
        return jsonParseLinter()(view);
      },
      { delay: debounceMs }
    );
  }, [debounceMs]);

  // Create the editor - intentionally runs only on mount
  // Updates to value, theme, disabled, and placeholder are handled via compartments in separate useEffects
  // biome-ignore lint/correctness/useExhaustiveDependencies: Intentional mount-only effect - compartments handle dynamic updates
  useEffect(() => {
    if (!containerRef.current) return;

    // Build extensions
    const extensions: Extension[] = [
      // JSON language support
      json(),

      // Custom linting that ignores empty content
      customJsonLinter,

      // Theme
      themeCompartment.current.of(createCodeMirrorTheme()),

      // Read-only state
      readOnlyCompartment.current.of([
        EditorState.readOnly.of(disabled),
        EditorView.editable.of(!disabled),
      ]),

      // Placeholder
      placeholderCompartment.current.of(placeholder ? placeholderExtension(placeholder) : []),

      // History for undo/redo
      history(),

      // Bracket matching with visual feedback
      bracketMatching(),

      // Search functionality (Ctrl+F, Ctrl+H)
      search({ top: true }),
      highlightSelectionMatches(),

      // Active line highlighting
      highlightActiveLine(),
      highlightActiveLineGutter(),

      // Selection enhancements
      drawSelection(),
      dropCursor(),
      rectangularSelection(),
      crosshairCursor(),

      // Keymaps (order matters - more specific first)
      keymap.of([
        ...searchKeymap,
        ...foldKeymap,
        ...historyKeymap,
        indentWithTab,
        ...defaultKeymap,
      ]),

      // Update listener
      updateListener,

      // Line wrapping
      EditorView.lineWrapping,
    ];

    // Add line numbers if enabled - with click-to-select-line support
    if (showLineNumbers) {
      extensions.push(
        lineNumbers({
          domEventHandlers: {
            mousedown(view, line, event) {
              // Select the entire line when clicking on line number
              const lineStart = line.from;
              const lineEnd = line.to;
              const mouseEvent = event as MouseEvent;

              // If shift is held, extend selection from current anchor
              if (mouseEvent.shiftKey) {
                const anchor = view.state.selection.main.anchor;
                view.dispatch({
                  selection: { anchor, head: lineEnd },
                  scrollIntoView: true,
                });
              } else {
                // Select the entire line (including newline if not last line)
                const docLength = view.state.doc.length;
                const selectEnd = lineEnd < docLength ? lineEnd + 1 : lineEnd;
                view.dispatch({
                  selection: { anchor: lineStart, head: selectEnd },
                  scrollIntoView: true,
                });
              }

              // Focus the editor
              view.focus();

              // Prevent default to avoid text selection issues
              return true;
            },
          },
        })
      );
    }

    // Add fold gutter if enabled
    if (showFoldGutter) {
      extensions.push(
        foldGutter({
          openText: '▼',
          closedText: '▶',
        })
      );
    }

    // Add lint gutter if enabled
    if (showLintGutter) {
      extensions.push(lintGutter());
    }

    // Create initial state
    const state = EditorState.create({
      doc: value,
      extensions,
    });

    // Create view
    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Sync external value changes to editor
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentDoc = view.state.doc.toString();
    if (value !== currentDoc) {
      isExternalUpdate.current = true;
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value },
      });
      isExternalUpdate.current = false;
    }
  }, [value]);

  // Update theme when it changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: currentThemeId triggers the effect, theme computed inside
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    view.dispatch({
      effects: themeCompartment.current.reconfigure(createCodeMirrorTheme()),
    });
  }, [currentThemeId]);

  // Update disabled state
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    view.dispatch({
      effects: readOnlyCompartment.current.reconfigure([
        EditorState.readOnly.of(disabled),
        EditorView.editable.of(!disabled),
      ]),
    });
  }, [disabled]);

  // Update placeholder
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    view.dispatch({
      effects: placeholderCompartment.current.reconfigure(
        placeholder ? placeholderExtension(placeholder) : []
      ),
    });
  }, [placeholder]);

  // Undo/redo handlers
  const triggerUndo = useCallback(() => {
    const view = viewRef.current;
    if (!view) return false;
    return undo(view);
  }, []);

  const triggerRedo = useCallback(() => {
    const view = viewRef.current;
    if (!view) return false;
    return redo(view);
  }, []);

  // Open search panel programmatically
  const openSearch = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;
    // The search keymap includes openSearchPanel
    // We can dispatch the command directly
    import('@codemirror/search').then(({ openSearchPanel }) => {
      openSearchPanel(view);
    });
  }, []);

  // Check undo/redo availability (simplified - always return true if view exists)
  // CodeMirror manages this internally, but we expose it for UI consistency
  const canUndo = viewRef.current !== null;
  const canRedo = viewRef.current !== null;

  return {
    containerRef,
    view: viewRef.current,
    triggerUndo,
    triggerRedo,
    canUndo,
    canRedo,
    openSearch,
  };
}
