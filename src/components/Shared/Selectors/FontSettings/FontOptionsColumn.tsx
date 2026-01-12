/**
 * FontOptionsColumn Component
 *
 * Column 3 of FontDrawer: Token-type specific options.
 * - characterText: Display ability text toggle
 * - character/meta/reminder: Text location (none/bottom/top)
 *
 * @module components/Shared/Selectors/FontSettings/FontOptionsColumn
 */

import type { TokenType } from '@/components/Shared/Drawer';
import styles from '@/styles/components/shared/FontDrawer.module.css';
import type { TextLocation } from '@/ts/types/index.js';

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
  /** Text location for curved text (bottom or top) */
  textLocation?: TextLocation;
  /** Called when text location changes */
  onTextLocationChange?: (location: TextLocation) => void;
}

// ============================================================================
// Component
// ============================================================================

export function FontOptionsColumn({
  activeTokenType,
  displayAbilityText,
  onDisplayAbilityTextChange,
  textLocation = 'bottom',
  onTextLocationChange,
}: FontOptionsColumnProps) {
  // Determine if we have options for this token type
  const showTextLocation = CURVED_TEXT_TOKEN_TYPES.includes(activeTokenType);
  const hasOptions = activeTokenType === 'characterText' || showTextLocation;

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

      {/* Other token types - no options */}
      {!hasOptions && <p className={styles.noOptions}>No options for this text type</p>}
    </div>
  );
}
