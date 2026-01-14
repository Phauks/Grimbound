/**
 * Unit tests for DownloadSection component
 *
 * Tests cover:
 * - Section rendering with title and icon
 * - Collapsible behavior
 * - Item count display
 * - Download card grid rendering
 * - Custom children rendering
 * - Disabled state handling
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DownloadSection } from '@/components/ViewComponents/ExportComponents/DownloadSection';
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

describe('DownloadSection', () => {
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
      render(
        <DownloadSection
          title="Test Section"
          icon="📦"
          items={items}
          executingId={null}
          onExecute={vi.fn()}
        />
      );

      expect(screen.getByText('Test Section')).toBeInTheDocument();
    });

    it('should render section icon', () => {
      const items = [createMockDownloadItem()];
      render(
        <DownloadSection
          title="Test Section"
          icon="📦"
          items={items}
          executingId={null}
          onExecute={vi.fn()}
        />
      );

      expect(screen.getByText('📦')).toBeInTheDocument();
    });

    it('should render item count badge', () => {
      const items = [
        createMockDownloadItem({ id: 'item-1' }),
        createMockDownloadItem({ id: 'item-2' }),
      ];
      render(
        <DownloadSection
          title="Test Section"
          icon="📦"
          items={items}
          executingId={null}
          onExecute={vi.fn()}
        />
      );

      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should render all download items when expanded', () => {
      const items = [
        createMockDownloadItem({ id: 'item-1', label: 'Download 1' }),
        createMockDownloadItem({ id: 'item-2', label: 'Download 2' }),
      ];
      render(
        <DownloadSection
          title="Test Section"
          icon="📦"
          items={items}
          executingId={null}
          onExecute={vi.fn()}
          defaultOpen={true}
        />
      );

      expect(screen.getByText('Download 1')).toBeInTheDocument();
      expect(screen.getByText('Download 2')).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Empty State Tests
  // ========================================================================

  describe('Empty State', () => {
    it('should return null when items array is empty and no children', () => {
      const { container } = render(
        <DownloadSection
          title="Empty Section"
          icon="📦"
          items={[]}
          executingId={null}
          onExecute={vi.fn()}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render when items are empty but children are provided', () => {
      render(
        <DownloadSection
          title="Section With Children"
          icon="📦"
          items={[]}
          executingId={null}
          onExecute={vi.fn()}
        >
          <div>Custom content</div>
        </DownloadSection>
      );

      expect(screen.getByText('Section With Children')).toBeInTheDocument();
      expect(screen.getByText('Custom content')).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Collapsible Behavior Tests
  // ========================================================================

  describe('Collapsible Behavior', () => {
    it('should be expanded by default', () => {
      const items = [createMockDownloadItem({ label: 'Visible Item' })];
      render(
        <DownloadSection
          title="Test Section"
          icon="📦"
          items={items}
          executingId={null}
          onExecute={vi.fn()}
        />
      );

      expect(screen.getByText('Visible Item')).toBeInTheDocument();
    });

    it('should respect defaultOpen={false}', () => {
      const items = [createMockDownloadItem({ label: 'Hidden Item' })];
      render(
        <DownloadSection
          title="Test Section"
          icon="📦"
          items={items}
          executingId={null}
          onExecute={vi.fn()}
          defaultOpen={false}
        />
      );

      // Content should not be visible (hidden via CSS class)
      // The element exists but is visually hidden
      const content = screen.getByText('Hidden Item').closest('[class*="sectionContent"]');
      expect(content).not.toHaveClass('sectionContentOpen');
    });

    it('should collapse on header click when collapsible and open', () => {
      const items = [createMockDownloadItem({ label: 'Toggle Item' })];
      render(
        <DownloadSection
          title="Collapsible Section"
          icon="📦"
          items={items}
          executingId={null}
          onExecute={vi.fn()}
          collapsible={true}
          defaultOpen={true}
        />
      );

      const header = screen.getByRole('button', { name: /Collapsible Section/i });

      // Initially expanded
      expect(header).toHaveAttribute('aria-expanded', 'true');

      // Click to collapse
      fireEvent.click(header);
      expect(header).toHaveAttribute('aria-expanded', 'false');
    });

    it('should expand on header click when collapsible and closed', () => {
      const items = [createMockDownloadItem({ label: 'Toggle Item' })];
      render(
        <DownloadSection
          title="Collapsible Section"
          icon="📦"
          items={items}
          executingId={null}
          onExecute={vi.fn()}
          collapsible={true}
          defaultOpen={false}
        />
      );

      const header = screen.getByRole('button', { name: /Collapsible Section/i });

      // Initially collapsed
      expect(header).toHaveAttribute('aria-expanded', 'false');

      // Click to expand
      fireEvent.click(header);
      expect(header).toHaveAttribute('aria-expanded', 'true');
    });

    it('should not toggle when collapsible={false}', () => {
      const items = [createMockDownloadItem({ label: 'Fixed Item' })];
      render(
        <DownloadSection
          title="Fixed Section"
          icon="📦"
          items={items}
          executingId={null}
          onExecute={vi.fn()}
          collapsible={false}
          defaultOpen={true}
        />
      );

      const header = screen.getByRole('button', { name: /Fixed Section/i });

      // Should be disabled
      expect(header).toBeDisabled();

      // Click should not change state
      fireEvent.click(header);
      expect(screen.getByText('Fixed Item')).toBeInTheDocument();
    });

    it('should show arrow only when collapsible', () => {
      const items = [createMockDownloadItem()];

      const { rerender } = render(
        <DownloadSection
          title="Collapsible"
          icon="📦"
          items={items}
          executingId={null}
          onExecute={vi.fn()}
          collapsible={true}
        />
      );

      expect(screen.getByText('▶')).toBeInTheDocument();

      rerender(
        <DownloadSection
          title="Not Collapsible"
          icon="📦"
          items={items}
          executingId={null}
          onExecute={vi.fn()}
          collapsible={false}
        />
      );

      expect(screen.queryByText('▶')).not.toBeInTheDocument();
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
        <DownloadSection
          title="Test Section"
          icon="📦"
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
        <DownloadSection
          title="Test Section"
          icon="📦"
          items={[item]}
          executingId="executing-item"
          onExecute={vi.fn()}
          defaultOpen={true}
        />
      );

      const card = screen.getByRole('button', { name: /Test Download/i });
      expect(card).toHaveAttribute('aria-busy', 'true');
    });
  });

  // ========================================================================
  // Custom Children Tests
  // ========================================================================

  describe('Custom Children', () => {
    it('should render children instead of default grid', () => {
      const items = [createMockDownloadItem({ label: 'Grid Item' })];
      render(
        <DownloadSection
          title="Section With Children"
          icon="📦"
          items={items}
          executingId={null}
          onExecute={vi.fn()}
          defaultOpen={true}
        >
          <div data-testid="custom-content">Custom Content</div>
        </DownloadSection>
      );

      expect(screen.getByTestId('custom-content')).toBeInTheDocument();
      // Grid items should not be rendered when children are provided
      expect(screen.queryByText('Grid Item')).not.toBeInTheDocument();
    });

    it('should still show item count with children', () => {
      const items = [createMockDownloadItem({ id: '1' }), createMockDownloadItem({ id: '2' })];
      render(
        <DownloadSection
          title="Section With Children"
          icon="📦"
          items={items}
          executingId={null}
          onExecute={vi.fn()}
        >
          <div>Custom</div>
        </DownloadSection>
      );

      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Disabled Items Tests
  // ========================================================================

  describe('Disabled Items', () => {
    it('should count items with disabledReason as enabled items', () => {
      const items = [
        createMockDownloadItem({ id: '1', disabled: true, disabledReason: 'Coming soon' }),
        createMockDownloadItem({ id: '2', disabled: false }),
      ];
      render(
        <DownloadSection
          title="Test Section"
          icon="📦"
          items={items}
          executingId={null}
          onExecute={vi.fn()}
        />
      );

      // Both items should be counted since disabled item has a disabledReason
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should render disabled download cards', () => {
      const items = [
        createMockDownloadItem({
          label: 'Disabled Item',
          disabled: true,
          disabledReason: 'No tokens available',
        }),
      ];
      render(
        <DownloadSection
          title="Test Section"
          icon="📦"
          items={items}
          executingId={null}
          onExecute={vi.fn()}
          defaultOpen={true}
        />
      );

      const card = screen.getByText('Disabled Item').closest('button');
      expect(card).toBeDisabled();
    });
  });

  // ========================================================================
  // Download All Variant Tests
  // ========================================================================

  describe('Download All Variant', () => {
    it('should apply download-all variant for download-all item', () => {
      const items = [createMockDownloadItem({ id: 'download-all', label: 'Download All' })];
      const { container } = render(
        <DownloadSection
          title="Test Section"
          icon="📦"
          items={items}
          executingId={null}
          onExecute={vi.fn()}
          defaultOpen={true}
        />
      );

      const card = container.querySelector('[class*="downloadAllCard"]');
      expect(card).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Accessibility Tests
  // ========================================================================

  describe('Accessibility', () => {
    it('should have aria-expanded on header', () => {
      const items = [createMockDownloadItem()];
      render(
        <DownloadSection
          title="Test Section"
          icon="📦"
          items={items}
          executingId={null}
          onExecute={vi.fn()}
          defaultOpen={true}
        />
      );

      const header = screen.getByRole('button', { name: /Test Section/i });
      expect(header).toHaveAttribute('aria-expanded', 'true');
    });

    it('should update aria-expanded when toggled', () => {
      const items = [createMockDownloadItem()];
      render(
        <DownloadSection
          title="Test Section"
          icon="📦"
          items={items}
          executingId={null}
          onExecute={vi.fn()}
          collapsible={true}
          defaultOpen={true}
        />
      );

      const header = screen.getByRole('button', { name: /Test Section/i });
      expect(header).toHaveAttribute('aria-expanded', 'true');

      fireEvent.click(header);
      expect(header).toHaveAttribute('aria-expanded', 'false');
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
        <DownloadSection
          title="Test Section"
          icon="📦"
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
  });
});
