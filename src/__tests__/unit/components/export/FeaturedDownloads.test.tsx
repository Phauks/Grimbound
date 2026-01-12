/**
 * Unit tests for FeaturedDownloads component
 *
 * Tests cover:
 * - Rendering featured download items
 * - Collapsible section behavior
 * - Download card rendering with proper variants
 * - Empty state handling
 * - Accessibility attributes
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FeaturedDownloads } from '@/components/ViewComponents/ExportComponents/FeaturedDownloads';
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
  featured: true,
  sourceView: 'export',
  ...overrides,
});

// ============================================================================
// Tests
// ============================================================================

describe('FeaturedDownloads', () => {
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
    it('should render section title', () => {
      const items = [createMockDownloadItem()];
      render(<FeaturedDownloads items={items} executingId={null} onExecute={vi.fn()} />);

      expect(screen.getByText('Featured Downloads')).toBeInTheDocument();
    });

    it('should render item count badge', () => {
      const items = [
        createMockDownloadItem({ id: 'item-1' }),
        createMockDownloadItem({ id: 'item-2' }),
        createMockDownloadItem({ id: 'item-3' }),
      ];
      render(<FeaturedDownloads items={items} executingId={null} onExecute={vi.fn()} />);

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should render featured icon', () => {
      const items = [createMockDownloadItem()];
      render(<FeaturedDownloads items={items} executingId={null} onExecute={vi.fn()} />);

      // Check for star emoji
      expect(screen.getByText('⭐')).toBeInTheDocument();
    });

    it('should render all download items when expanded', () => {
      const items = [
        createMockDownloadItem({ id: 'item-1', label: 'Download 1' }),
        createMockDownloadItem({ id: 'item-2', label: 'Download 2' }),
      ];
      render(
        <FeaturedDownloads
          items={items}
          executingId={null}
          onExecute={vi.fn()}
          defaultOpen={true}
        />
      );

      expect(screen.getByText('Download 1')).toBeInTheDocument();
      expect(screen.getByText('Download 2')).toBeInTheDocument();
    });

    it('should render info banner when expanded', () => {
      const items = [createMockDownloadItem()];
      render(
        <FeaturedDownloads
          items={items}
          executingId={null}
          onExecute={vi.fn()}
          defaultOpen={true}
        />
      );

      expect(screen.getByText(/Avery/i)).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Empty State Tests
  // ========================================================================

  describe('Empty State', () => {
    it('should return null when items array is empty', () => {
      const { container } = render(
        <FeaturedDownloads items={[]} executingId={null} onExecute={vi.fn()} />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  // ========================================================================
  // Collapsible Behavior Tests
  // ========================================================================

  describe('Collapsible Behavior', () => {
    it('should be expanded by default', () => {
      const items = [createMockDownloadItem({ label: 'Visible Item' })];
      render(<FeaturedDownloads items={items} executingId={null} onExecute={vi.fn()} />);

      expect(screen.getByText('Visible Item')).toBeInTheDocument();
    });

    it('should respect defaultOpen={false}', () => {
      const items = [createMockDownloadItem({ label: 'Hidden Item' })];
      render(
        <FeaturedDownloads
          items={items}
          executingId={null}
          onExecute={vi.fn()}
          defaultOpen={false}
        />
      );

      expect(screen.queryByText('Hidden Item')).not.toBeInTheDocument();
    });

    it('should toggle content visibility on header click', () => {
      const items = [createMockDownloadItem({ label: 'Toggle Item' })];
      render(
        <FeaturedDownloads
          items={items}
          executingId={null}
          onExecute={vi.fn()}
          defaultOpen={true}
        />
      );

      // Content should be visible initially
      expect(screen.getByText('Toggle Item')).toBeInTheDocument();

      // Click header to collapse
      fireEvent.click(screen.getByRole('button', { name: /Featured Downloads/i }));

      // Content should be hidden
      expect(screen.queryByText('Toggle Item')).not.toBeInTheDocument();

      // Click header to expand
      fireEvent.click(screen.getByRole('button', { name: /Featured Downloads/i }));

      // Content should be visible again
      expect(screen.getByText('Toggle Item')).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Accessibility Tests
  // ========================================================================

  describe('Accessibility', () => {
    it('should have aria-expanded on header button', () => {
      const items = [createMockDownloadItem()];
      render(
        <FeaturedDownloads
          items={items}
          executingId={null}
          onExecute={vi.fn()}
          defaultOpen={true}
        />
      );

      const header = screen.getByRole('button', { name: /Featured Downloads/i });
      expect(header).toHaveAttribute('aria-expanded', 'true');
    });

    it('should update aria-expanded when toggled', () => {
      const items = [createMockDownloadItem()];
      render(
        <FeaturedDownloads
          items={items}
          executingId={null}
          onExecute={vi.fn()}
          defaultOpen={true}
        />
      );

      const header = screen.getByRole('button', { name: /Featured Downloads/i });
      expect(header).toHaveAttribute('aria-expanded', 'true');

      fireEvent.click(header);
      expect(header).toHaveAttribute('aria-expanded', 'false');
    });

    it('should have section with aria-labelledby', () => {
      const items = [createMockDownloadItem()];
      render(<FeaturedDownloads items={items} executingId={null} onExecute={vi.fn()} />);

      const section = screen.getByRole('region', { name: /Featured Downloads/i });
      expect(section).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Download Execution Tests
  // ========================================================================

  describe('Download Execution', () => {
    it('should call onExecute when download card is clicked', () => {
      const onExecute = vi.fn();
      const item = createMockDownloadItem({ label: 'Click Me' });
      render(
        <FeaturedDownloads
          items={[item]}
          executingId={null}
          onExecute={onExecute}
          defaultOpen={true}
        />
      );

      fireEvent.click(screen.getByText('Click Me'));

      expect(onExecute).toHaveBeenCalledWith(item);
    });

    it('should show executing state for current download', () => {
      const item = createMockDownloadItem({ id: 'executing-item' });
      render(
        <FeaturedDownloads
          items={[item]}
          executingId="executing-item"
          onExecute={vi.fn()}
          defaultOpen={true}
        />
      );

      // The card should have aria-busy when executing
      const card = screen.getByRole('button', { name: /Test Download/i });
      expect(card).toHaveAttribute('aria-busy', 'true');
    });

    it('should not show executing state for other downloads', () => {
      const item = createMockDownloadItem({ id: 'not-executing' });
      render(
        <FeaturedDownloads
          items={[item]}
          executingId="other-item"
          onExecute={vi.fn()}
          defaultOpen={true}
        />
      );

      const card = screen.getByRole('button', { name: /Test Download/i });
      expect(card).toHaveAttribute('aria-busy', 'false');
    });
  });

  // ========================================================================
  // Featured Variant Tests
  // ========================================================================

  describe('Featured Variant', () => {
    it('should render download cards with featured variant', () => {
      const items = [createMockDownloadItem()];
      const { container } = render(
        <FeaturedDownloads
          items={items}
          executingId={null}
          onExecute={vi.fn()}
          defaultOpen={true}
        />
      );

      // Featured cards should have the featured class
      const card = container.querySelector('[class*="downloadCardFeatured"]');
      expect(card).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Multiple Items Tests
  // ========================================================================

  describe('Multiple Items', () => {
    it('should render all items in grid', () => {
      const items = [
        createMockDownloadItem({ id: '1', label: 'First' }),
        createMockDownloadItem({ id: '2', label: 'Second' }),
        createMockDownloadItem({ id: '3', label: 'Third' }),
      ];
      render(
        <FeaturedDownloads
          items={items}
          executingId={null}
          onExecute={vi.fn()}
          defaultOpen={true}
        />
      );

      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
      expect(screen.getByText('Third')).toBeInTheDocument();
    });

    it('should handle mixed enabled/disabled items', () => {
      const items = [
        createMockDownloadItem({ id: '1', label: 'Enabled', disabled: false }),
        createMockDownloadItem({
          id: '2',
          label: 'Disabled',
          disabled: true,
          disabledReason: 'No data',
        }),
      ];
      render(
        <FeaturedDownloads
          items={items}
          executingId={null}
          onExecute={vi.fn()}
          defaultOpen={true}
        />
      );

      const enabledCard = screen.getByText('Enabled').closest('button');
      const disabledCard = screen.getByText('Disabled').closest('button');

      expect(enabledCard).not.toBeDisabled();
      expect(disabledCard).toBeDisabled();
    });
  });
});
