/**
 * Unit tests for ScriptMessagesBar component
 *
 * Tests cover:
 * - Conditional rendering based on content state
 * - Error message display
 * - Warning message display
 * - Collapsible message list behavior
 * - Recommendation messages (meta, separators, sorting, condensing, formatting)
 * - Action button functionality
 * - Accessibility considerations
 *
 * @module __tests__/unit/components/ViewComponents/ScriptMessagesBar.test
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  ScriptMessagesBar,
  type ScriptMessagesBarProps,
} from '@/components/ViewComponents/JsonComponents/ScriptMessagesBar';

/**
 * Default props factory for ScriptMessagesBar
 */
const createDefaultProps = (
  overrides: Partial<ScriptMessagesBarProps> = {}
): ScriptMessagesBarProps => ({
  error: null,
  warnings: [],
  characterCount: 0,
  hasScriptMeta: true,
  hasSeparatorsInIds: false,
  isScriptSorted: true,
  needsFormatting: false,
  hasCondensableRefs: false,
  formatIssuesSummary: null,
  onFormat: vi.fn(),
  onSort: vi.fn(),
  onCondense: vi.fn(),
  onFixFormats: vi.fn(),
  onAddMeta: vi.fn(),
  onRemoveSeparators: vi.fn(),
  ...overrides,
});

describe('ScriptMessagesBar', () => {
  describe('Rendering Conditions', () => {
    it('should render nothing when no content to show', () => {
      const props = createDefaultProps();

      const { container } = render(<ScriptMessagesBar {...props} />);

      expect(container.firstChild).toBeNull();
    });

    it('should render when there is an error', () => {
      const props = createDefaultProps({ error: 'Parse error' });

      render(<ScriptMessagesBar {...props} />);

      expect(screen.getByText(/Parse error/)).toBeInTheDocument();
    });

    it('should render when there are warnings', () => {
      const props = createDefaultProps({ warnings: ['Warning 1', 'Warning 2'] });

      render(<ScriptMessagesBar {...props} />);

      expect(screen.getByText(/Warning 1/)).toBeInTheDocument();
      expect(screen.getByText(/Warning 2/)).toBeInTheDocument();
    });

    it('should render when formatting is needed', () => {
      const props = createDefaultProps({ needsFormatting: true });

      render(<ScriptMessagesBar {...props} />);

      expect(screen.getByText(/JSON can be formatted/)).toBeInTheDocument();
    });

    it('should render when meta is missing and has characters', () => {
      const props = createDefaultProps({
        characterCount: 5,
        hasScriptMeta: false,
      });

      render(<ScriptMessagesBar {...props} />);

      // Check for the text describing missing meta, not the button
      expect(screen.getByText(/doesn't have a/)).toBeInTheDocument();
    });

    it('should render when separators are detected', () => {
      const props = createDefaultProps({ hasSeparatorsInIds: true });

      render(<ScriptMessagesBar {...props} />);

      expect(screen.getByText(/underscores or hyphens/)).toBeInTheDocument();
    });

    it('should render when script is not sorted and has characters', () => {
      const props = createDefaultProps({
        characterCount: 5,
        isScriptSorted: false,
      });

      render(<ScriptMessagesBar {...props} />);

      expect(screen.getByText(/not sorted in Standard Order/)).toBeInTheDocument();
    });

    it('should render when condensable refs exist', () => {
      const props = createDefaultProps({ hasCondensableRefs: true });

      render(<ScriptMessagesBar {...props} />);

      expect(screen.getByText(/can be simplified/)).toBeInTheDocument();
    });

    it('should render when format issues exist', () => {
      const props = createDefaultProps({
        formatIssuesSummary: {
          issuesFound: [
            {
              characterName: 'Empath',
              field: 'firstNightReminder',
              issues: [
                {
                  name: 'html-tag',
                  description: 'Uses HTML tags',
                  matchedText: '<b>text</b>',
                  suggestedFix: 'text',
                },
              ],
            },
          ],
          uniqueIssueTypes: ['Uses HTML tags'],
          totalCharactersAffected: 1,
          totalIssues: 1,
        },
      });

      render(<ScriptMessagesBar {...props} />);

      expect(screen.getByText(/non-standard formats/)).toBeInTheDocument();
    });
  });

  describe('Error Messages', () => {
    it('should display error with warning icon', () => {
      const props = createDefaultProps({ error: 'JSON parse error at line 5' });

      render(<ScriptMessagesBar {...props} />);

      expect(screen.getByText(/JSON parse error at line 5/)).toBeInTheDocument();
    });

    it('should not show recommendations when error is present', () => {
      const props = createDefaultProps({
        error: 'Parse error',
        needsFormatting: true,
        hasScriptMeta: false,
        characterCount: 5,
      });

      render(<ScriptMessagesBar {...props} />);

      // Error should be shown
      expect(screen.getByText(/Parse error/)).toBeInTheDocument();

      // Recommendations should not be shown
      expect(screen.queryByText(/JSON can be formatted/)).not.toBeInTheDocument();
      expect(screen.queryByText(/_meta/)).not.toBeInTheDocument();
    });
  });

  describe('Warning Messages', () => {
    it('should display warning with info icon', () => {
      const props = createDefaultProps({
        warnings: ['Unknown character: custom_char'],
      });

      render(<ScriptMessagesBar {...props} />);

      expect(screen.getByText(/Unknown character/)).toBeInTheDocument();
    });

    it('should display multiple warnings', () => {
      const props = createDefaultProps({
        warnings: ['Warning 1', 'Warning 2', 'Warning 3'],
      });

      render(<ScriptMessagesBar {...props} />);

      expect(screen.getByText(/Warning 1/)).toBeInTheDocument();
      expect(screen.getByText(/Warning 2/)).toBeInTheDocument();
      expect(screen.getByText(/Warning 3/)).toBeInTheDocument();
    });
  });

  describe('Collapsible Messages', () => {
    it('should show only 3 messages initially', () => {
      const props = createDefaultProps({
        warnings: ['Warning 1', 'Warning 2', 'Warning 3', 'Warning 4', 'Warning 5'],
      });

      render(<ScriptMessagesBar {...props} />);

      // First 3 should be visible
      expect(screen.getByText(/Warning 1/)).toBeInTheDocument();
      expect(screen.getByText(/Warning 2/)).toBeInTheDocument();
      expect(screen.getByText(/Warning 3/)).toBeInTheDocument();

      // 4 and 5 should be hidden initially
      expect(screen.queryByText(/Warning 4/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Warning 5/)).not.toBeInTheDocument();
    });

    it('should show "Show more" button when more than 3 messages', () => {
      const props = createDefaultProps({
        warnings: ['Warning 1', 'Warning 2', 'Warning 3', 'Warning 4'],
      });

      render(<ScriptMessagesBar {...props} />);

      expect(screen.getByText(/Show 1 more/)).toBeInTheDocument();
    });

    it('should expand messages when "Show more" is clicked', () => {
      const props = createDefaultProps({
        warnings: ['Warning 1', 'Warning 2', 'Warning 3', 'Warning 4', 'Warning 5'],
      });

      render(<ScriptMessagesBar {...props} />);

      // Click show more
      fireEvent.click(screen.getByText(/Show 2 more/));

      // All warnings should now be visible
      expect(screen.getByText(/Warning 4/)).toBeInTheDocument();
      expect(screen.getByText(/Warning 5/)).toBeInTheDocument();
    });

    it('should collapse messages when "Show less" is clicked', () => {
      const props = createDefaultProps({
        warnings: ['Warning 1', 'Warning 2', 'Warning 3', 'Warning 4'],
      });

      render(<ScriptMessagesBar {...props} />);

      // Expand
      fireEvent.click(screen.getByText(/Show 1 more/));
      expect(screen.getByText(/Warning 4/)).toBeInTheDocument();

      // Collapse
      fireEvent.click(screen.getByText(/Show less/));
      expect(screen.queryByText(/Warning 4/)).not.toBeInTheDocument();
    });

    it('should not show toggle button for 3 or fewer messages', () => {
      const props = createDefaultProps({
        warnings: ['Warning 1', 'Warning 2', 'Warning 3'],
      });

      render(<ScriptMessagesBar {...props} />);

      expect(screen.queryByText(/Show/)).not.toBeInTheDocument();
    });
  });

  describe('Format Recommendation', () => {
    it('should display format recommendation', () => {
      const props = createDefaultProps({ needsFormatting: true });

      render(<ScriptMessagesBar {...props} />);

      expect(screen.getByText(/JSON can be formatted/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Format/i })).toBeInTheDocument();
    });

    it('should call onFormat when Format button is clicked', () => {
      const onFormat = vi.fn();
      const props = createDefaultProps({ needsFormatting: true, onFormat });

      render(<ScriptMessagesBar {...props} />);

      fireEvent.click(screen.getByRole('button', { name: /Format/i }));

      expect(onFormat).toHaveBeenCalledTimes(1);
    });
  });

  describe('Missing Meta Recommendation', () => {
    it('should display missing meta recommendation when has characters but no meta', () => {
      const props = createDefaultProps({
        characterCount: 5,
        hasScriptMeta: false,
      });

      render(<ScriptMessagesBar {...props} />);

      // Check for the code element containing _meta, not the button text
      expect(screen.getByText(/doesn't have a/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add _meta/i })).toBeInTheDocument();
    });

    it('should not display when no characters', () => {
      const props = createDefaultProps({
        characterCount: 0,
        hasScriptMeta: false,
      });

      const { container } = render(<ScriptMessagesBar {...props} />);

      expect(container.firstChild).toBeNull();
    });

    it('should call onAddMeta when button is clicked', () => {
      const onAddMeta = vi.fn();
      const props = createDefaultProps({
        characterCount: 5,
        hasScriptMeta: false,
        onAddMeta,
      });

      render(<ScriptMessagesBar {...props} />);

      fireEvent.click(screen.getByRole('button', { name: /Add _meta/i }));

      expect(onAddMeta).toHaveBeenCalledTimes(1);
    });
  });

  describe('Separators Recommendation', () => {
    it('should display separators recommendation', () => {
      const props = createDefaultProps({ hasSeparatorsInIds: true });

      render(<ScriptMessagesBar {...props} />);

      expect(screen.getByText(/underscores or hyphens/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Remove separators/i })).toBeInTheDocument();
    });

    it('should call onRemoveSeparators when button is clicked', () => {
      const onRemoveSeparators = vi.fn();
      const props = createDefaultProps({
        hasSeparatorsInIds: true,
        onRemoveSeparators,
      });

      render(<ScriptMessagesBar {...props} />);

      fireEvent.click(screen.getByRole('button', { name: /Remove separators/i }));

      expect(onRemoveSeparators).toHaveBeenCalledTimes(1);
    });
  });

  describe('Sorting Recommendation', () => {
    it('should display sorting recommendation when has characters and not sorted', () => {
      const props = createDefaultProps({
        characterCount: 5,
        isScriptSorted: false,
      });

      render(<ScriptMessagesBar {...props} />);

      expect(screen.getByText(/not sorted in Standard Order/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sort/i })).toBeInTheDocument();
    });

    it('should not display when no characters', () => {
      const props = createDefaultProps({
        characterCount: 0,
        isScriptSorted: false,
      });

      const { container } = render(<ScriptMessagesBar {...props} />);

      expect(container.firstChild).toBeNull();
    });

    it('should call onSort when button is clicked', () => {
      const onSort = vi.fn();
      const props = createDefaultProps({
        characterCount: 5,
        isScriptSorted: false,
        onSort,
      });

      render(<ScriptMessagesBar {...props} />);

      fireEvent.click(screen.getByRole('button', { name: /Sort/i }));

      expect(onSort).toHaveBeenCalledTimes(1);
    });
  });

  describe('Condensable References Recommendation', () => {
    it('should display condense recommendation', () => {
      const props = createDefaultProps({ hasCondensableRefs: true });

      render(<ScriptMessagesBar {...props} />);

      expect(screen.getByText(/can be simplified/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Condense Script/i })).toBeInTheDocument();
    });

    it('should call onCondense when button is clicked', () => {
      const onCondense = vi.fn();
      const props = createDefaultProps({
        hasCondensableRefs: true,
        onCondense,
      });

      render(<ScriptMessagesBar {...props} />);

      fireEvent.click(screen.getByRole('button', { name: /Condense Script/i }));

      expect(onCondense).toHaveBeenCalledTimes(1);
    });
  });

  describe('Format Issues Recommendation', () => {
    it('should display format issues recommendation', () => {
      const props = createDefaultProps({
        formatIssuesSummary: {
          issuesFound: [
            {
              characterName: 'Empath',
              field: 'firstNightReminder',
              issues: [
                {
                  name: 'html-tag',
                  description: 'Uses HTML tags',
                  matchedText: '<b>text</b>',
                  suggestedFix: 'text',
                },
              ],
            },
          ],
          uniqueIssueTypes: ['Uses HTML tags'],
          totalCharactersAffected: 1,
          totalIssues: 1,
        },
      });

      render(<ScriptMessagesBar {...props} />);

      expect(screen.getByText(/non-standard formats/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Fix Formats/i })).toBeInTheDocument();
    });

    it('should call onFixFormats when button is clicked', () => {
      const onFixFormats = vi.fn();
      const props = createDefaultProps({
        formatIssuesSummary: {
          issuesFound: [
            {
              characterName: 'Empath',
              field: 'firstNightReminder',
              issues: [
                {
                  name: 'html-tag',
                  description: 'Uses HTML tags',
                  matchedText: '<b>text</b>',
                  suggestedFix: 'text',
                },
              ],
            },
          ],
          uniqueIssueTypes: ['Uses HTML tags'],
          totalCharactersAffected: 1,
          totalIssues: 1,
        },
        onFixFormats,
      });

      render(<ScriptMessagesBar {...props} />);

      fireEvent.click(screen.getByRole('button', { name: /Fix Formats/i }));

      expect(onFixFormats).toHaveBeenCalledTimes(1);
    });
  });

  describe('Multiple Recommendations', () => {
    it('should display all applicable recommendations', () => {
      const props = createDefaultProps({
        characterCount: 5,
        needsFormatting: true,
        hasScriptMeta: false,
        isScriptSorted: false,
      });

      render(<ScriptMessagesBar {...props} />);

      expect(screen.getByText(/JSON can be formatted/)).toBeInTheDocument();
      expect(screen.getByText(/doesn't have a/)).toBeInTheDocument();
      expect(screen.getByText(/not sorted/)).toBeInTheDocument();
    });

    it('should display recommendations in correct order', () => {
      const props = createDefaultProps({
        characterCount: 5,
        needsFormatting: true,
        hasScriptMeta: false,
        hasSeparatorsInIds: true,
        isScriptSorted: false,
        hasCondensableRefs: true,
      });

      const { container } = render(<ScriptMessagesBar {...props} />);

      const messages = container.querySelectorAll('[class*="message"]');
      expect(messages.length).toBeGreaterThan(0);
    });
  });

  describe('Combined Errors and Warnings', () => {
    it('should display both error and warnings', () => {
      const props = createDefaultProps({
        error: 'Critical error',
        warnings: ['Warning 1', 'Warning 2'],
      });

      render(<ScriptMessagesBar {...props} />);

      expect(screen.getByText(/Critical error/)).toBeInTheDocument();
      expect(screen.getByText(/Warning 1/)).toBeInTheDocument();
      expect(screen.getByText(/Warning 2/)).toBeInTheDocument();
    });

    it('should count error in visible messages', () => {
      const props = createDefaultProps({
        error: 'Error',
        warnings: ['Warning 1', 'Warning 2', 'Warning 3'],
      });

      render(<ScriptMessagesBar {...props} />);

      // Error + 2 warnings = 3 visible, 1 hidden
      expect(screen.getByText(/Show 1 more/)).toBeInTheDocument();
    });
  });

  describe('Button Titles', () => {
    it('should have descriptive titles for accessibility', () => {
      const props = createDefaultProps({
        needsFormatting: true,
        characterCount: 5,
        hasScriptMeta: false,
        isScriptSorted: false,
        hasCondensableRefs: true,
        hasSeparatorsInIds: true,
        formatIssuesSummary: {
          issuesFound: [
            {
              characterName: 'Test',
              field: 'firstNightReminder',
              issues: [
                { name: 'test', description: 'Test', matchedText: 'test', suggestedFix: 'test' },
              ],
            },
          ],
          uniqueIssueTypes: ['Test'],
          totalCharactersAffected: 1,
          totalIssues: 1,
        },
      });

      render(<ScriptMessagesBar {...props} />);

      expect(screen.getByTitle(/Format JSON with proper indentation/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Add _meta entry/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Sort characters by Standard Amy Order/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Convert object references/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Remove underscores and hyphens/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Normalize HTML tags/i)).toBeInTheDocument();
    });
  });
});
