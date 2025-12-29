/**
 * FontOptionsColumn Component
 *
 * Column 3 of FontDrawer: Token-type specific options.
 * - characterText: Display ability text toggle
 * - character: Reminder count settings (show count, style, uniform layout)
 *
 * @module components/Shared/Selectors/FontSettings/FontOptionsColumn
 */

import { memo } from 'react';
import type { TokenType } from '@/components/Shared/Drawer';
import styles from '@/styles/components/shared/FontDrawer.module.css';
import type { ReminderCountStyle, TextLocation } from '@/ts/types/index.js';

/** Token types that use curved text (not ability/meta text which is centered) */
const CURVED_TEXT_TOKEN_TYPES: TokenType[] = ['character', 'meta', 'reminder'];

// ============================================================================
// Types
// ============================================================================

export interface FontOptionsColumnProps {
  /** Currently active token type */
  activeTokenType: TokenType;
  /** Whether ability text is displayed (for characterText) */
  displayAbilityText: boolean;
  /** Called when ability text display is toggled */
  onDisplayAbilityTextChange?: (enabled: boolean) => void;
  /** Whether to show reminder count on character tokens */
  showReminderCount?: boolean;
  /** Called when reminder count toggle changes */
  onShowReminderCountChange?: (enabled: boolean) => void;
  /** Reminder count style (arabic or roman) */
  reminderCountStyle?: ReminderCountStyle;
  /** Called when reminder count style changes */
  onReminderCountStyleChange?: (style: ReminderCountStyle) => void;
  /** Whether to use uniform layout for reminder count */
  reminderCountUniformLayout?: boolean;
  /** Called when uniform layout toggle changes */
  onReminderCountUniformLayoutChange?: (enabled: boolean) => void;
  /** Text location for curved text (bottom or top) */
  textLocation?: TextLocation;
  /** Called when text location changes */
  onTextLocationChange?: (location: TextLocation) => void;
}

// ============================================================================
// Component
// ============================================================================

export const FontOptionsColumn = memo(function FontOptionsColumn({
  activeTokenType,
  displayAbilityText,
  onDisplayAbilityTextChange,
  showReminderCount = true,
  onShowReminderCountChange,
  reminderCountStyle = 'arabic',
  onReminderCountStyleChange,
  reminderCountUniformLayout = false,
  onReminderCountUniformLayoutChange,
  textLocation = 'bottom',
  onTextLocationChange,
}: FontOptionsColumnProps) {
  // Determine if we have options for this token type
  const showTextLocation = CURVED_TEXT_TOKEN_TYPES.includes(activeTokenType);
  const hasOptions =
    activeTokenType === 'characterText' || activeTokenType === 'character' || showTextLocation;

  return (
    <div className={`${styles.column} ${styles.previewColumn}`}>
      <div className={styles.sectionHeader}>Options</div>

      {/* Character Text options */}
      {activeTokenType === 'characterText' && (
        <div className={styles.optionsList}>
          <label className={styles.checkboxOption}>
            <input
              type="checkbox"
              checked={displayAbilityText}
              onChange={(e) => onDisplayAbilityTextChange?.(e.target.checked)}
            />
            <span>Display Ability Text</span>
          </label>
        </div>
      )}

      {/* Text Location - for curved text types (character, meta, reminder) */}
      {showTextLocation && (
        <div className={styles.optionsList}>
          <div className={styles.optionGroup}>
            <span className={styles.optionLabel}>Text Location</span>
            <div className={styles.buttonGroup}>
              <button
                type="button"
                className={`${styles.styleButton} ${textLocation === 'none' ? styles.active : ''}`}
                onClick={() => onTextLocationChange?.('none')}
              >
                None
              </button>
              <button
                type="button"
                className={`${styles.styleButton} ${textLocation === 'bottom' ? styles.active : ''}`}
                onClick={() => onTextLocationChange?.('bottom')}
              >
                Bottom
              </button>
              <button
                type="button"
                className={`${styles.styleButton} ${textLocation === 'top' ? styles.active : ''}`}
                onClick={() => onTextLocationChange?.('top')}
              >
                Top
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Character Name options - Reminder Count */}
      {activeTokenType === 'character' && (
        <div className={styles.optionsList}>
          {/* Show Reminder Count toggle */}
          <label className={styles.checkboxOption}>
            <input
              type="checkbox"
              checked={showReminderCount}
              onChange={(e) => onShowReminderCountChange?.(e.target.checked)}
            />
            <span>Show Reminder Count</span>
          </label>

          {/* Style selection - always visible, disabled when count is off */}
          <div className={`${styles.optionGroup} ${showReminderCount ? '' : styles.disabled}`}>
            <span className={styles.optionLabel}>Number Style</span>
            <div className={styles.buttonGroup}>
              <button
                type="button"
                className={`${styles.styleButton} ${reminderCountStyle === 'arabic' ? styles.active : ''}`}
                onClick={() => onReminderCountStyleChange?.('arabic')}
                disabled={!showReminderCount}
              >
                123
              </button>
              <button
                type="button"
                className={`${styles.styleButton} ${reminderCountStyle === 'roman' ? styles.active : ''}`}
                onClick={() => onReminderCountStyleChange?.('roman')}
                disabled={!showReminderCount}
              >
                III
              </button>
            </div>
          </div>

          {/* Uniform Layout toggle - always visible, disabled when count is off */}
          <label className={`${styles.checkboxOption} ${showReminderCount ? '' : styles.disabled}`}>
            <input
              type="checkbox"
              checked={reminderCountUniformLayout}
              onChange={(e) => onReminderCountUniformLayoutChange?.(e.target.checked)}
              disabled={!showReminderCount}
            />
            <span>Uniform Layout</span>
          </label>
        </div>
      )}

      {/* Other token types - no options */}
      {!hasOptions && <p className={styles.noOptions}>No options for this text type</p>}
    </div>
  );
});

export default FontOptionsColumn;
