import { type RenderOptions, render } from '@testing-library/react';
import type React from 'react';

/**
 * Custom render options that extend RTL options.
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  // Add custom provider options here as needed
  initialRoute?: string;
}

/**
 * Wrapper component that provides all necessary context providers.
 */
function TestProviders({ children }: { children: React.ReactNode }) {
  // Add providers as needed
  return <>{children}</>;
}

/**
 * Custom render function that wraps components with all necessary providers.
 *
 * @example
 * ```tsx
 * import { renderWithProviders, screen } from '@test/helpers';
 *
 * test('renders component', () => {
 *   renderWithProviders(<MyComponent />);
 *   expect(screen.getByText('Hello')).toBeInTheDocument();
 * });
 * ```
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
): ReturnType<typeof render> {
  const { ...renderOptions } = options;

  return render(ui, {
    wrapper: TestProviders,
    ...renderOptions,
  });
}

// Re-export everything from testing-library for convenience
export * from '@testing-library/react';
export { renderWithProviders as render };
