import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { SegmentedControl } from './SegmentedControl';

/**
 * The SegmentedControl component provides a set of mutually exclusive options
 * displayed as connected buttons. It's ideal for toggling between views,
 * modes, or filter options.
 *
 * ## Usage Guidelines
 *
 * - Use for 2-5 mutually exclusive options
 * - Keep labels short and descriptive
 * - Consider using icons for compact layouts
 * - Use when the selection affects immediate visible content
 */
const meta: Meta<typeof SegmentedControl> = {
  title: 'Components/UI/SegmentedControl',
  component: SegmentedControl,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A set of mutually exclusive options displayed as connected buttons. Use for view toggles, mode selection, or filtering.',
      },
    },
  },
  argTypes: {
    options: {
      description: 'Array of options with value and label',
      control: false,
    },
    value: {
      description: 'Currently selected value',
      control: false,
    },
    onChange: {
      description: 'Callback when selection changes',
    },
  },
  args: {
    onChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================
// Basic Stories
// ============================================

const viewOptions = [
  { value: 'grid', label: 'Grid' },
  { value: 'list', label: 'List' },
];

/**
 * Basic two-option segmented control.
 */
export const Default: Story = {
  args: {
    options: viewOptions,
    value: 'grid',
  },
};

/**
 * Interactive example with state management.
 */
export const Interactive: Story = {
  render: function Render() {
    const [value, setValue] = useState('grid');
    return <SegmentedControl options={viewOptions} value={value} onChange={setValue} />;
  },
};

// ============================================
// Multiple Options
// ============================================

const teamFilterOptions = [
  { value: 'all', label: 'All' },
  { value: 'townsfolk', label: 'Town' },
  { value: 'outsider', label: 'Outsider' },
  { value: 'evil', label: 'Evil' },
];

/**
 * Segmented control with four options.
 */
export const FourOptions: Story = {
  render: function Render() {
    const [value, setValue] = useState('all');
    return <SegmentedControl options={teamFilterOptions} value={value} onChange={setValue} />;
  },
};

const exportFormatOptions = [
  { value: 'pdf', label: 'PDF' },
  { value: 'png', label: 'PNG' },
  { value: 'zip', label: 'ZIP' },
];

/**
 * Three-option segmented control for format selection.
 */
export const ThreeOptions: Story = {
  render: function Render() {
    const [value, setValue] = useState('pdf');
    return <SegmentedControl options={exportFormatOptions} value={value} onChange={setValue} />;
  },
};

// ============================================
// Use Cases
// ============================================

const editorModeOptions = [
  { value: 'visual', label: 'Visual' },
  { value: 'json', label: 'JSON' },
];

/**
 * Editor mode toggle between visual and JSON editing.
 */
export const EditorModeToggle: Story = {
  render: function Render() {
    const [mode, setMode] = useState('visual');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
        <SegmentedControl options={editorModeOptions} value={mode} onChange={setMode} />
        <div
          style={{
            padding: '2rem',
            background: 'var(--bg-secondary)',
            borderRadius: '8px',
            width: '300px',
            textAlign: 'center',
          }}
        >
          {mode === 'visual' ? (
            <span style={{ color: 'var(--text-primary)' }}>Visual Editor Content</span>
          ) : (
            <code style={{ color: 'var(--text-primary)' }}>{'{ "mode": "json" }'}</code>
          )}
        </div>
      </div>
    );
  },
};

const tokenSizeOptions = [
  { value: 'small', label: 'S' },
  { value: 'medium', label: 'M' },
  { value: 'large', label: 'L' },
];

/**
 * Compact segmented control with single-letter labels.
 */
export const CompactLabels: Story = {
  render: function Render() {
    const [size, setSize] = useState('medium');
    return <SegmentedControl options={tokenSizeOptions} value={size} onChange={setSize} />;
  },
};

const nightOptions = [
  { value: 'first', label: 'First Night' },
  { value: 'other', label: 'Other Nights' },
];

/**
 * Night order toggle for Blood on the Clocktower.
 */
export const NightOrderToggle: Story = {
  render: function Render() {
    const [night, setNight] = useState('first');
    return <SegmentedControl options={nightOptions} value={night} onChange={setNight} />;
  },
};

// ============================================
// Showcase
// ============================================

/**
 * Various segmented control configurations.
 */
export const Showcase: Story = {
  render: function Render() {
    const [view, setView] = useState('grid');
    const [filter, setFilter] = useState('all');
    const [format, setFormat] = useState('pdf');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            View Toggle
          </div>
          <SegmentedControl options={viewOptions} value={view} onChange={setView} />
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            Team Filter
          </div>
          <SegmentedControl options={teamFilterOptions} value={filter} onChange={setFilter} />
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            Export Format
          </div>
          <SegmentedControl options={exportFormatOptions} value={format} onChange={setFormat} />
        </div>
      </div>
    );
  },
};
