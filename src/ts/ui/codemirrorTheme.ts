/**
 * CodeMirror 6 Theme Integration
 *
 * Creates CodeMirror themes that use CSS variables from the application's theme system.
 * This allows the editor to adapt to theme changes dynamically.
 *
 * Features:
 * - CSS variable integration for dynamic theming
 * - Line numbers with custom styling
 * - Fold gutter for collapsible JSON blocks
 * - Bracket matching with highlighting
 * - Active line highlighting
 * - Search panel styling
 * - Lint markers with tooltips
 */

import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';

/**
 * Creates the base CodeMirror theme with CSS variable integration.
 * This handles the editor chrome (background, cursor, selection, etc.)
 */
export function createBaseTheme(): Extension {
  return EditorView.theme(
    {
      // Main editor container
      '&': {
        backgroundColor: 'var(--bg-input)',
        color: 'var(--text-primary)',
        // No border-radius here - container handles it
      },

      // Content area
      '.cm-content': {
        caretColor: 'var(--text-primary)',
        fontFamily: '"Consolas", "Monaco", monospace',
        fontSize: '0.875rem',
        lineHeight: '1.5',
        padding: 'var(--spacing-md)',
      },

      // Cursor
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: 'var(--text-primary)',
        borderLeftWidth: '2px',
      },

      // Focus state - remove outline, container handles focus via :focus-within
      '&.cm-focused': {
        outline: 'none',
      },

      // Selection
      '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
        backgroundColor: 'var(--bg-hover)',
      },

      // Active line highlighting
      '.cm-activeLine': {
        backgroundColor: 'rgba(var(--accent-rgb, 99, 102, 241), 0.08)',
      },

      // Active line gutter (line number highlight)
      '.cm-activeLineGutter': {
        backgroundColor: 'rgba(var(--accent-rgb, 99, 102, 241), 0.12)',
      },

      // Gutters (line numbers, fold, lint)
      '.cm-gutters': {
        backgroundColor: 'var(--bg-input)',
        borderRight: '1px solid var(--border-color)',
        color: 'var(--text-muted)',
        borderTopLeftRadius: 'var(--border-radius)',
        borderBottomLeftRadius: 'var(--border-radius)',
      },

      // Line numbers gutter
      '.cm-gutter.cm-lineNumbers': {
        minWidth: '40px',
      },

      '.cm-gutter.cm-lineNumbers .cm-gutterElement': {
        padding: '0 8px 0 8px',
        minWidth: '40px',
        textAlign: 'right',
        fontSize: '0.75rem',
      },

      // Fold gutter
      '.cm-gutter.cm-foldGutter': {
        minWidth: '16px',
      },

      '.cm-gutter.cm-foldGutter .cm-gutterElement': {
        padding: '0 2px',
        cursor: 'pointer',
        color: 'var(--text-muted)',
        transition: 'color 0.15s ease',
      },

      '.cm-gutter.cm-foldGutter .cm-gutterElement:hover': {
        color: 'var(--text-primary)',
      },

      // Lint gutter - hide markers when content is empty
      '.cm-gutter.cm-gutter-lint': {
        minWidth: '10px',
      },

      '.cm-gutter.cm-gutter-lint .cm-gutterElement': {
        padding: '0 2px',
      },

      // Placeholder text
      '.cm-placeholder': {
        color: 'var(--text-muted)',
        fontStyle: 'italic',
      },

      // Scrollbar styling
      '.cm-scroller': {
        overflow: 'auto',
        fontFamily: '"Consolas", "Monaco", monospace',
        borderRadius: 'var(--border-radius)',
      },

      // Match brackets
      '&.cm-focused .cm-matchingBracket': {
        backgroundColor: 'rgba(var(--accent-rgb, 99, 102, 241), 0.3)',
        outline: '1px solid var(--color-accent)',
        borderRadius: '2px',
      },

      // Non-matching bracket
      '&.cm-focused .cm-nonmatchingBracket': {
        backgroundColor: 'rgba(239, 68, 68, 0.3)',
        outline: '1px solid var(--danger-color, #ef4444)',
        borderRadius: '2px',
      },

      // Folded placeholder
      '.cm-foldPlaceholder': {
        backgroundColor: 'var(--bg-hover)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius)',
        padding: '0 4px',
        margin: '0 2px',
        color: 'var(--text-muted)',
        cursor: 'pointer',
      },

      '.cm-foldPlaceholder:hover': {
        backgroundColor: 'var(--bg-card)',
        color: 'var(--text-primary)',
      },

      // Lint markers (error/warning underlines)
      '.cm-lintRange-error': {
        backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="6" height="3"><path d="M0 3L3 0L6 3" fill="none" stroke="%23ef4444" stroke-width="1"/></svg>')`,
        backgroundPosition: 'left bottom',
        backgroundRepeat: 'repeat-x',
      },

      '.cm-lintRange-warning': {
        backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="6" height="3"><path d="M0 3L3 0L6 3" fill="none" stroke="%23f59e0b" stroke-width="1"/></svg>')`,
        backgroundPosition: 'left bottom',
        backgroundRepeat: 'repeat-x',
      },

      // Lint gutter markers - styled as circles
      '.cm-lint-marker-error': {
        content: '""',
      },

      '.cm-lint-marker-warning': {
        content: '""',
      },

      // Tooltip for lint errors
      '.cm-tooltip': {
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      },

      '.cm-tooltip .cm-tooltip-lint': {
        padding: 'var(--spacing-sm)',
      },

      '.cm-diagnostic': {
        padding: 'var(--spacing-sm) var(--spacing-md)',
        borderLeft: '3px solid',
      },

      '.cm-diagnostic-error': {
        borderLeftColor: 'var(--danger-color, #ef4444)',
      },

      '.cm-diagnostic-warning': {
        borderLeftColor: 'var(--warning-color, #f59e0b)',
      },

      // Search panel styling
      '.cm-panel.cm-search': {
        backgroundColor: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-color)',
        padding: 'var(--spacing-sm) var(--spacing-md)',
        gap: 'var(--spacing-sm)',
      },

      '.cm-panel.cm-search input': {
        backgroundColor: 'var(--bg-input)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius)',
        padding: '4px 8px',
        fontSize: '0.875rem',
      },

      '.cm-panel.cm-search input:focus': {
        borderColor: 'var(--color-accent)',
        outline: 'none',
      },

      '.cm-panel.cm-search button': {
        backgroundColor: 'var(--bg-hover)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius)',
        padding: '4px 8px',
        cursor: 'pointer',
        fontSize: '0.75rem',
      },

      '.cm-panel.cm-search button:hover': {
        backgroundColor: 'var(--bg-card)',
      },

      '.cm-panel.cm-search label': {
        color: 'var(--text-secondary)',
        fontSize: '0.75rem',
      },

      '.cm-searchMatch': {
        backgroundColor: 'rgba(var(--accent-rgb, 99, 102, 241), 0.3)',
        borderRadius: '2px',
      },

      '.cm-searchMatch-selected': {
        backgroundColor: 'rgba(var(--accent-rgb, 99, 102, 241), 0.5)',
      },

      // Panels close button
      '.cm-panel button[name="close"]': {
        backgroundColor: 'transparent',
        border: 'none',
        color: 'var(--text-muted)',
        cursor: 'pointer',
        padding: '2px 6px',
      },

      '.cm-panel button[name="close"]:hover': {
        color: 'var(--text-primary)',
      },
    },
    { dark: true }
  );
}

/**
 * Creates the syntax highlighting style for JSON.
 * Uses CSS variables to integrate with the application's theme system.
 */
export function createSyntaxHighlighting(): Extension {
  const highlightStyle = HighlightStyle.define([
    // JSON property names (keys)
    {
      tag: tags.propertyName,
      color: 'var(--cm-json-key, var(--color-accent))',
    },

    // String values
    {
      tag: tags.string,
      color: 'var(--cm-json-string, var(--text-secondary))',
    },

    // Number values
    {
      tag: tags.number,
      color: 'var(--cm-json-number, var(--color-accent-light))',
    },

    // Boolean values (true/false)
    {
      tag: tags.bool,
      color: 'var(--cm-json-boolean, var(--color-primary-light))',
    },

    // Null values
    {
      tag: tags.null,
      color: 'var(--cm-json-null, var(--text-muted))',
    },

    // Punctuation (brackets, commas, colons)
    {
      tag: tags.punctuation,
      color: 'var(--text-primary)',
    },

    // Invalid/error tokens
    {
      tag: tags.invalid,
      color: 'var(--danger-color, #ef4444)',
      textDecoration: 'underline wavy',
    },
  ]);

  return syntaxHighlighting(highlightStyle);
}

/**
 * Creates the complete CodeMirror theme extension.
 * Combines base theme and syntax highlighting.
 */
export function createCodeMirrorTheme(): Extension[] {
  return [createBaseTheme(), createSyntaxHighlighting()];
}
