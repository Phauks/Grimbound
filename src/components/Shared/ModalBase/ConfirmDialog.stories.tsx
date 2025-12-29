import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { Button } from '@/components/Shared/UI/Button';
import { ConfirmDialog } from './ConfirmDialog';

/**
 * The ConfirmDialog component is a specialized modal for confirmation dialogs.
 * It includes optional warning and error displays, and supports loading states.
 *
 * ## Usage Guidelines
 *
 * - Use `variant="danger"` for destructive actions (delete, remove)
 * - Use `variant="default"` for non-destructive confirmations
 * - Provide a `warning` message for irreversible actions
 * - Set `loading` during async operations to prevent double-submission
 */
const meta: Meta<typeof ConfirmDialog> = {
  title: 'Components/ModalBase/ConfirmDialog',
  component: ConfirmDialog,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Specialized modal for confirmation dialogs with warning display, error handling, and loading states.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'danger'],
      description: 'Visual variant affecting confirm button',
      table: { defaultValue: { summary: 'default' } },
    },
    title: {
      control: 'text',
      description: 'Dialog title',
    },
    message: {
      control: 'text',
      description: 'Confirmation message',
    },
    confirmText: {
      control: 'text',
      description: 'Text for confirm button',
      table: { defaultValue: { summary: 'Confirm' } },
    },
    cancelText: {
      control: 'text',
      description: 'Text for cancel button',
      table: { defaultValue: { summary: 'Cancel' } },
    },
    warning: {
      control: 'text',
      description: 'Optional warning message',
    },
    error: {
      control: 'text',
      description: 'Optional error message',
    },
    loading: {
      control: 'boolean',
      description: 'Whether action is in progress',
    },
  },
  args: {
    onClose: fn(),
    onConfirm: fn(),
    isOpen: true,
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================
// Basic Stories
// ============================================

/**
 * Default confirmation dialog.
 */
export const Default: Story = {
  args: {
    title: 'Apply Preset',
    message:
      'Are you sure you want to apply this preset? This will overwrite your current settings.',
  },
};

/**
 * Interactive confirmation dialog.
 */
export const Interactive: Story = {
  render: function Render() {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Show Confirm</Button>
        <ConfirmDialog
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onConfirm={() => {
            alert('Confirmed!');
            setIsOpen(false);
          }}
          title="Apply Preset"
          message="Are you sure you want to apply this preset?"
        />
      </>
    );
  },
};

// ============================================
// Variants
// ============================================

/**
 * Default variant for non-destructive confirmations.
 */
export const DefaultVariant: Story = {
  args: {
    variant: 'default',
    title: 'Save Changes',
    message: 'Do you want to save your changes before leaving?',
    confirmText: 'Save',
  },
};

/**
 * Danger variant for destructive actions.
 */
export const DangerVariant: Story = {
  args: {
    variant: 'danger',
    title: 'Delete Character',
    message: 'Are you sure you want to delete this character?',
    confirmText: 'Delete',
  },
};

// ============================================
// With Warning
// ============================================

/**
 * Confirmation with a warning message.
 */
export const WithWarning: Story = {
  args: {
    variant: 'danger',
    title: 'Delete Project',
    message: 'Are you sure you want to delete this project?',
    confirmText: 'Delete Project',
    warning:
      'This action cannot be undone. All characters, settings, and history will be permanently deleted.',
  },
};

/**
 * Non-destructive confirmation with warning.
 */
export const WithWarningDefault: Story = {
  args: {
    variant: 'default',
    title: 'Reset Settings',
    message: 'Are you sure you want to reset all settings to defaults?',
    confirmText: 'Reset',
    warning: 'Your custom presets will be preserved, but all other settings will be reset.',
  },
};

// ============================================
// With Error
// ============================================

/**
 * Confirmation showing an error after a failed attempt.
 */
export const WithError: Story = {
  args: {
    variant: 'danger',
    title: 'Delete Project',
    message: 'Are you sure you want to delete this project?',
    confirmText: 'Delete',
    error: 'Failed to delete project. Please try again.',
  },
};

/**
 * Confirmation with both warning and error.
 */
export const WithWarningAndError: Story = {
  args: {
    variant: 'danger',
    title: 'Delete Project',
    message: 'Are you sure you want to delete this project?',
    confirmText: 'Retry Delete',
    warning: 'This action cannot be undone.',
    error: 'Network error. Please check your connection.',
  },
};

// ============================================
// Loading State
// ============================================

/**
 * Confirmation in loading state.
 */
export const Loading: Story = {
  args: {
    variant: 'danger',
    title: 'Delete Project',
    message: 'Are you sure you want to delete this project?',
    confirmText: 'Delete',
    loading: true,
    loadingText: 'Deleting...',
  },
};

/**
 * Interactive loading example.
 */
export const InteractiveLoading: Story = {
  render: function Render() {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = async () => {
      setLoading(true);
      setError(null);
      // Simulate async operation
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // Simulate random failure
      if (Math.random() > 0.5) {
        setError('Failed to delete. Please try again.');
        setLoading(false);
      } else {
        setLoading(false);
        setIsOpen(false);
      }
    };

    return (
      <>
        <Button variant="danger" onClick={() => setIsOpen(true)}>
          Delete Project
        </Button>
        <ConfirmDialog
          isOpen={isOpen}
          onClose={() => {
            setIsOpen(false);
            setError(null);
          }}
          onConfirm={handleConfirm}
          title="Delete Project"
          message="Are you sure you want to delete this project?"
          variant="danger"
          confirmText="Delete"
          loading={loading}
          loadingText="Deleting..."
          warning="This action cannot be undone."
          error={error}
        />
      </>
    );
  },
};

// ============================================
// Custom Button Text
// ============================================

/**
 * Custom button labels.
 */
export const CustomButtonText: Story = {
  args: {
    title: 'Discard Changes',
    message: 'You have unsaved changes. Do you want to discard them?',
    confirmText: 'Discard',
    cancelText: 'Keep Editing',
  },
};

/**
 * Logout confirmation with custom text.
 */
export const LogoutConfirmation: Story = {
  args: {
    title: 'Sign Out',
    message: 'Are you sure you want to sign out?',
    confirmText: 'Sign Out',
    cancelText: 'Stay Signed In',
  },
};

// ============================================
// Use Cases
// ============================================

/**
 * Overwrite preset confirmation.
 */
export const OverwritePreset: Story = {
  args: {
    title: 'Overwrite Preset',
    message: 'A preset with this name already exists.',
    confirmText: 'Overwrite',
    cancelText: 'Keep Both',
    warning: 'The existing preset will be replaced with your current settings.',
  },
};

/**
 * Clear all tokens confirmation.
 */
export const ClearTokens: Story = {
  args: {
    variant: 'danger',
    title: 'Clear All Tokens',
    message: 'Are you sure you want to remove all tokens from the export queue?',
    confirmText: 'Clear All',
    warning: 'You will need to regenerate tokens if you want to export them again.',
  },
};

// ============================================
// Showcase
// ============================================

/**
 * Various confirmation scenarios.
 */
export const Showcase: Story = {
  render: function Render() {
    const [dialog, setDialog] = useState<string | null>(null);

    return (
      <>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Button onClick={() => setDialog('save')}>Save Confirmation</Button>
          <Button onClick={() => setDialog('delete')}>Delete Confirmation</Button>
          <Button onClick={() => setDialog('warning')}>With Warning</Button>
          <Button onClick={() => setDialog('error')}>With Error</Button>
        </div>

        <ConfirmDialog
          isOpen={dialog === 'save'}
          onClose={() => setDialog(null)}
          onConfirm={() => setDialog(null)}
          title="Save Changes"
          message="Do you want to save your changes?"
          confirmText="Save"
        />

        <ConfirmDialog
          isOpen={dialog === 'delete'}
          onClose={() => setDialog(null)}
          onConfirm={() => setDialog(null)}
          title="Delete Item"
          message="Are you sure you want to delete this item?"
          variant="danger"
          confirmText="Delete"
        />

        <ConfirmDialog
          isOpen={dialog === 'warning'}
          onClose={() => setDialog(null)}
          onConfirm={() => setDialog(null)}
          title="Reset All"
          message="Reset all settings to defaults?"
          confirmText="Reset"
          warning="This will clear all your customizations."
        />

        <ConfirmDialog
          isOpen={dialog === 'error'}
          onClose={() => setDialog(null)}
          onConfirm={() => setDialog(null)}
          title="Retry Action"
          message="The previous action failed. Try again?"
          confirmText="Retry"
          error="Connection timeout. Server did not respond."
        />
      </>
    );
  },
};
