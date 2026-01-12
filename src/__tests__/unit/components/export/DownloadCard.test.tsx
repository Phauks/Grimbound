/**
 * Unit tests for DownloadCard component
 *
 * Tests cover:
 * - Card rendering with icon, label, description
 * - Variant styling (default, featured, download-all)
 * - Disabled state handling
 * - Executing state with spinner
 * - Coming soon badge display
 * - Click handler and accessibility
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DownloadCard } from '@/components/ViewComponents/ExportComponents/DownloadCard';
import type { DownloadItem } from '@/contexts/DownloadsContext';

// ============================================================================
// Test Helpers
// ============================================================================

const createMockDownloadItem = (overrides: Partial<DownloadItem> = {}): DownloadItem => ({
  id: 'test-download',
  icon: '📥',
  label: 'Test Download',
  description: 'Test description',
  action: vi.fn(),
  disabled: false,
  category: 'tokens',
  sourceView: 'export',
  ...overrides,
});

// ============================================================================
// Tests
// ============================================================================

describe('DownloadCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ========================================================================
  // Rendering Tests
  // ========================================================================

  describe('Rendering', () => {
    it('should render icon', () => {
      const item = createMockDownloadItem({ icon: '🎭' });
      render(<DownloadCard item={item} isExecuting={false} onExecute={vi.fn()} />);

      expect(screen.getByText('🎭')).toBeInTheDocument();
    });

    it('should render label', () => {
      const item = createMockDownloadItem({ label: 'My Download' });
      render(<DownloadCard item={item} isExecuting={false} onExecute={vi.fn()} />);

      expect(screen.getByText('My Download')).toBeInTheDocument();
    });

    it('should render description', () => {
      const item = createMockDownloadItem({ description: 'Download all tokens' });
      render(<DownloadCard item={item} isExecuting={false} onExecute={vi.fn()} />);

      expect(screen.getByText('Download all tokens')).toBeInTheDocument();
    });

    it('should render download icon when enabled', () => {
      const item = createMockDownloadItem({ disabled: false });
      render(<DownloadCard item={item} isExecuting={false} onExecute={vi.fn()} />);

      expect(screen.getByText('↓')).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Variant Tests
  // ========================================================================

  describe('Variants', () => {
    it('should apply default variant class', () => {
      const item = createMockDownloadItem();
      const { container } = render(
        <DownloadCard item={item} isExecuting={false} onExecute={vi.fn()} variant="default" />
      );

      const card = container.querySelector('[class*="downloadCard"]');
      expect(card).toBeInTheDocument();
      expect(card).not.toHaveClass('downloadCardFeatured');
      expect(card).not.toHaveClass('downloadAllCard');
    });

    it('should apply featured variant class', () => {
      const item = createMockDownloadItem();
      const { container } = render(
        <DownloadCard item={item} isExecuting={false} onExecute={vi.fn()} variant="featured" />
      );

      const card = container.querySelector('[class*="downloadCardFeatured"]');
      expect(card).toBeInTheDocument();
    });

    it('should apply download-all variant class', () => {
      const item = createMockDownloadItem();
      const { container } = render(
        <DownloadCard item={item} isExecuting={false} onExecute={vi.fn()} variant="download-all" />
      );

      const card = container.querySelector('[class*="downloadAllCard"]');
      expect(card).toBeInTheDocument();
    });

    it('should default to default variant', () => {
      const item = createMockDownloadItem();
      const { container } = render(
        <DownloadCard item={item} isExecuting={false} onExecute={vi.fn()} />
      );

      const card = container.querySelector('[class*="downloadCard"]');
      expect(card).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Disabled State Tests
  // ========================================================================

  describe('Disabled State', () => {
    it('should be disabled when item.disabled is true', () => {
      const item = createMockDownloadItem({ disabled: true });
      render(<DownloadCard item={item} isExecuting={false} onExecute={vi.fn()} />);

      const card = screen.getByRole('button');
      expect(card).toBeDisabled();
    });

    it('should be disabled when executing', () => {
      const item = createMockDownloadItem({ disabled: false });
      render(<DownloadCard item={item} isExecuting={true} onExecute={vi.fn()} />);

      const card = screen.getByRole('button');
      expect(card).toBeDisabled();
    });

    it('should show disabledReason as title when disabled', () => {
      const item = createMockDownloadItem({
        disabled: true,
        disabledReason: 'Generate tokens first',
      });
      render(<DownloadCard item={item} isExecuting={false} onExecute={vi.fn()} />);

      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('title', 'Generate tokens first');
    });

    it('should show description as title when enabled', () => {
      const item = createMockDownloadItem({
        disabled: false,
        description: 'Download tokens as ZIP',
      });
      render(<DownloadCard item={item} isExecuting={false} onExecute={vi.fn()} />);

      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('title', 'Download tokens as ZIP');
    });

    it('should apply disabled class when disabled', () => {
      const item = createMockDownloadItem({ disabled: true });
      const { container } = render(
        <DownloadCard item={item} isExecuting={false} onExecute={vi.fn()} />
      );

      const card = container.querySelector('[class*="disabled"]');
      expect(card).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Executing State Tests
  // ========================================================================

  describe('Executing State', () => {
    it('should show spinner when executing', () => {
      const item = createMockDownloadItem();
      const { container } = render(
        <DownloadCard item={item} isExecuting={true} onExecute={vi.fn()} />
      );

      const spinner = container.querySelector('[class*="spinner"]');
      expect(spinner).toBeInTheDocument();
    });

    it('should not show download icon when executing', () => {
      const item = createMockDownloadItem();
      render(<DownloadCard item={item} isExecuting={true} onExecute={vi.fn()} />);

      expect(screen.queryByText('↓')).not.toBeInTheDocument();
    });

    it('should have aria-busy=true when executing', () => {
      const item = createMockDownloadItem();
      render(<DownloadCard item={item} isExecuting={true} onExecute={vi.fn()} />);

      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('aria-busy', 'true');
    });

    it('should have aria-busy=false when not executing', () => {
      const item = createMockDownloadItem();
      render(<DownloadCard item={item} isExecuting={false} onExecute={vi.fn()} />);

      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('aria-busy', 'false');
    });

    it('should apply executing class when executing', () => {
      const item = createMockDownloadItem();
      const { container } = render(
        <DownloadCard item={item} isExecuting={true} onExecute={vi.fn()} />
      );

      const card = container.querySelector('[class*="executing"]');
      expect(card).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Coming Soon Tests
  // ========================================================================

  describe('Coming Soon', () => {
    it('should show "Coming Soon" description when disabledReason contains "coming"', () => {
      const item = createMockDownloadItem({
        disabled: true,
        disabledReason: 'Coming soon',
        description: 'Original description',
      });
      render(<DownloadCard item={item} isExecuting={false} onExecute={vi.fn()} />);

      expect(screen.getByText('Coming Soon')).toBeInTheDocument();
      expect(screen.queryByText('Original description')).not.toBeInTheDocument();
    });

    it('should show "Soon" badge for coming soon items', () => {
      const item = createMockDownloadItem({
        disabled: true,
        disabledReason: 'Coming soon',
      });
      render(<DownloadCard item={item} isExecuting={false} onExecute={vi.fn()} />);

      expect(screen.getByText('Soon')).toBeInTheDocument();
    });

    it('should not show download icon for coming soon items', () => {
      const item = createMockDownloadItem({
        disabled: true,
        disabledReason: 'Coming soon',
      });
      render(<DownloadCard item={item} isExecuting={false} onExecute={vi.fn()} />);

      expect(screen.queryByText('↓')).not.toBeInTheDocument();
    });

    it('should handle case-insensitive "coming" match', () => {
      const item = createMockDownloadItem({
        disabled: true,
        disabledReason: 'COMING SOON!',
      });
      render(<DownloadCard item={item} isExecuting={false} onExecute={vi.fn()} />);

      expect(screen.getByText('Coming Soon')).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Click Handler Tests
  // ========================================================================

  describe('Click Handler', () => {
    it('should call onExecute when clicked', () => {
      const onExecute = vi.fn();
      const item = createMockDownloadItem();
      render(<DownloadCard item={item} isExecuting={false} onExecute={onExecute} />);

      fireEvent.click(screen.getByRole('button'));

      expect(onExecute).toHaveBeenCalled();
    });

    it('should not call onExecute when disabled', () => {
      const onExecute = vi.fn();
      const item = createMockDownloadItem({ disabled: true });
      render(<DownloadCard item={item} isExecuting={false} onExecute={onExecute} />);

      fireEvent.click(screen.getByRole('button'));

      // Button is disabled, so click should not trigger handler
      // Note: Disabled buttons don't fire click events
      expect(onExecute).not.toHaveBeenCalled();
    });

    it('should not call onExecute when executing', () => {
      const onExecute = vi.fn();
      const item = createMockDownloadItem();
      render(<DownloadCard item={item} isExecuting={true} onExecute={onExecute} />);

      fireEvent.click(screen.getByRole('button'));

      expect(onExecute).not.toHaveBeenCalled();
    });
  });

  // ========================================================================
  // Accessibility Tests
  // ========================================================================

  describe('Accessibility', () => {
    it('should be a button element', () => {
      const item = createMockDownloadItem();
      render(<DownloadCard item={item} isExecuting={false} onExecute={vi.fn()} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should have type="button"', () => {
      const item = createMockDownloadItem();
      render(<DownloadCard item={item} isExecuting={false} onExecute={vi.fn()} />);

      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });

    it('should hide decorative icons from screen readers', () => {
      const item = createMockDownloadItem({ icon: '🎭' });
      const { container } = render(
        <DownloadCard item={item} isExecuting={false} onExecute={vi.fn()} />
      );

      // Download icon should have aria-hidden
      const downloadIcon = container.querySelector('[class*="downloadIcon"]');
      expect(downloadIcon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  // ========================================================================
  // Edge Cases
  // ========================================================================

  describe('Edge Cases', () => {
    it('should handle empty icon', () => {
      const item = createMockDownloadItem({ icon: '' });
      render(<DownloadCard item={item} isExecuting={false} onExecute={vi.fn()} />);

      expect(screen.getByText('Test Download')).toBeInTheDocument();
    });

    it('should handle long labels', () => {
      const item = createMockDownloadItem({
        label: 'This is a very long download label that might overflow',
      });
      render(<DownloadCard item={item} isExecuting={false} onExecute={vi.fn()} />);

      expect(
        screen.getByText('This is a very long download label that might overflow')
      ).toBeInTheDocument();
    });

    it('should handle long descriptions', () => {
      const item = createMockDownloadItem({
        description:
          'This is a very long description text that explains what this download does in detail',
      });
      render(<DownloadCard item={item} isExecuting={false} onExecute={vi.fn()} />);

      expect(screen.getByText(/This is a very long description/)).toBeInTheDocument();
    });

    it('should handle special characters in label', () => {
      const item = createMockDownloadItem({
        label: 'Download <Special> & "Tokens"',
      });
      render(<DownloadCard item={item} isExecuting={false} onExecute={vi.fn()} />);

      expect(screen.getByText('Download <Special> & "Tokens"')).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Visual State Combinations
  // ========================================================================

  describe('Visual State Combinations', () => {
    it('should apply both disabled and featured classes', () => {
      const item = createMockDownloadItem({ disabled: true });
      const { container } = render(
        <DownloadCard item={item} isExecuting={false} onExecute={vi.fn()} variant="featured" />
      );

      const card = container.querySelector('button');
      expect(card?.className).toContain('disabled');
      expect(card?.className).toContain('Featured');
    });

    it('should apply executing class with featured variant', () => {
      const item = createMockDownloadItem();
      const { container } = render(
        <DownloadCard item={item} isExecuting={true} onExecute={vi.fn()} variant="featured" />
      );

      const card = container.querySelector('button');
      expect(card?.className).toContain('executing');
      expect(card?.className).toContain('Featured');
    });

    it('should prioritize spinner over coming soon badge when executing', () => {
      const item = createMockDownloadItem({
        disabled: true,
        disabledReason: 'Coming soon',
      });
      // Even though it's "coming soon", if isExecuting is true, show spinner
      // But this shouldn't happen in practice since disabled items can't execute
      const { container } = render(
        <DownloadCard item={item} isExecuting={true} onExecute={vi.fn()} />
      );

      const spinner = container.querySelector('[class*="spinner"]');
      expect(spinner).toBeInTheDocument();
    });
  });
});
