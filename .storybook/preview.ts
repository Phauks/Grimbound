import type { Preview } from '@storybook/react-vite';

// Import global styles to match the app
import '../src/styles/index.css';

const preview: Preview = {
  parameters: {
    // Control matchers for automatic control type inference
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
      // Sort controls alphabetically, with required first
      sort: 'requiredFirst',
      // Expand all controls by default
      expanded: true,
    },

    // Documentation configuration
    docs: {
      // Show code snippets in docs
      source: {
        type: 'code',
        language: 'tsx',
      },
      // Use the component description from JSDoc
      extractComponentDescription: (_component, { notes }) => {
        if (notes) return typeof notes === 'string' ? notes : notes.markdown || notes.text;
        return null;
      },
    },

    // Default backgrounds
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#1a1a2e' },
        { name: 'light', value: '#ffffff' },
        { name: 'clocktower', value: '#2d1b4e' },
      ],
    },

    // Viewport presets
    viewport: {
      viewports: {
        mobile: { name: 'Mobile', styles: { width: '375px', height: '667px' } },
        tablet: { name: 'Tablet', styles: { width: '768px', height: '1024px' } },
        desktop: { name: 'Desktop', styles: { width: '1440px', height: '900px' } },
      },
    },

    // Layout defaults
    layout: 'centered',
  },

  // Global decorators
  decorators: [],

  // Default tags for all stories
  tags: ['autodocs'],
};

export default preview;
