import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Checkbox } from './Checkbox';

/**
 * The Checkbox component provides consistent checkbox styling across the application.
 * It supports labels, descriptions, sizes, and error/indeterminate states.
 *
 * ## Usage Guidelines
 *
 * - Always provide a label for accessibility
 * - Use descriptions for additional context when needed
 * - Use indeterminate state for "select all" checkboxes when partially selected
 */
const meta: Meta<typeof Checkbox> = {
  title: 'Components/Form/Checkbox',
  component: Checkbox,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Unified checkbox component with support for labels, descriptions, and various states.',
      },
    },
  },
  argTypes: {
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
      description: 'Checkbox size variant',
      table: { defaultValue: { summary: 'medium' } },
    },
    label: {
      control: 'text',
      description: 'Label text displayed next to the checkbox',
    },
    description: {
      control: 'text',
      description: 'Description text displayed below the label',
    },
    checked: {
      control: 'boolean',
      description: 'Whether the checkbox is checked',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the checkbox is disabled',
    },
    error: {
      control: 'boolean',
      description: 'Whether the checkbox is in an error state',
    },
    indeterminate: {
      control: 'boolean',
      description: 'Whether the checkbox is in an indeterminate state',
    },
  },
  args: {
    onChange: fn(),
    label: 'Checkbox label',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================
// Basic Stories
// ============================================

/**
 * Default unchecked checkbox with a label.
 */
export const Default: Story = {
  args: {
    label: 'Enable auto-save',
  },
};

/**
 * Checked checkbox.
 */
export const Checked: Story = {
  args: {
    label: 'Enable auto-save',
    defaultChecked: true,
  },
};

/**
 * Checkbox without a label (icon-only style).
 */
export const WithoutLabel: Story = {
  args: {
    label: undefined,
    'aria-label': 'Toggle option',
  },
};

// ============================================
// With Description
// ============================================

/**
 * Checkbox with a description for additional context.
 */
export const WithDescription: Story = {
  args: {
    label: 'Enable auto-save',
    description: 'Automatically save your project every 30 seconds',
  },
};

/**
 * Checked checkbox with description.
 */
export const CheckedWithDescription: Story = {
  args: {
    label: 'Generate reminder tokens',
    description: 'Include reminder tokens for each character in the export',
    defaultChecked: true,
  },
};

// ============================================
// Size Variants
// ============================================

/**
 * Small checkbox for compact layouts.
 */
export const Small: Story = {
  args: {
    size: 'small',
    label: 'Small checkbox',
  },
};

/**
 * Medium checkbox - the default size.
 */
export const Medium: Story = {
  args: {
    size: 'medium',
    label: 'Medium checkbox',
  },
};

/**
 * Large checkbox for touch interfaces.
 */
export const Large: Story = {
  args: {
    size: 'large',
    label: 'Large checkbox',
  },
};

// ============================================
// States
// ============================================

/**
 * Disabled unchecked checkbox.
 */
export const Disabled: Story = {
  args: {
    label: 'Disabled option',
    disabled: true,
  },
};

/**
 * Disabled checked checkbox.
 */
export const DisabledChecked: Story = {
  args: {
    label: 'Disabled checked option',
    disabled: true,
    defaultChecked: true,
  },
};

/**
 * Checkbox in error state.
 */
export const WithError: Story = {
  args: {
    label: 'Accept terms and conditions',
    error: true,
  },
};

/**
 * Indeterminate state for "select all" patterns.
 */
export const Indeterminate: Story = {
  args: {
    label: 'Select all characters',
    indeterminate: true,
  },
};

// ============================================
// Showcase
// ============================================

/**
 * All checkbox sizes displayed together.
 */
export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Checkbox size="small" label="Small checkbox" />
      <Checkbox size="medium" label="Medium checkbox" />
      <Checkbox size="large" label="Large checkbox" />
    </div>
  ),
};

/**
 * Checkbox group example for multiple options.
 */
export const CheckboxGroup: Story = {
  render: () => (
    <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
      <legend style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.75rem' }}>
        Export Options
      </legend>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <Checkbox
          label="Include character tokens"
          description="Export all character tokens as PNG files"
          defaultChecked
        />
        <Checkbox
          label="Include reminder tokens"
          description="Export reminder tokens for each character"
          defaultChecked
        />
        <Checkbox
          label="Include night order sheet"
          description="Generate a PDF with first and other night order"
        />
        <Checkbox label="Include script JSON" description="Include the raw script JSON file" />
      </div>
    </fieldset>
  ),
};

/**
 * Select all pattern with indeterminate state.
 */
export const SelectAllPattern: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <Checkbox label="Select all" indeterminate style={{ fontWeight: 600 }} />
      <div
        style={{ marginLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
      >
        <Checkbox label="Townsfolk" defaultChecked />
        <Checkbox label="Outsiders" defaultChecked />
        <Checkbox label="Minions" />
        <Checkbox label="Demons" />
      </div>
    </div>
  ),
};
