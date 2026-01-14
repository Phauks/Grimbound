/**
 * Unit tests for InlineEditableText component
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InlineEditableText } from '@/components/Shared/UI/InlineEditableText';

describe('InlineEditableText', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('display mode', () => {
    it('should render value as text', () => {
      render(<InlineEditableText value="Test Name" onSave={vi.fn()} />);

      expect(screen.getByText('Test Name')).toBeInTheDocument();
    });

    it('should render placeholder when value is empty', () => {
      render(<InlineEditableText value="" onSave={vi.fn()} placeholder="Untitled" />);

      expect(screen.getByText('Untitled')).toBeInTheDocument();
    });

    it('should use custom placeholder', () => {
      render(<InlineEditableText value="" onSave={vi.fn()} placeholder="Enter name" />);

      expect(screen.getByText('Enter name')).toBeInTheDocument();
    });

    it('should apply disabled styling when disabled', () => {
      render(<InlineEditableText value="Test" onSave={vi.fn()} disabled />);

      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('entering edit mode', () => {
    it('should enter edit mode on click', async () => {
      const user = userEvent.setup({ delay: null });
      render(<InlineEditableText value="Test Name" onSave={vi.fn()} />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toHaveValue('Test Name');
    });

    it('should enter edit mode on double-click', async () => {
      const user = userEvent.setup({ delay: null });
      render(<InlineEditableText value="Test Name" onSave={vi.fn()} />);

      await user.dblClick(screen.getByRole('button'));

      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should call onEditStart when entering edit mode', async () => {
      const user = userEvent.setup({ delay: null });
      const onEditStart = vi.fn();
      render(<InlineEditableText value="Test" onSave={vi.fn()} onEditStart={onEditStart} />);

      await user.click(screen.getByRole('button'));

      expect(onEditStart).toHaveBeenCalledTimes(1);
    });

    it('should not enter edit mode when disabled', async () => {
      const user = userEvent.setup({ delay: null });
      render(<InlineEditableText value="Test" onSave={vi.fn()} disabled />);

      await user.click(screen.getByRole('button'));

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('should select all text when selectAllOnEdit is true', async () => {
      const user = userEvent.setup({ delay: null });
      render(<InlineEditableText value="Test Name" onSave={vi.fn()} selectAllOnEdit />);

      await user.click(screen.getByRole('button'));

      const input = screen.getByRole('textbox');
      expect(input).toHaveFocus();
    });
  });

  describe('saving', () => {
    it('should call onSave with new value on Enter', async () => {
      const user = userEvent.setup({ delay: null });
      const onSave = vi.fn();
      render(<InlineEditableText value="Old Name" onSave={onSave} />);

      await user.click(screen.getByRole('button'));
      await user.clear(screen.getByRole('textbox'));
      await user.type(screen.getByRole('textbox'), 'New Name{Enter}');

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith('New Name');
      });
    });

    it('should call onSave with new value on blur', async () => {
      const user = userEvent.setup({ delay: null });
      const onSave = vi.fn();
      render(<InlineEditableText value="Old Name" onSave={onSave} />);

      await user.click(screen.getByRole('button'));
      await user.clear(screen.getByRole('textbox'));
      await user.type(screen.getByRole('textbox'), 'New Name');
      fireEvent.blur(screen.getByRole('textbox'));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith('New Name');
      });
    });

    it('should not call onSave when value is unchanged', async () => {
      const user = userEvent.setup({ delay: null });
      const onSave = vi.fn();
      render(<InlineEditableText value="Same Name" onSave={onSave} />);

      await user.click(screen.getByRole('button'));
      await user.type(screen.getByRole('textbox'), '{Enter}');

      expect(onSave).not.toHaveBeenCalled();
    });

    it('should call onEditEnd after saving', async () => {
      const user = userEvent.setup({ delay: null });
      const onEditEnd = vi.fn();
      render(<InlineEditableText value="Old" onSave={vi.fn()} onEditEnd={onEditEnd} />);

      await user.click(screen.getByRole('button'));
      await user.clear(screen.getByRole('textbox'));
      await user.type(screen.getByRole('textbox'), 'New{Enter}');

      await waitFor(() => {
        expect(onEditEnd).toHaveBeenCalledTimes(1);
      });
    });

    it('should trim whitespace from value before saving', async () => {
      const user = userEvent.setup({ delay: null });
      const onSave = vi.fn();
      render(<InlineEditableText value="Test" onSave={onSave} />);

      await user.click(screen.getByRole('button'));
      await user.clear(screen.getByRole('textbox'));
      await user.type(screen.getByRole('textbox'), '  Trimmed  {Enter}');

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith('Trimmed');
      });
    });
  });

  describe('canceling', () => {
    it('should revert value on Escape', async () => {
      const user = userEvent.setup({ delay: null });
      const onSave = vi.fn();
      render(<InlineEditableText value="Original" onSave={onSave} />);

      await user.click(screen.getByRole('button'));
      await user.clear(screen.getByRole('textbox'));
      await user.type(screen.getByRole('textbox'), 'Changed');
      await user.keyboard('{Escape}');

      expect(onSave).not.toHaveBeenCalled();
      expect(screen.getByText('Original')).toBeInTheDocument();
    });

    it('should call onEditEnd when canceling', async () => {
      const user = userEvent.setup({ delay: null });
      const onEditEnd = vi.fn();
      render(<InlineEditableText value="Test" onSave={vi.fn()} onEditEnd={onEditEnd} />);

      await user.click(screen.getByRole('button'));
      await user.keyboard('{Escape}');

      expect(onEditEnd).toHaveBeenCalledTimes(1);
    });
  });

  describe('validation', () => {
    it('should show error when validation fails', async () => {
      const user = userEvent.setup({ delay: null });
      const validate = vi.fn().mockReturnValue('Name is required');
      render(<InlineEditableText value="Test" onSave={vi.fn()} validate={validate} />);

      await user.click(screen.getByRole('button'));
      await user.clear(screen.getByRole('textbox'));
      await user.type(screen.getByRole('textbox'), '{Enter}');

      expect(screen.getByRole('alert')).toHaveTextContent('Name is required');
    });

    it('should not call onSave when validation fails', async () => {
      const user = userEvent.setup({ delay: null });
      const onSave = vi.fn();
      const validate = vi.fn().mockReturnValue('Invalid');
      render(<InlineEditableText value="Test" onSave={onSave} validate={validate} />);

      await user.click(screen.getByRole('button'));
      await user.clear(screen.getByRole('textbox'));
      await user.type(screen.getByRole('textbox'), 'x{Enter}');

      expect(onSave).not.toHaveBeenCalled();
    });

    it('should clear error when user types', async () => {
      const user = userEvent.setup({ delay: null });
      const validate = vi.fn().mockReturnValue('Error');
      render(<InlineEditableText value="Test" onSave={vi.fn()} validate={validate} />);

      await user.click(screen.getByRole('button'));
      await user.clear(screen.getByRole('textbox'));
      await user.type(screen.getByRole('textbox'), '{Enter}');

      expect(screen.getByRole('alert')).toBeInTheDocument();

      validate.mockReturnValue(null);
      await user.type(screen.getByRole('textbox'), 'Valid');

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should call validate with trimmed value', async () => {
      const user = userEvent.setup({ delay: null });
      const validate = vi.fn().mockReturnValue(null);
      render(<InlineEditableText value="Test" onSave={vi.fn()} validate={validate} />);

      await user.click(screen.getByRole('button'));
      await user.clear(screen.getByRole('textbox'));
      await user.type(screen.getByRole('textbox'), '  New  {Enter}');

      expect(validate).toHaveBeenCalledWith('New');
    });
  });

  describe('error handling', () => {
    it('should show error when onSave throws', async () => {
      const user = userEvent.setup({ delay: null });
      const onSave = vi.fn().mockRejectedValue(new Error('Save failed'));
      render(<InlineEditableText value="Test" onSave={onSave} />);

      await user.click(screen.getByRole('button'));
      await user.clear(screen.getByRole('textbox'));
      await user.type(screen.getByRole('textbox'), 'New{Enter}');

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Save failed');
      });
    });

    it('should stay in edit mode when save fails', async () => {
      const user = userEvent.setup({ delay: null });
      const onSave = vi.fn().mockRejectedValue(new Error('Oops'));
      render(<InlineEditableText value="Test" onSave={onSave} />);

      await user.click(screen.getByRole('button'));
      await user.clear(screen.getByRole('textbox'));
      await user.type(screen.getByRole('textbox'), 'New{Enter}');

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });
    });
  });

  describe('maxLength', () => {
    it('should limit input length', async () => {
      const user = userEvent.setup({ delay: null });
      render(<InlineEditableText value="" onSave={vi.fn()} maxLength={5} />);

      await user.click(screen.getByRole('button'));
      await user.type(screen.getByRole('textbox'), 'abcdefgh');

      expect(screen.getByRole('textbox')).toHaveValue('abcde');
    });
  });
});
