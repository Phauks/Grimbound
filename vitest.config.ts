import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    passWithNoTests: true,

    // Test file patterns
    include: [
      'src/__tests__/**/*.{test,spec}.{ts,tsx}',
      'src/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: ['node_modules', 'dist', 'e2e', '.storybook'],

    // Setup files - run before each test file
    setupFiles: ['src/__tests__/setup/vitest.setup.ts'],

    // Coverage configuration (report only, no gates)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'src/ts/**/*.ts',
        'src/hooks/**/*.ts',
        'src/hooks/**/*.tsx',
        'src/components/**/*.tsx',
      ],
      exclude: [
        'src/ts/**/*.test.ts',
        'src/ts/**/*.spec.ts',
        'src/ts/types/**',
        'src/__tests__/**',
        'src/stories/**',
      ],
      reportsDirectory: './coverage',
    },

    // Reporter configuration
    reporters: ['default'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@test': path.resolve(__dirname, './src/__tests__'),
    },
  },
});
