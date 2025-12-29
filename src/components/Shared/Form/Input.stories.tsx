import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Input } from './Input';

/**
 * The Input component provides consistent text input styling across the application.
 * It supports sizes, error states, icons, and full-width layouts.
 *
 * ## Usage Guidelines
 *
 * - Use `size="small"` for compact forms or inline editing
 * - Use `size="medium"` (default) for most form inputs
 * - Use `size="large"` for prominent inputs or touch interfaces
 * - Always pair error states with descriptive error messages
 */
const meta: Meta<typeof Input> = {
  title: 'Components/Form/Input',
  component: Input,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Unified text input component with consistent styling. Supports sizes, error states, icons, and validation messages.',
      },
    },
  },
  argTypes: {
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
      description: 'Input size variant',
      table: { defaultValue: { summary: 'medium' } },
    },
    error: {
      control: 'boolean',
      description: 'Whether the input is in an error state',
    },
    errorMessage: {
      control: 'text',
      description: 'Error message displayed below the input',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the input is disabled',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Whether the input should take full width',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
  },
  args: {
    onChange: fn(),
    placeholder: 'Enter text...',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '300px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================
// Basic Stories
// ============================================

/**
 * Default input with medium size.
 */
export const Default: Story = {
  args: {
    placeholder: 'Enter character name...',
  },
};

/**
 * Input with a pre-filled value.
 */
export const WithValue: Story = {
  args: {
    defaultValue: 'Washerwoman',
    placeholder: 'Enter character name...',
  },
};

// ============================================
// Size Variants
// ============================================

/**
 * Small input for compact layouts.
 */
export const Small: Story = {
  args: {
    size: 'small',
    placeholder: 'Small input',
  },
};

/**
 * Medium input - the default size.
 */
export const Medium: Story = {
  args: {
    size: 'medium',
    placeholder: 'Medium input',
  },
};

/**
 * Large input for prominent forms.
 */
export const Large: Story = {
  args: {
    size: 'large',
    placeholder: 'Large input',
  },
};

// ============================================
// States
// ============================================

/**
 * Disabled input that cannot be interacted with.
 */
export const Disabled: Story = {
  args: {
    disabled: true,
    defaultValue: 'Disabled value',
  },
};

/**
 * Input in error state.
 */
export const WithError: Story = {
  args: {
    error: true,
    defaultValue: 'Invalid input',
  },
};

/**
 * Input with error message displayed below.
 */
export const WithErrorMessage: Story = {
  args: {
    error: true,
    errorMessage: 'Character name is required',
    defaultValue: '',
    placeholder: 'Enter character name...',
  },
};

// ============================================
// With Icons
// ============================================

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
  </svg>
);

const ClearIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0-1A6 6 0 1 0 8 2a6 6 0 0 0 0 12zM5.354 5.354a.5.5 0 0 1 .707 0L8 7.293l1.939-1.939a.5.5 0 1 1 .707.707L8.707 8l1.939 1.939a.5.5 0 0 1-.707.707L8 8.707l-1.939 1.939a.5.5 0 0 1-.707-.707L7.293 8 5.354 6.061a.5.5 0 0 1 0-.707z" />
  </svg>
);

/**
 * Input with a left icon (e.g., search).
 */
export const WithLeftIcon: Story = {
  args: {
    leftIcon: <SearchIcon />,
    placeholder: 'Search characters...',
  },
};

/**
 * Input with a right icon (e.g., clear button).
 */
export const WithRightIcon: Story = {
  args: {
    rightIcon: <ClearIcon />,
    defaultValue: 'Some text',
  },
};

/**
 * Input with both left and right icons.
 */
export const WithBothIcons: Story = {
  args: {
    leftIcon: <SearchIcon />,
    rightIcon: <ClearIcon />,
    defaultValue: 'Searching...',
  },
};

// ============================================
// Layout
// ============================================

/**
 * Full-width input that expands to container width.
 */
export const FullWidth: Story = {
  args: {
    fullWidth: true,
    placeholder: 'Full width input',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '500px' }}>
        <Story />
      </div>
    ),
  ],
};

// ============================================
// Input Types
// ============================================

/**
 * Password input with masked text.
 */
export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter password...',
    defaultValue: 'secret123',
  },
};

/**
 * Number input with numeric keyboard on mobile.
 */
export const NumberInput: Story = {
  args: {
    type: 'number',
    placeholder: 'Enter number...',
    min: 0,
    max: 100,
  },
};

/**
 * Email input with email keyboard on mobile.
 */
export const Email: Story = {
  args: {
    type: 'email',
    placeholder: 'Enter email...',
  },
};

// ============================================
// Showcase
// ============================================

/**
 * All input sizes displayed together.
 */
export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '300px' }}>
      <Input size="small" placeholder="Small input" />
      <Input size="medium" placeholder="Medium input" />
      <Input size="large" placeholder="Large input" />
    </div>
  ),
};

/**
 * Form field example with label.
 */
export const FormFieldExample: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '300px' }}>
      <label htmlFor="character-name" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
        Character Name
      </label>
      <Input id="character-name" placeholder="Enter character name..." />
      <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        The name that will appear on the token.
      </span>
    </div>
  ),
};
