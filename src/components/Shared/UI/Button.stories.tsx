import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Button } from './Button';

/**
 * The Button component is the primary interactive element used throughout the application.
 * It supports multiple variants, sizes, loading states, and icon placement.
 *
 * ## Usage Guidelines
 *
 * - Use `primary` variant for main calls-to-action
 * - Use `secondary` variant for secondary actions
 * - Use `ghost` variant for tertiary actions or icon-only buttons
 * - Use `danger` variant for destructive actions
 * - Use `accent` variant for highlighted special actions
 *
 * ## Accessibility
 *
 * - Always provide meaningful text or `aria-label` for icon-only buttons
 * - The component automatically sets `aria-busy` during loading states
 * - Buttons are disabled during loading to prevent double-submission
 */
const meta: Meta<typeof Button> = {
  title: 'Components/UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Unified button component with variants, sizes, and loading states. This is the single source of truth for all buttons in the application.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'accent', 'ghost', 'danger'],
      description: 'Visual style variant of the button',
      table: {
        type: { summary: 'ButtonVariant' },
        defaultValue: { summary: 'secondary' },
      },
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
      description: 'Size of the button',
      table: {
        type: { summary: 'ButtonSize' },
        defaultValue: { summary: 'medium' },
      },
    },
    loading: {
      control: 'boolean',
      description: 'Whether the button is in a loading state',
    },
    loadingText: {
      control: 'text',
      description: 'Text to show during loading (replaces children)',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the button is disabled',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Whether the button should take full width of container',
    },
    isIconOnly: {
      control: 'boolean',
      description: 'Whether this is an icon-only button (square aspect ratio)',
    },
    iconPosition: {
      control: 'radio',
      options: ['left', 'right'],
      description: 'Position of the icon relative to text',
    },
  },
  args: {
    onClick: fn(),
    children: 'Button',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================
// Variant Stories
// ============================================

/**
 * The primary variant is used for main calls-to-action.
 * Use sparingly - typically one per view.
 */
export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
};

/**
 * The secondary variant is the default and most common button style.
 * Use for secondary actions that don't need emphasis.
 */
export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
};

/**
 * The accent variant draws attention without being as strong as primary.
 * Use for special actions or highlights.
 */
export const Accent: Story = {
  args: {
    variant: 'accent',
    children: 'Accent Button',
  },
};

/**
 * The ghost variant has minimal styling.
 * Use for tertiary actions, icon-only buttons, or subtle interactions.
 */
export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost Button',
  },
};

/**
 * The danger variant indicates destructive actions.
 * Use for delete, remove, or other irreversible actions.
 */
export const Danger: Story = {
  args: {
    variant: 'danger',
    children: 'Delete',
  },
};

// ============================================
// Size Stories
// ============================================

/**
 * Small buttons are used for compact UIs or inline actions.
 */
export const Small: Story = {
  args: {
    size: 'small',
    children: 'Small Button',
  },
};

/**
 * Medium is the default size, suitable for most use cases.
 */
export const Medium: Story = {
  args: {
    size: 'medium',
    children: 'Medium Button',
  },
};

/**
 * Large buttons are used for prominent actions or touch-friendly interfaces.
 */
export const Large: Story = {
  args: {
    size: 'large',
    children: 'Large Button',
  },
};

// ============================================
// State Stories
// ============================================

/**
 * Loading state shows a spinner and disables the button.
 * The button text is preserved to maintain layout stability.
 */
export const Loading: Story = {
  args: {
    variant: 'primary',
    loading: true,
    children: 'Save Changes',
  },
};

/**
 * Loading with custom text replaces the button label during loading.
 * Useful for providing feedback about what's happening.
 */
export const LoadingWithText: Story = {
  args: {
    variant: 'primary',
    loading: true,
    loadingText: 'Saving...',
    children: 'Save Changes',
  },
};

/**
 * Disabled buttons are non-interactive and visually muted.
 */
export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled Button',
  },
};

// ============================================
// Icon Stories
// ============================================

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 12l-4-4h2.5V3h3v5H12L8 12zM3 14v-1h10v1H3z" />
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M12.5 3.5l-9 9m0-9l9 9" stroke="currentColor" strokeWidth="1.5" fill="none" />
  </svg>
);

/**
 * Buttons can include an icon on the left (default position).
 */
export const WithIconLeft: Story = {
  args: {
    variant: 'secondary',
    icon: <DownloadIcon />,
    children: 'Download',
  },
};

/**
 * Icons can also be placed on the right side of the button text.
 */
export const WithIconRight: Story = {
  args: {
    variant: 'secondary',
    icon: <DownloadIcon />,
    iconPosition: 'right',
    children: 'Download',
  },
};

/**
 * Icon-only buttons have a square aspect ratio.
 * Always provide an `aria-label` for accessibility.
 */
export const IconOnly: Story = {
  args: {
    variant: 'ghost',
    icon: <CloseIcon />,
    isIconOnly: true,
    'aria-label': 'Close',
    children: undefined,
  },
};

// ============================================
// Layout Stories
// ============================================

/**
 * Full-width buttons expand to fill their container.
 * Useful for mobile layouts or form submission buttons.
 */
export const FullWidth: Story = {
  args: {
    variant: 'primary',
    fullWidth: true,
    children: 'Full Width Button',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '300px' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Showcase of all button variants side by side.
 */
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="accent">Accent</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
    </div>
  ),
};

/**
 * Showcase of all button sizes side by side.
 */
export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <Button size="small">Small</Button>
      <Button size="medium">Medium</Button>
      <Button size="large">Large</Button>
    </div>
  ),
};
