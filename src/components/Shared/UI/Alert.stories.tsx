import type { Meta, StoryObj } from '@storybook/react-vite';
import { Alert } from './Alert';

/**
 * The Alert component displays contextual feedback messages with semantic styling.
 * Use alerts to communicate important information, warnings, errors, or success states.
 *
 * ## Usage Guidelines
 *
 * - Use `info` for neutral informational messages
 * - Use `success` for confirmation of completed actions
 * - Use `warning` for potential issues that don't block the user
 * - Use `error` for problems that require attention
 *
 * ## Accessibility
 *
 * - Error alerts automatically use `role="alert"` for screen reader announcement
 * - Other variants use `role="status"` for less intrusive announcements
 * - Icons are hidden from screen readers (`aria-hidden="true"`)
 */
const meta: Meta<typeof Alert> = {
  title: 'Components/UI/Alert',
  component: Alert,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Displays contextual feedback messages with semantic styling. Replaces inline-styled warning/error divs.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['info', 'success', 'warning', 'error'],
      description: 'Visual style variant of the alert',
      table: {
        type: { summary: 'AlertVariant' },
        defaultValue: { summary: 'info' },
      },
    },
    title: {
      control: 'text',
      description: 'Optional title displayed in bold above the message',
    },
    children: {
      control: 'text',
      description: 'Alert message content',
    },
    icon: {
      control: false,
      description: 'Custom icon element (overrides default)',
    },
  },
  args: {
    children: 'This is an alert message.',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '400px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================
// Variant Stories
// ============================================

/**
 * Info alerts provide neutral informational messages.
 * Use for general announcements or helpful tips.
 */
export const Info: Story = {
  args: {
    variant: 'info',
    children: 'Here is some helpful information for you.',
  },
};

/**
 * Success alerts confirm that an action completed successfully.
 * Use after save operations, form submissions, or successful imports.
 */
export const Success: Story = {
  args: {
    variant: 'success',
    title: 'Success!',
    children: 'Your changes have been saved successfully.',
  },
};

/**
 * Warning alerts indicate potential issues that don't block the user.
 * Use for destructive action confirmations or deprecation notices.
 */
export const Warning: Story = {
  args: {
    variant: 'warning',
    title: 'Warning',
    children: 'This action cannot be undone. Please proceed with caution.',
  },
};

/**
 * Error alerts indicate problems that require user attention.
 * Use for validation errors, failed operations, or blocking issues.
 */
export const ErrorAlert: Story = {
  args: {
    variant: 'error',
    title: 'Error',
    children: 'Failed to save changes. Please check your connection and try again.',
  },
};

// ============================================
// Content Variations
// ============================================

/**
 * Alerts without a title are more compact.
 * Use for brief, self-explanatory messages.
 */
export const WithoutTitle: Story = {
  args: {
    variant: 'info',
    children: 'This is a simple alert without a title.',
  },
};

/**
 * Alerts can contain longer content with multiple lines.
 */
export const LongContent: Story = {
  args: {
    variant: 'warning',
    title: 'Important Notice',
    children:
      'This project contains custom characters that may not be compatible with the official Blood on the Clocktower rules. Please review the character abilities carefully before using this script in a game.',
  },
};

/**
 * Alerts can contain rich content like lists or links.
 */
export const WithRichContent: Story = {
  args: {
    variant: 'error',
    title: 'Validation Errors',
    children: (
      <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
        <li>Character name is required</li>
        <li>Ability text cannot be empty</li>
        <li>Team must be selected</li>
      </ul>
    ),
  },
};

/**
 * Custom icons can replace the default variant icons.
 */
export const WithCustomIcon: Story = {
  args: {
    variant: 'info',
    icon: '💡',
    title: 'Pro Tip',
    children: 'You can drag and drop characters to reorder them in the script.',
  },
};

// ============================================
// Showcase
// ============================================

/**
 * All alert variants displayed together for comparison.
 */
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '400px' }}>
      <Alert variant="info" title="Information">
        This is an informational message.
      </Alert>
      <Alert variant="success" title="Success">
        Operation completed successfully.
      </Alert>
      <Alert variant="warning" title="Warning">
        Please review before continuing.
      </Alert>
      <Alert variant="error" title="Error">
        Something went wrong.
      </Alert>
    </div>
  ),
};
