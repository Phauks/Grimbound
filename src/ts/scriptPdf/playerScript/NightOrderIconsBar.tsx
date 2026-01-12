/**
 * NightOrderIconsBar Component
 *
 * Displays compact night order icons in a horizontal bar for the backing sheet.
 * Shows First Night and Other Nights rows with character icons only (no ability text).
 */

import styles from '@/styles/components/script/PlayerScriptBacking.module.css';
import { PLAYER_SCRIPT_BACK } from '../constants.js';
import type { NightOrderIcon } from '../types.js';

export interface NightOrderIconsBarProps {
  /** First night order icons */
  firstNight: NightOrderIcon[];
  /** Other nights order icons */
  otherNight: NightOrderIcon[];
  /** Map of character IDs to resolved image URLs */
  imageUrls: Map<string, string>;
}

/**
 * Compact night order display with icons only
 */
export function NightOrderIconsBar({
  firstNight,
  otherNight,
  imageUrls,
}: NightOrderIconsBarProps): React.ReactElement {
  const iconSize = PLAYER_SCRIPT_BACK.NIGHT_ORDER_ICON_SIZE;

  return (
    <div className={styles.nightOrderBar}>
      {/* First Night Row */}
      <div className={styles.nightOrderRow}>
        <span className={styles.nightOrderLabel}>First Night:</span>
        <div className={styles.nightOrderIcons}>
          {firstNight.map((icon) => (
            <img
              key={`first-${icon.id}`}
              src={imageUrls.get(icon.id) || icon.image}
              alt={icon.name}
              title={icon.name}
              className={styles.nightOrderIcon}
              style={{ width: `${iconSize}in`, height: `${iconSize}in` }}
            />
          ))}
        </div>
      </div>

      {/* Other Nights Row */}
      <div className={styles.nightOrderRow}>
        <span className={styles.nightOrderLabel}>Other Nights:</span>
        <div className={styles.nightOrderIcons}>
          {otherNight.map((icon) => (
            <img
              key={`other-${icon.id}`}
              src={imageUrls.get(icon.id) || icon.image}
              alt={icon.name}
              title={icon.name}
              className={styles.nightOrderIcon}
              style={{ width: `${iconSize}in`, height: `${iconSize}in` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
