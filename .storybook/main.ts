import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],

  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@storybook/addon-vitest',
    '@chromatic-com/storybook',
  ],

  framework: '@storybook/react-vite',

  // Enable automatic documentation for all stories
  docs: {
    autodocs: true,
    defaultName: 'Documentation',
  },

  // TypeScript configuration for better prop extraction
  typescript: {
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      // Speeds up Storybook build time
      compilerOptions: {
        allowSyntheticDefaultImports: false,
        esModuleInterop: false,
      },
      // Filter out node_modules except for packages we want to document
      propFilter: (prop) => {
        if (prop.declarations && prop.declarations.length > 0) {
          const hasPropAdditionalDescription = prop.declarations.find(
            (declaration) => !declaration.fileName.includes('node_modules')
          );
          return Boolean(hasPropAdditionalDescription);
        }
        return true;
      },
      // Include props from extended interfaces
      shouldExtractLiteralValuesFromEnum: true,
      shouldRemoveUndefinedFromOptional: true,
    },
  },

  // Vite configuration overrides
  viteFinal: async (config) => {
    // Ensure proper path resolution for @ alias
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': '/src',
    };
    return config;
  },
};

export default config;
