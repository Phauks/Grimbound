/**
 * PlayerScriptBack Component
 *
 * Backing sheet of the player script PDF containing:
 * - Night order icons bar (top)
 * - Script name or logo (center)
 * - Player count table (bottom)
 * - Optional jinxes/fabled sections (if configured for back)
 */

import styles from '@/styles/components/script/PlayerScriptBacking.module.css';
import type { ScriptMeta } from '@/ts/types/index.js';
import { PLAYER_SCRIPT_BACK, PLAYER_SCRIPT_FONTS, TEAM_COLORS } from '../constants.js';
import type {
  BackingSheetSettings,
  NightOrderIcon,
  PlayerScriptCharacter,
  PlayerScriptJinx,
  PlayerScriptSettings,
} from '../types.js';
import { getBackgroundImageStyles } from '../utils.js';
import { NightOrderIconsBar } from './NightOrderIconsBar.js';
import { PlayerCountTable } from './PlayerCountTable.js';

export interface PlayerScriptBackProps {
  /** Script metadata (name, author, logo) */
  scriptMeta: ScriptMeta | null;
  /** First night order icons */
  firstNight: NightOrderIcon[];
  /** Other nights order icons */
  otherNight: NightOrderIcon[];
  /** Map of character IDs to resolved image URLs */
  imageUrls: Map<string, string>;
  /** Resolved logo URL (if using logo mode) */
  logoUrl?: string;
  /** Backing sheet settings (controls backing sheet specific options) */
  backingSettings: BackingSheetSettings;
  /** Player script settings (for jinx/fabled location) */
  playerScriptSettings: PlayerScriptSettings;
  /** Resolved background image URL (if using image background) */
  resolvedBackgroundUrl?: string | null;
  /** Fabled characters (if showing on back) */
  fabled?: PlayerScriptCharacter[];
  /** Active jinxes (if showing on back) */
  jinxes?: PlayerScriptJinx[];
  /** Page width for rendering (default: 8.5in) */
  pageWidth?: string;
  /** Page height for rendering (default: 11in) */
  pageHeight?: string;
}

/**
 * Backing sheet of the player script with night order and player count
 */
export function PlayerScriptBack({
  scriptMeta,
  firstNight,
  otherNight,
  imageUrls,
  logoUrl,
  backingSettings,
  playerScriptSettings,
  resolvedBackgroundUrl,
  fabled = [],
  jinxes = [],
  pageWidth = '8.5in',
  pageHeight = '11in',
}: PlayerScriptBackProps): React.ReactElement {
  const showNightOrder = backingSettings.showNightOrderOnBack;
  const showPlayerCount = backingSettings.showPlayerCountOnBack;
  const showLogo = backingSettings.backingContent === 'logo' && logoUrl;
  // Jinxes and fabled are always on back page when enabled
  const showJinxesOnBack = playerScriptSettings.showJinxes;
  const showFabledOnBack = playerScriptSettings.showFabled;

  // Get background styles (uses backingSettings.background, not playerScriptSettings.background)
  const backgroundStyles = getBackgroundImageStyles(
    backingSettings.background,
    resolvedBackgroundUrl
  );

  return (
    <div
      className={styles.sheet}
      style={
        {
          ...backgroundStyles,
          width: pageWidth,
          height: pageHeight,
          '--margin': `${PLAYER_SCRIPT_BACK.MARGIN}in`,
          '--title-font': PLAYER_SCRIPT_FONTS.TITLE,
        } as React.CSSProperties
      }
    >
      {/* Night Order Icons Bar (Top) */}
      {showNightOrder && (firstNight.length > 0 || otherNight.length > 0) && (
        <NightOrderIconsBar firstNight={firstNight} otherNight={otherNight} imageUrls={imageUrls} />
      )}

      {/* Center Content: Script Name or Logo */}
      <div className={styles.centerContent}>
        {showLogo ? (
          <img
            src={logoUrl}
            alt={scriptMeta?.name || 'Script Logo'}
            className={styles.logo}
            style={{
              maxWidth: `${PLAYER_SCRIPT_BACK.LOGO_MAX_WIDTH}in`,
              maxHeight: `${PLAYER_SCRIPT_BACK.LOGO_MAX_HEIGHT}in`,
            }}
          />
        ) : (
          <h1 className={styles.scriptName}>{scriptMeta?.name || 'Untitled Script'}</h1>
        )}

        {/* Jinxes Section (if on back) */}
        {showJinxesOnBack && jinxes.length > 0 && (
          <section className={styles.jinxSection}>
            <h2 className={styles.sectionTitle}>Jinxes</h2>
            {jinxes.map((jinx) => (
              <div key={`${jinx.char1.id}-${jinx.char2.id}`} className={styles.jinxEntry}>
                <div className={styles.jinxIcons}>
                  <img
                    src={imageUrls.get(jinx.char1.id) || jinx.char1.image}
                    alt={jinx.char1.name}
                    className={styles.jinxIcon}
                  />
                  <img
                    src={imageUrls.get(jinx.char2.id) || jinx.char2.image}
                    alt={jinx.char2.name}
                    className={styles.jinxIcon}
                  />
                </div>
                <p className={styles.jinxText}>{jinx.reason}</p>
              </div>
            ))}
          </section>
        )}

        {/* Fabled Section (if on back) */}
        {showFabledOnBack && fabled.length > 0 && (
          <section className={styles.fabledSection}>
            <h2 className={styles.sectionTitle}>Fabled</h2>
            {fabled.map((char) => (
              <div key={char.uuid || char.id} className={styles.fabledEntry}>
                <img
                  src={imageUrls.get(char.id) || char.image}
                  alt={char.name}
                  className={styles.fabledIcon}
                />
                <div className={styles.fabledContent}>
                  <p className={styles.fabledName} style={{ color: TEAM_COLORS.fabled }}>
                    {char.name}
                  </p>
                  <p className={styles.fabledAbility}>{char.ability}</p>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>

      {/* Player Count Table (Bottom) */}
      {showPlayerCount && <PlayerCountTable />}
    </div>
  );
}
