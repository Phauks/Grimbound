import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { Button } from '@/components/Shared/UI/Button';
import { Modal } from './Modal';

/**
 * The Modal component is the unified modal wrapper for the application.
 * It handles escape key, body scroll locking, backdrop clicks, and accessibility.
 *
 * ## Usage Guidelines
 *
 * - Use `size="small"` for confirmations and simple forms
 * - Use `size="medium"` (default) for standard dialogs
 * - Use `size="large"` for complex content
 * - Use `size="full"` for full-page overlays
 * - Set `preventClose` during async operations
 */
const meta: Meta<typeof Modal> = {
  title: 'Components/ModalBase/Modal',
  component: Modal,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Unified modal wrapper that handles escape key, scroll locking, backdrop clicks, and accessibility. Replaces 9+ modal implementations.',
      },
    },
  },
  argTypes: {
    size: {
      control: 'select',
      options: ['small', 'medium', 'large', 'xlarge', 'full'],
      description: 'Modal size variant',
      table: { defaultValue: { summary: 'medium' } },
    },
    title: {
      control: 'text',
      description: 'Modal title displayed in header',
    },
    isOpen: {
      control: 'boolean',
      description: 'Whether the modal is open',
    },
    preventClose: {
      control: 'boolean',
      description: 'Prevent closing during async operations',
    },
  },
  args: {
    onClose: fn(),
    title: 'Modal Title',
    isOpen: true,
    children: 'Modal content goes here.',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================
// Basic Stories
// ============================================

/**
 * Default medium-sized modal with title and content.
 */
export const Default: Story = {
  args: {
    title: 'Settings',
    children: (
      <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
        Configure your preferences for the token generator.
      </p>
    ),
  },
};

/**
 * Interactive modal that can be opened and closed.
 */
export const Interactive: Story = {
  render: function Render() {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Interactive Modal">
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Click the X button, press Escape, or click the backdrop to close.
          </p>
        </Modal>
      </>
    );
  },
};

// ============================================
// Size Variants
// ============================================

/**
 * Small modal for confirmations and simple content.
 */
export const Small: Story = {
  args: {
    size: 'small',
    title: 'Confirm Action',
    children: <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Are you sure?</p>,
  },
};

/**
 * Medium modal - the default size.
 */
export const Medium: Story = {
  args: {
    size: 'medium',
    title: 'Edit Character',
    children: (
      <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Edit the character details below.</p>
    ),
  },
};

/**
 * Large modal for complex content.
 */
export const Large: Story = {
  args: {
    size: 'large',
    title: 'Character Gallery',
    children: (
      <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
        Browse and select characters for your script.
      </p>
    ),
  },
};

/**
 * Extra large modal for extensive content.
 */
export const XLarge: Story = {
  args: {
    size: 'xlarge',
    title: 'Asset Manager',
    children: (
      <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
        Manage your uploaded icons and backgrounds.
      </p>
    ),
  },
};

/**
 * Full-screen modal for immersive experiences.
 */
export const Full: Story = {
  args: {
    size: 'full',
    title: 'Full Screen View',
    children: (
      <div style={{ minHeight: '300px', color: 'var(--text-secondary)' }}>
        Full screen modal content that takes up the entire viewport.
      </div>
    ),
  },
};

// ============================================
// With Footer
// ============================================

/**
 * Modal with footer action buttons.
 */
export const WithFooter: Story = {
  render: function Render() {
    const [isOpen, setIsOpen] = useState(true);
    return (
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Save Changes"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setIsOpen(false)}>
              Save
            </Button>
          </>
        }
      >
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          You have unsaved changes. Would you like to save them?
        </p>
      </Modal>
    );
  },
};

/**
 * Modal with danger action in footer.
 */
export const WithDangerAction: Story = {
  render: function Render() {
    const [isOpen, setIsOpen] = useState(true);
    return (
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Delete Project"
        size="small"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => setIsOpen(false)}>
              Delete
            </Button>
          </>
        }
      >
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Are you sure you want to delete this project? This action cannot be undone.
        </p>
      </Modal>
    );
  },
};

// ============================================
// States
// ============================================

/**
 * Modal with preventClose enabled (simulating a loading state).
 */
export const PreventClose: Story = {
  render: function Render() {
    const [isOpen, setIsOpen] = useState(true);
    const [loading, setLoading] = useState(true);

    return (
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Saving..."
        size="small"
        preventClose={loading}
        footer={
          <Button variant="secondary" onClick={() => setLoading(false)} disabled={loading}>
            {loading ? 'Please wait...' : 'Close'}
          </Button>
        }
      >
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          {loading
            ? 'Your changes are being saved. Please wait...'
            : 'Done! You can now close this modal.'}
        </p>
      </Modal>
    );
  },
};

// ============================================
// Complex Content
// ============================================

/**
 * Modal with form content.
 */
export const WithFormContent: Story = {
  render: function Render() {
    const [isOpen, setIsOpen] = useState(true);
    return (
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="New Character"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setIsOpen(false)}>
              Create
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label
              htmlFor="name"
              style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '0.25rem' }}
            >
              Character Name
            </label>
            <input
              id="name"
              type="text"
              placeholder="Enter name..."
              style={{
                width: '100%',
                padding: '0.5rem',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
              }}
            />
          </div>
          <div>
            <label
              htmlFor="team"
              style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '0.25rem' }}
            >
              Team
            </label>
            <select
              id="team"
              style={{
                width: '100%',
                padding: '0.5rem',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
              }}
            >
              <option>Townsfolk</option>
              <option>Outsider</option>
              <option>Minion</option>
              <option>Demon</option>
            </select>
          </div>
        </div>
      </Modal>
    );
  },
};

// ============================================
// Showcase
// ============================================

/**
 * All modal sizes for comparison.
 */
export const SizeComparison: Story = {
  render: function Render() {
    const [size, setSize] = useState<'small' | 'medium' | 'large' | 'xlarge' | null>(null);
    return (
      <>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button onClick={() => setSize('small')}>Small</Button>
          <Button onClick={() => setSize('medium')}>Medium</Button>
          <Button onClick={() => setSize('large')}>Large</Button>
          <Button onClick={() => setSize('xlarge')}>XLarge</Button>
        </div>
        {size && (
          <Modal isOpen={true} onClose={() => setSize(null)} title={`${size} Modal`} size={size}>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
              This is a {size} sized modal.
            </p>
          </Modal>
        )}
      </>
    );
  },
};
