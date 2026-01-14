/**
 * Unit tests for JsonEditorPanel component
 *
 * Tests cover:
 * - Basic rendering
 * - Props pass-through to CodeMirrorEditor
 * - Default props behavior
 * - EditorControls exposure
 *
 * JsonEditorPanel is a thin wrapper around CodeMirrorEditor,
 * so tests focus on prop forwarding and default behavior.
 *
 * @module __tests__/unit/components/Shared/Json/JsonEditorPanel.test
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  JsonEditorPanel,
  type JsonEditorPanelProps,
} from '@/components/Shared/Json/JsonEditorPanel';

// Mock the CodeMirrorEditor to verify prop forwarding
vi.mock('@/components/Shared/Json/CodeMirrorEditor', () => ({
  CodeMirrorEditor: vi.fn(
    ({
      value,
      onChange: _onChange,
      onValidJson,
      placeholder,
      debounceMs,
      minHeight,
      className,
      disabled,
      onEditorReady,
    }: {
      value: string;
      onChange: (v: string) => void;
      onValidJson?: (parsed: unknown) => void;
      placeholder?: string;
      debounceMs?: number;
      minHeight?: string;
      className?: string;
      disabled?: boolean;
      onEditorReady?: (controls: {
        undo: () => boolean;
        redo: () => boolean;
        openSearch: () => void;
      }) => void;
    }) => {
      // Call onEditorReady if provided
      if (onEditorReady) {
        onEditorReady({
          undo: () => true,
          redo: () => true,
          openSearch: () => {},
        });
      }

      return (
        <div
          data-testid="mock-codemirror"
          data-value={value}
          data-placeholder={placeholder}
          data-debounce-ms={debounceMs}
          data-min-height={minHeight}
          data-class-name={className}
          data-disabled={disabled}
          data-on-valid-json={onValidJson ? 'provided' : 'not-provided'}
          data-on-change="provided"
        >
          Mock CodeMirror Editor
        </div>
      );
    }
  ),
}));

/**
 * Default props factory for JsonEditorPanel
 */
const createDefaultProps = (
  overrides: Partial<JsonEditorPanelProps> = {}
): JsonEditorPanelProps => ({
  value: '',
  onChange: vi.fn(),
  ...overrides,
});

describe('JsonEditorPanel', () => {
  describe('Basic Rendering', () => {
    it('should render CodeMirrorEditor', () => {
      const props = createDefaultProps();

      render(<JsonEditorPanel {...props} />);

      expect(screen.getByTestId('mock-codemirror')).toBeInTheDocument();
    });

    it('should render with default placeholder', () => {
      const props = createDefaultProps();

      render(<JsonEditorPanel {...props} />);

      const editor = screen.getByTestId('mock-codemirror');
      expect(editor.dataset.placeholder).toBe('Enter JSON...');
    });

    it('should render with default minHeight', () => {
      const props = createDefaultProps();

      render(<JsonEditorPanel {...props} />);

      const editor = screen.getByTestId('mock-codemirror');
      expect(editor.dataset.minHeight).toBe('200px');
    });

    it('should render with default debounceMs', () => {
      const props = createDefaultProps();

      render(<JsonEditorPanel {...props} />);

      const editor = screen.getByTestId('mock-codemirror');
      expect(editor.dataset.debounceMs).toBe('300');
    });

    it('should render as enabled by default', () => {
      const props = createDefaultProps();

      render(<JsonEditorPanel {...props} />);

      const editor = screen.getByTestId('mock-codemirror');
      expect(editor.dataset.disabled).toBe('false');
    });
  });

  describe('Props Forwarding', () => {
    it('should forward value prop', () => {
      const props = createDefaultProps({ value: '["clockmaker"]' });

      render(<JsonEditorPanel {...props} />);

      const editor = screen.getByTestId('mock-codemirror');
      expect(editor.dataset.value).toBe('["clockmaker"]');
    });

    it('should forward onChange prop', () => {
      const onChange = vi.fn();
      const props = createDefaultProps({ onChange });

      render(<JsonEditorPanel {...props} />);

      const editor = screen.getByTestId('mock-codemirror');
      expect(editor.dataset.onChange).toBe('provided');
    });

    it('should forward onValidJson prop', () => {
      const onValidJson = vi.fn();
      const props = createDefaultProps({ onValidJson });

      render(<JsonEditorPanel {...props} />);

      const editor = screen.getByTestId('mock-codemirror');
      expect(editor.dataset.onValidJson).toBe('provided');
    });

    it('should forward custom placeholder', () => {
      const props = createDefaultProps({ placeholder: 'Paste JSON here...' });

      render(<JsonEditorPanel {...props} />);

      const editor = screen.getByTestId('mock-codemirror');
      expect(editor.dataset.placeholder).toBe('Paste JSON here...');
    });

    it('should forward custom debounceMs', () => {
      const props = createDefaultProps({ debounceMs: 500 });

      render(<JsonEditorPanel {...props} />);

      const editor = screen.getByTestId('mock-codemirror');
      expect(editor.dataset.debounceMs).toBe('500');
    });

    it('should forward custom minHeight', () => {
      const props = createDefaultProps({ minHeight: '400px' });

      render(<JsonEditorPanel {...props} />);

      const editor = screen.getByTestId('mock-codemirror');
      expect(editor.dataset.minHeight).toBe('400px');
    });

    it('should forward className', () => {
      const props = createDefaultProps({ className: 'custom-editor' });

      render(<JsonEditorPanel {...props} />);

      const editor = screen.getByTestId('mock-codemirror');
      expect(editor.dataset.className).toBe('custom-editor');
    });

    it('should forward disabled prop', () => {
      const props = createDefaultProps({ disabled: true });

      render(<JsonEditorPanel {...props} />);

      const editor = screen.getByTestId('mock-codemirror');
      expect(editor.dataset.disabled).toBe('true');
    });
  });

  describe('EditorControls', () => {
    it('should forward onEditorReady and receive controls', () => {
      const onEditorReady = vi.fn();
      const props = createDefaultProps({ onEditorReady });

      render(<JsonEditorPanel {...props} />);

      expect(onEditorReady).toHaveBeenCalled();
      const controls = onEditorReady.mock.calls[0][0];
      expect(controls).toHaveProperty('undo');
      expect(controls).toHaveProperty('redo');
      expect(controls).toHaveProperty('openSearch');
    });

    it('should provide callable undo function', () => {
      const onEditorReady = vi.fn();
      const props = createDefaultProps({ onEditorReady });

      render(<JsonEditorPanel {...props} />);

      const controls = onEditorReady.mock.calls[0][0];
      expect(typeof controls.undo).toBe('function');
      expect(controls.undo()).toBe(true);
    });

    it('should provide callable redo function', () => {
      const onEditorReady = vi.fn();
      const props = createDefaultProps({ onEditorReady });

      render(<JsonEditorPanel {...props} />);

      const controls = onEditorReady.mock.calls[0][0];
      expect(typeof controls.redo).toBe('function');
      expect(controls.redo()).toBe(true);
    });

    it('should provide callable openSearch function', () => {
      const onEditorReady = vi.fn();
      const props = createDefaultProps({ onEditorReady });

      render(<JsonEditorPanel {...props} />);

      const controls = onEditorReady.mock.calls[0][0];
      expect(typeof controls.openSearch).toBe('function');
    });
  });

  describe('Unused Props', () => {
    it('should accept showError prop without error', () => {
      const props = createDefaultProps({ showError: true });

      // showError is documented as not used with CodeMirror
      expect(() => render(<JsonEditorPanel {...props} />)).not.toThrow();
    });
  });

  describe('Empty and Edge Cases', () => {
    it('should handle empty string value', () => {
      const props = createDefaultProps({ value: '' });

      render(<JsonEditorPanel {...props} />);

      const editor = screen.getByTestId('mock-codemirror');
      expect(editor.dataset.value).toBe('');
    });

    it('should handle large JSON value', () => {
      const largeJson = JSON.stringify(Array.from({ length: 100 }, (_, i) => `item-${i}`));
      const props = createDefaultProps({ value: largeJson });

      render(<JsonEditorPanel {...props} />);

      const editor = screen.getByTestId('mock-codemirror');
      expect(editor.dataset.value).toBe(largeJson);
    });

    it('should handle invalid JSON value', () => {
      const props = createDefaultProps({ value: '{ invalid json' });

      render(<JsonEditorPanel {...props} />);

      const editor = screen.getByTestId('mock-codemirror');
      expect(editor.dataset.value).toBe('{ invalid json');
    });

    it('should handle undefined optional props', () => {
      const props = createDefaultProps({
        onValidJson: undefined,
        onEditorReady: undefined,
        className: undefined,
      });

      expect(() => render(<JsonEditorPanel {...props} />)).not.toThrow();
    });
  });
});
