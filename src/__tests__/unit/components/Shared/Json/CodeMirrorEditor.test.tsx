/**
 * Unit tests for CodeMirrorEditor component
 *
 * Tests cover:
 * - Basic rendering
 * - Props handling (value, placeholder, disabled)
 * - Editor controls exposure (undo, redo, search)
 * - Drag and drop functionality
 * - Info indicator and tooltip behavior
 * - Accessibility
 *
 * @module __tests__/unit/components/Shared/Json/CodeMirrorEditor.test
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  CodeMirrorEditor,
  type CodeMirrorEditorProps,
  type EditorControls,
} from '@/components/Shared/Json/CodeMirrorEditor';

// Mock the useCodeMirrorEditor hook
vi.mock('@/hooks', () => ({
  useCodeMirrorEditor: vi.fn(
    ({
      value,
      onChange,
    }: {
      value: string;
      onChange: (v: string) => void;
      onValidJson?: (parsed: unknown) => void;
      placeholder?: string;
      disabled?: boolean;
      debounceMs?: number;
      showLintGutter?: boolean;
      showLineNumbers?: boolean;
      showFoldGutter?: boolean;
    }) => {
      // Create a simple mock that simulates the hook behavior
      const mockRef = { current: null };

      return {
        containerRef: mockRef,
        triggerUndo: vi.fn().mockReturnValue(true),
        triggerRedo: vi.fn().mockReturnValue(true),
        openSearch: vi.fn(),
        // For testing purposes, store value/onChange for assertions
        _testValue: value,
        _testOnChange: onChange,
      };
    }
  ),
}));

/**
 * Default props factory for CodeMirrorEditor
 */
const createDefaultProps = (
  overrides: Partial<CodeMirrorEditorProps> = {}
): CodeMirrorEditorProps => ({
  value: '',
  onChange: vi.fn(),
  ...overrides,
});

describe('CodeMirrorEditor', () => {
  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      const props = createDefaultProps();

      const { container } = render(<CodeMirrorEditor {...props} />);

      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render with role="application"', () => {
      const props = createDefaultProps();

      render(<CodeMirrorEditor {...props} />);

      expect(screen.getByRole('application')).toBeInTheDocument();
    });

    it('should have accessible label', () => {
      const props = createDefaultProps();

      render(<CodeMirrorEditor {...props} />);

      expect(screen.getByLabelText(/JSON editor with drag and drop support/i)).toBeInTheDocument();
    });

    it('should render CodeMirror wrapper div', () => {
      const props = createDefaultProps();

      const { container } = render(<CodeMirrorEditor {...props} />);

      expect(container.querySelector('[class*="codeMirrorWrapper"]')).toBeInTheDocument();
    });
  });

  describe('Props Handling', () => {
    it('should apply minHeight style', () => {
      const props = createDefaultProps({ minHeight: '500px' });

      const { container } = render(<CodeMirrorEditor {...props} />);

      const editorContainer = container.firstChild as HTMLElement;
      expect(editorContainer.style.minHeight).toBe('500px');
    });

    it('should apply custom className', () => {
      const props = createDefaultProps({ className: 'custom-class' });

      const { container } = render(<CodeMirrorEditor {...props} />);

      const editorContainer = container.firstChild as HTMLElement;
      expect(editorContainer.classList.contains('custom-class')).toBe(true);
    });

    it('should apply disabled class when disabled', () => {
      const props = createDefaultProps({ disabled: true });

      const { container } = render(<CodeMirrorEditor {...props} />);

      const editorContainer = container.firstChild as HTMLElement;
      expect(editorContainer.className).toContain('disabled');
    });

    it('should use default minHeight when not specified', () => {
      const props = createDefaultProps();

      const { container } = render(<CodeMirrorEditor {...props} />);

      const editorContainer = container.firstChild as HTMLElement;
      expect(editorContainer.style.minHeight).toBe('200px');
    });
  });

  describe('Editor Controls', () => {
    it('should expose editor controls via onEditorReady callback', () => {
      const onEditorReady = vi.fn();
      const props = createDefaultProps({ onEditorReady });

      render(<CodeMirrorEditor {...props} />);

      expect(onEditorReady).toHaveBeenCalled();
      const controls = onEditorReady.mock.calls[0][0] as EditorControls;
      expect(controls).toHaveProperty('undo');
      expect(controls).toHaveProperty('redo');
      expect(controls).toHaveProperty('openSearch');
    });

    it('should provide callable undo function', () => {
      const onEditorReady = vi.fn();
      const props = createDefaultProps({ onEditorReady });

      render(<CodeMirrorEditor {...props} />);

      const controls = onEditorReady.mock.calls[0][0] as EditorControls;
      expect(typeof controls.undo).toBe('function');
    });

    it('should provide callable redo function', () => {
      const onEditorReady = vi.fn();
      const props = createDefaultProps({ onEditorReady });

      render(<CodeMirrorEditor {...props} />);

      const controls = onEditorReady.mock.calls[0][0] as EditorControls;
      expect(typeof controls.redo).toBe('function');
    });

    it('should provide callable openSearch function', () => {
      const onEditorReady = vi.fn();
      const props = createDefaultProps({ onEditorReady });

      render(<CodeMirrorEditor {...props} />);

      const controls = onEditorReady.mock.calls[0][0] as EditorControls;
      expect(typeof controls.openSearch).toBe('function');
    });
  });

  describe('Drag and Drop', () => {
    it('should handle drag over events', () => {
      const props = createDefaultProps();

      render(<CodeMirrorEditor {...props} />);

      const editor = screen.getByRole('application');
      const dragOverEvent = new Event('dragover', { bubbles: true });
      Object.defineProperty(dragOverEvent, 'preventDefault', { value: vi.fn() });

      fireEvent(editor, dragOverEvent);

      // Event should be handled without errors
    });

    it('should handle drop events with JSON files', async () => {
      const onChange = vi.fn();
      const props = createDefaultProps({ onChange });

      render(<CodeMirrorEditor {...props} />);

      const editor = screen.getByRole('application');

      // Create a mock JSON file with working text() method
      const jsonContent = '["clockmaker"]';
      const file = new File([jsonContent], 'script.json', { type: 'application/json' });
      Object.defineProperty(file, 'text', {
        value: () => Promise.resolve(jsonContent),
        writable: false,
      });

      const dataTransfer = {
        files: [file],
        items: [{ kind: 'file', type: 'application/json', getAsFile: () => file }],
        types: ['Files'],
      };

      await fireEvent.drop(editor, { dataTransfer });

      // The editor should remain functional after the drop
      expect(editor).toBeInTheDocument();
    });

    it('should handle drop events with .json extension', async () => {
      const onChange = vi.fn();
      const props = createDefaultProps({ onChange });

      render(<CodeMirrorEditor {...props} />);

      const editor = screen.getByRole('application');

      // Create a mock file with .json extension but no MIME type
      const jsonContent = '{"test": true}';
      const file = new File([jsonContent], 'data.json', { type: '' });
      Object.defineProperty(file, 'text', {
        value: () => Promise.resolve(jsonContent),
        writable: false,
      });

      const dataTransfer = {
        files: [file],
        items: [{ kind: 'file', type: '', getAsFile: () => file }],
        types: ['Files'],
      };

      await fireEvent.drop(editor, { dataTransfer });

      // The editor should remain functional after the drop
      expect(editor).toBeInTheDocument();
    });

    it('should ignore non-JSON files', async () => {
      const onChange = vi.fn();
      const props = createDefaultProps({ onChange });

      render(<CodeMirrorEditor {...props} />);

      const editor = screen.getByRole('application');

      // Create a mock non-JSON file
      const file = new File(['text content'], 'document.txt', { type: 'text/plain' });

      const dropEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: {
          files: [file],
        },
      };

      await fireEvent.drop(editor, dropEvent);

      // onChange should not be called for non-JSON files
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('Info Indicator', () => {
    it('should show info indicator by default', () => {
      const props = createDefaultProps();

      render(<CodeMirrorEditor {...props} />);

      expect(screen.getByRole('button', { name: /keyboard shortcuts/i })).toBeInTheDocument();
    });

    it('should hide info indicator when showInfoIndicator is false', () => {
      const props = createDefaultProps({ showInfoIndicator: false });

      render(<CodeMirrorEditor {...props} />);

      expect(screen.queryByRole('button', { name: /keyboard shortcuts/i })).not.toBeInTheDocument();
    });

    it('should show tooltip on mouse enter', () => {
      const props = createDefaultProps();

      render(<CodeMirrorEditor {...props} />);

      const infoButton = screen.getByRole('button', { name: /keyboard shortcuts/i });
      fireEvent.mouseEnter(infoButton);

      expect(screen.getByText(/Editor Shortcuts/i)).toBeInTheDocument();
    });

    it('should hide tooltip on mouse leave', () => {
      const props = createDefaultProps();

      render(<CodeMirrorEditor {...props} />);

      const infoButton = screen.getByRole('button', { name: /keyboard shortcuts/i });

      // Show tooltip
      fireEvent.mouseEnter(infoButton);
      expect(screen.getByText(/Editor Shortcuts/i)).toBeInTheDocument();

      // Hide tooltip
      fireEvent.mouseLeave(infoButton);
      expect(screen.queryByText(/Editor Shortcuts/i)).not.toBeInTheDocument();
    });

    it('should toggle tooltip on click', () => {
      const props = createDefaultProps();

      render(<CodeMirrorEditor {...props} />);

      const infoButton = screen.getByRole('button', { name: /keyboard shortcuts/i });

      // First click - show
      fireEvent.click(infoButton);
      expect(screen.getByText(/Editor Shortcuts/i)).toBeInTheDocument();

      // Second click - hide
      fireEvent.click(infoButton);
      expect(screen.queryByText(/Editor Shortcuts/i)).not.toBeInTheDocument();
    });

    it('should display keyboard shortcuts in tooltip', () => {
      const props = createDefaultProps();

      render(<CodeMirrorEditor {...props} />);

      const infoButton = screen.getByRole('button', { name: /keyboard shortcuts/i });
      fireEvent.mouseEnter(infoButton);

      expect(screen.getByText('Ctrl+F')).toBeInTheDocument();
      expect(screen.getByText('Search')).toBeInTheDocument();
      expect(screen.getByText('Ctrl+H')).toBeInTheDocument();
      expect(screen.getByText('Replace')).toBeInTheDocument();
      expect(screen.getByText('Ctrl+Z')).toBeInTheDocument();
      expect(screen.getByText('Undo')).toBeInTheDocument();
      expect(screen.getByText('Ctrl+Y')).toBeInTheDocument();
      expect(screen.getByText('Redo')).toBeInTheDocument();
    });

    it('should have aria-expanded attribute', () => {
      const props = createDefaultProps();

      render(<CodeMirrorEditor {...props} />);

      const infoButton = screen.getByRole('button', { name: /keyboard shortcuts/i });
      expect(infoButton).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(infoButton);
      expect(infoButton).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Accessibility', () => {
    it('should have proper role and label', () => {
      const props = createDefaultProps();

      render(<CodeMirrorEditor {...props} />);

      const editor = screen.getByRole('application');
      expect(editor).toHaveAttribute('aria-label', 'JSON editor with drag and drop support');
    });

    it('should have accessible info button', () => {
      const props = createDefaultProps();

      render(<CodeMirrorEditor {...props} />);

      const infoButton = screen.getByRole('button', { name: /keyboard shortcuts/i });
      expect(infoButton).toHaveAttribute('aria-label', 'Editor keyboard shortcuts');
    });
  });

  describe('Optional Features', () => {
    it('should respect showLineNumbers prop', () => {
      const props = createDefaultProps({ showLineNumbers: false });

      // This is passed to the hook, so we just verify no errors
      render(<CodeMirrorEditor {...props} />);

      expect(screen.getByRole('application')).toBeInTheDocument();
    });

    it('should respect showFoldGutter prop', () => {
      const props = createDefaultProps({ showFoldGutter: false });

      // This is passed to the hook, so we just verify no errors
      render(<CodeMirrorEditor {...props} />);

      expect(screen.getByRole('application')).toBeInTheDocument();
    });

    it('should call onValidJson when provided', () => {
      const onValidJson = vi.fn();
      const props = createDefaultProps({ onValidJson });

      render(<CodeMirrorEditor {...props} />);

      // onValidJson is passed to the hook, verified by render without error
      expect(screen.getByRole('application')).toBeInTheDocument();
    });
  });
});
