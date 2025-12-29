import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Select } from './Select';

/**
 * The Select component provides consistent dropdown styling across the application.
 * It supports sizes, error states, placeholders, and can be used with either
 * an `options` array or children `<option>` elements.
 *
 * ## Usage Guidelines
 *
 * - Use the `options` prop for simple use cases
 * - Use children for more complex option rendering
 * - Always provide a placeholder when no default selection
 * - Use error state with descriptive error messages
 */
const meta: Meta<typeof Select> = {
  title: 'Components/Form/Select',
  component: Select,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Unified select/dropdown component with consistent styling. Supports sizes, error states, and placeholder options.',
      },
    },
  },
  argTypes: {
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
      description: 'Select size variant',
      table: { defaultValue: { summary: 'medium' } },
    },
    error: {
      control: 'boolean',
      description: 'Whether the select is in an error state',
    },
    errorMessage: {
      control: 'text',
      description: 'Error message displayed below the select',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the select is disabled',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Whether the select should take full width',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder option text',
    },
  },
  args: {
    onChange: fn(),
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

const teamOptions = [
  { value: 'townsfolk', label: 'Townsfolk' },
  { value: 'outsider', label: 'Outsider' },
  { value: 'minion', label: 'Minion' },
  { value: 'demon', label: 'Demon' },
  { value: 'traveller', label: 'Traveller' },
  { value: 'fabled', label: 'Fabled' },
];

/**
 * Default select with options and placeholder.
 */
export const Default: Story = {
  args: {
    options: teamOptions,
    placeholder: 'Select a team...',
  },
};

/**
 * Select with a pre-selected value.
 */
export const WithValue: Story = {
  args: {
    options: teamOptions,
    defaultValue: 'townsfolk',
  },
};

/**
 * Select using children instead of options prop.
 */
export const WithChildren: Story = {
  args: {
    placeholder: 'Select edition...',
    children: (
      <>
        <option value="tb">Trouble Brewing</option>
        <option value="bmr">Bad Moon Rising</option>
        <option value="snv">Sects and Violets</option>
        <option value="custom">Custom Script</option>
      </>
    ),
  },
};

// ============================================
// Size Variants
// ============================================

/**
 * Small select for compact layouts.
 */
export const Small: Story = {
  args: {
    size: 'small',
    options: teamOptions,
    placeholder: 'Select team...',
  },
};

/**
 * Medium select - the default size.
 */
export const Medium: Story = {
  args: {
    size: 'medium',
    options: teamOptions,
    placeholder: 'Select team...',
  },
};

/**
 * Large select for prominent forms.
 */
export const Large: Story = {
  args: {
    size: 'large',
    options: teamOptions,
    placeholder: 'Select team...',
  },
};

// ============================================
// States
// ============================================

/**
 * Disabled select that cannot be interacted with.
 */
export const Disabled: Story = {
  args: {
    options: teamOptions,
    defaultValue: 'townsfolk',
    disabled: true,
  },
};

/**
 * Select in error state.
 */
export const WithError: Story = {
  args: {
    options: teamOptions,
    placeholder: 'Select a team...',
    error: true,
  },
};

/**
 * Select with error message displayed below.
 */
export const WithErrorMessage: Story = {
  args: {
    options: teamOptions,
    placeholder: 'Select a team...',
    error: true,
    errorMessage: 'Team selection is required',
  },
};

// ============================================
// With Disabled Options
// ============================================

const optionsWithDisabled = [
  { value: 'townsfolk', label: 'Townsfolk' },
  { value: 'outsider', label: 'Outsider' },
  { value: 'minion', label: 'Minion' },
  { value: 'demon', label: 'Demon' },
  { value: 'traveller', label: 'Traveller', disabled: true },
  { value: 'fabled', label: 'Fabled', disabled: true },
];

/**
 * Select with some options disabled.
 */
export const WithDisabledOptions: Story = {
  args: {
    options: optionsWithDisabled,
    placeholder: 'Select a team...',
  },
};

// ============================================
// Layout
// ============================================

/**
 * Full-width select that expands to container width.
 */
export const FullWidth: Story = {
  args: {
    options: teamOptions,
    placeholder: 'Select team...',
    fullWidth: true,
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
// Showcase
// ============================================

/**
 * All select sizes displayed together.
 */
export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '300px' }}>
      <Select size="small" options={teamOptions} placeholder="Small select" />
      <Select size="medium" options={teamOptions} placeholder="Medium select" />
      <Select size="large" options={teamOptions} placeholder="Large select" />
    </div>
  ),
};

/**
 * Form field example with label.
 */
export const FormFieldExample: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '300px' }}>
      <label htmlFor="team-select" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
        Character Team
      </label>
      <Select id="team-select" options={teamOptions} placeholder="Select a team..." />
      <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        The team determines the token's background color.
      </span>
    </div>
  ),
};
