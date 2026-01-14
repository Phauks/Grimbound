/**
 * Unit tests for CharacterSelectionCard component
 *
 * Tests cover:
 * - Card rendering with character counts
 * - Collapsible behavior
 * - Summary display (enabled/total/excluded)
 * - Children rendering when expanded
 * - Accessibility attributes
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CharacterSelectionCard } from '@/components/ViewComponents/ExportComponents/CharacterSelectionCard';

// ============================================================================
// Tests
// ============================================================================

describe('CharacterSelectionCard', () => {
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
    it('should render heading', () => {
      render(
        <CharacterSelectionCard enabledCount={10} totalCount={15} disabledCount={5}>
          <div>Content</div>
        </CharacterSelectionCard>
      );

      expect(screen.getByText('Character Selection')).toBeInTheDocument();
    });

    it('should render character icon', () => {
      render(
        <CharacterSelectionCard enabledCount={10} totalCount={15} disabledCount={5}>
          <div>Content</div>
        </CharacterSelectionCard>
      );

      expect(screen.getByText('👥')).toBeInTheDocument();
    });

    it('should render enabled/total count', () => {
      render(
        <CharacterSelectionCard enabledCount={12} totalCount={18} disabledCount={6}>
          <div>Content</div>
        </CharacterSelectionCard>
      );

      expect(screen.getByText('12 of 18 included')).toBeInTheDocument();
    });

    it('should render excluded badge when disabledCount > 0', () => {
      render(
        <CharacterSelectionCard enabledCount={10} totalCount={15} disabledCount={5}>
          <div>Content</div>
        </CharacterSelectionCard>
      );

      expect(screen.getByText('5 excluded')).toBeInTheDocument();
    });

    it('should not render excluded badge when disabledCount is 0', () => {
      render(
        <CharacterSelectionCard enabledCount={15} totalCount={15} disabledCount={0}>
          <div>Content</div>
        </CharacterSelectionCard>
      );

      expect(screen.queryByText(/excluded/)).not.toBeInTheDocument();
    });
  });

  // ========================================================================
  // Collapsible Behavior Tests
  // ========================================================================

  describe('Collapsible Behavior', () => {
    it('should be collapsed by default', () => {
      render(
        <CharacterSelectionCard enabledCount={10} totalCount={15} disabledCount={5}>
          <div data-testid="child-content">Child Content</div>
        </CharacterSelectionCard>
      );

      expect(screen.queryByTestId('child-content')).not.toBeInTheDocument();
    });

    it('should expand when defaultOpen={true}', () => {
      render(
        <CharacterSelectionCard
          enabledCount={10}
          totalCount={15}
          disabledCount={5}
          defaultOpen={true}
        >
          <div data-testid="child-content">Child Content</div>
        </CharacterSelectionCard>
      );

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    it('should toggle content on header click', () => {
      render(
        <CharacterSelectionCard
          enabledCount={10}
          totalCount={15}
          disabledCount={5}
          defaultOpen={false}
        >
          <div data-testid="child-content">Child Content</div>
        </CharacterSelectionCard>
      );

      // Initially collapsed
      expect(screen.queryByTestId('child-content')).not.toBeInTheDocument();

      // Click to expand
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    it('should collapse content on header click when open', () => {
      render(
        <CharacterSelectionCard
          enabledCount={10}
          totalCount={15}
          disabledCount={5}
          defaultOpen={true}
        >
          <div data-testid="child-content">Child Content</div>
        </CharacterSelectionCard>
      );

      // Initially expanded
      expect(screen.getByTestId('child-content')).toBeInTheDocument();

      // Click to collapse
      fireEvent.click(screen.getByRole('button'));
      expect(screen.queryByTestId('child-content')).not.toBeInTheDocument();
    });

    it('should show arrow indicator', () => {
      render(
        <CharacterSelectionCard enabledCount={10} totalCount={15} disabledCount={5}>
          <div>Content</div>
        </CharacterSelectionCard>
      );

      expect(screen.getByText('▶')).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Children Rendering Tests
  // ========================================================================

  describe('Children Rendering', () => {
    it('should render children when expanded', () => {
      render(
        <CharacterSelectionCard
          enabledCount={10}
          totalCount={15}
          disabledCount={5}
          defaultOpen={true}
        >
          <div data-testid="character-list">Character List Component</div>
        </CharacterSelectionCard>
      );

      expect(screen.getByTestId('character-list')).toBeInTheDocument();
      expect(screen.getByText('Character List Component')).toBeInTheDocument();
    });

    it('should not render children when collapsed', () => {
      render(
        <CharacterSelectionCard
          enabledCount={10}
          totalCount={15}
          disabledCount={5}
          defaultOpen={false}
        >
          <div data-testid="character-list">Character List Component</div>
        </CharacterSelectionCard>
      );

      expect(screen.queryByTestId('character-list')).not.toBeInTheDocument();
    });

    it('should render complex children correctly', () => {
      render(
        <CharacterSelectionCard
          enabledCount={10}
          totalCount={15}
          disabledCount={5}
          defaultOpen={true}
        >
          <ul>
            <li>Character 1</li>
            <li>Character 2</li>
            <li>Character 3</li>
          </ul>
        </CharacterSelectionCard>
      );

      expect(screen.getByText('Character 1')).toBeInTheDocument();
      expect(screen.getByText('Character 2')).toBeInTheDocument();
      expect(screen.getByText('Character 3')).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Accessibility Tests
  // ========================================================================

  describe('Accessibility', () => {
    it('should have aria-expanded on header button', () => {
      render(
        <CharacterSelectionCard
          enabledCount={10}
          totalCount={15}
          disabledCount={5}
          defaultOpen={true}
        >
          <div>Content</div>
        </CharacterSelectionCard>
      );

      const header = screen.getByRole('button');
      expect(header).toHaveAttribute('aria-expanded', 'true');
    });

    it('should update aria-expanded when toggled', () => {
      render(
        <CharacterSelectionCard
          enabledCount={10}
          totalCount={15}
          disabledCount={5}
          defaultOpen={false}
        >
          <div>Content</div>
        </CharacterSelectionCard>
      );

      const header = screen.getByRole('button');
      expect(header).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(header);
      expect(header).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have type="button"', () => {
      render(
        <CharacterSelectionCard enabledCount={10} totalCount={15} disabledCount={5}>
          <div>Content</div>
        </CharacterSelectionCard>
      );

      const header = screen.getByRole('button');
      expect(header).toHaveAttribute('type', 'button');
    });

    it('should hide decorative arrow from screen readers', () => {
      const { container } = render(
        <CharacterSelectionCard enabledCount={10} totalCount={15} disabledCount={5}>
          <div>Content</div>
        </CharacterSelectionCard>
      );

      const arrow = container.querySelector('[class*="Arrow"]');
      expect(arrow).toHaveAttribute('aria-hidden', 'true');
    });

    it('should hide decorative icon from screen readers', () => {
      const { container } = render(
        <CharacterSelectionCard enabledCount={10} totalCount={15} disabledCount={5}>
          <div>Content</div>
        </CharacterSelectionCard>
      );

      const icon = container.querySelector('[class*="Icon"]');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  // ========================================================================
  // Edge Cases
  // ========================================================================

  describe('Edge Cases', () => {
    it('should handle zero counts', () => {
      render(
        <CharacterSelectionCard enabledCount={0} totalCount={0} disabledCount={0}>
          <div>No characters</div>
        </CharacterSelectionCard>
      );

      expect(screen.getByText('0 of 0 included')).toBeInTheDocument();
      expect(screen.queryByText(/excluded/)).not.toBeInTheDocument();
    });

    it('should handle all characters enabled', () => {
      render(
        <CharacterSelectionCard enabledCount={20} totalCount={20} disabledCount={0}>
          <div>All enabled</div>
        </CharacterSelectionCard>
      );

      expect(screen.getByText('20 of 20 included')).toBeInTheDocument();
    });

    it('should handle all characters disabled', () => {
      render(
        <CharacterSelectionCard enabledCount={0} totalCount={15} disabledCount={15}>
          <div>All disabled</div>
        </CharacterSelectionCard>
      );

      expect(screen.getByText('0 of 15 included')).toBeInTheDocument();
      expect(screen.getByText('15 excluded')).toBeInTheDocument();
    });

    it('should handle large numbers', () => {
      render(
        <CharacterSelectionCard enabledCount={999} totalCount={1000} disabledCount={1}>
          <div>Many characters</div>
        </CharacterSelectionCard>
      );

      expect(screen.getByText('999 of 1000 included')).toBeInTheDocument();
      expect(screen.getByText('1 excluded')).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Styling Tests
  // ========================================================================

  describe('Styling', () => {
    it('should have the purple-tinted card class', () => {
      const { container } = render(
        <CharacterSelectionCard enabledCount={10} totalCount={15} disabledCount={5}>
          <div>Content</div>
        </CharacterSelectionCard>
      );

      const card = container.querySelector('[class*="characterSelectionCard"]');
      expect(card).toBeInTheDocument();
    });

    it('should apply open arrow class when expanded', () => {
      const { container } = render(
        <CharacterSelectionCard
          enabledCount={10}
          totalCount={15}
          disabledCount={5}
          defaultOpen={true}
        >
          <div>Content</div>
        </CharacterSelectionCard>
      );

      const arrow = container.querySelector('[class*="ArrowOpen"]');
      expect(arrow).toBeInTheDocument();
    });

    it('should not apply open arrow class when collapsed', () => {
      const { container } = render(
        <CharacterSelectionCard
          enabledCount={10}
          totalCount={15}
          disabledCount={5}
          defaultOpen={false}
        >
          <div>Content</div>
        </CharacterSelectionCard>
      );

      const arrow = container.querySelector('[class*="ArrowOpen"]');
      expect(arrow).not.toBeInTheDocument();
    });
  });

  // ========================================================================
  // Summary Display Tests
  // ========================================================================

  describe('Summary Display', () => {
    it('should display count in correct format', () => {
      render(
        <CharacterSelectionCard enabledCount={7} totalCount={13} disabledCount={6}>
          <div>Content</div>
        </CharacterSelectionCard>
      );

      // Format: "X of Y included"
      expect(screen.getByText('7 of 13 included')).toBeInTheDocument();
    });

    it('should display excluded badge with correct format', () => {
      render(
        <CharacterSelectionCard enabledCount={10} totalCount={15} disabledCount={5}>
          <div>Content</div>
        </CharacterSelectionCard>
      );

      // Format: "X excluded"
      expect(screen.getByText('5 excluded')).toBeInTheDocument();
    });
  });
});
