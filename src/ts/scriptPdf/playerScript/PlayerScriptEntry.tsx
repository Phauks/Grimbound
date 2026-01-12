/**
 * PlayerScriptEntry Component
 *
 * Renders a single character entry in the player script with icon, name, and ability.
 * This is a presentational component for PDF rendering - no interactivity.
 */

import styles from '@/styles/components/script/PlayerScript.module.css';
import { PLAYER_SCRIPT_FRONT, TEAM_COLORS } from '../constants.js';
import type { PlayerScriptCharacter } from '../types.js';

/** Jinx icon info for inline display */
export interface JinxIconInfo {
  id: string;
  imageUrl: string;
  name: string;
}

export interface PlayerScriptEntryProps {
  /** Character data to display */
  character: PlayerScriptCharacter;
  /** Resolved image URL for the character icon */
  imageUrl: string;
  /** Whether this is a two-column layout (affects sizing) */
  twoColumn?: boolean;
  /** Whether to show setup indicators (bracketed text styling) */
  showSetup?: boolean;
  /** Whether this character has active jinxes */
  hasJinx?: boolean;
  /** Jinxed character icons to display inline next to name (when inline icons enabled) */
  jinxIcons?: JinxIconInfo[];
  /** Icon scale multiplier (0.5 to 1.5, default 1.0) */
  iconScale?: number;
}

/**
 * Parses ability text and renders bracketed portions (e.g., "[+2 Outsiders]") in bold.
 * The brackets themselves are included in the bold text.
 */
function renderAbilityWithSetupBold(ability: string): React.ReactNode {
  // Match text inside square brackets, including the brackets
  const parts = ability.split(/(\[[^\]]+\])/g);

  return parts.map((part) => {
    // Check if this part is a bracketed section
    if (part.startsWith('[') && part.endsWith(']')) {
      // Use the bracketed content itself as key since it should be unique within ability text
      return (
        <strong key={part} className={styles.setupText}>
          {part}
        </strong>
      );
    }
    // Return plain text fragments (React handles them without explicit keys)
    return part;
  });
}

/**
 * Individual character entry showing icon, name (in team color), and ability text
 */
export function PlayerScriptEntry({
  character,
  imageUrl,
  twoColumn = false,
  jinxIcons = [],
  iconScale = 1.0,
}: PlayerScriptEntryProps): React.ReactElement {
  const teamColor = TEAM_COLORS[character.team] || TEAM_COLORS.townsfolk;

  // Use base icon size for container; iconScale is applied via CSS transform
  // This keeps text position fixed while icon scales "in place"
  const baseIconSize = twoColumn
    ? PLAYER_SCRIPT_FRONT.ENTRY_ICON_SIZE_2COL
    : PLAYER_SCRIPT_FRONT.ENTRY_ICON_SIZE_1COL;

  const nameFontSize = twoColumn
    ? PLAYER_SCRIPT_FRONT.ENTRY_NAME_FONT_SIZE_2COL
    : PLAYER_SCRIPT_FRONT.ENTRY_NAME_FONT_SIZE_1COL;

  const abilityFontSize = twoColumn
    ? PLAYER_SCRIPT_FRONT.ENTRY_ABILITY_FONT_SIZE_2COL
    : PLAYER_SCRIPT_FRONT.ENTRY_ABILITY_FONT_SIZE_1COL;

  return (
    <div
      className={styles.entry}
      style={
        {
          '--team-color': teamColor,
          '--icon-size': `${baseIconSize}in`,
          '--icon-scale': iconScale,
          '--name-font-size': `${nameFontSize}pt`,
          '--ability-font-size': `${abilityFontSize}pt`,
        } as React.CSSProperties
      }
    >
      {/* Character Icon */}
      <div className={styles.iconWrapper}>
        <img src={imageUrl} alt={character.name} className={styles.icon} loading="lazy" />
      </div>

      {/* Name and Ability */}
      <div className={styles.entryContent}>
        <p className={styles.characterName}>
          {character.name}
          {/* Inline jinx icons next to name */}
          {jinxIcons.length > 0 && (
            <span className={styles.inlineJinxIcons}>
              {jinxIcons.map((jinx) => (
                <img
                  key={jinx.id}
                  src={jinx.imageUrl}
                  alt={jinx.name}
                  className={styles.inlineJinxIcon}
                  title={`Jinxed with ${jinx.name}`}
                />
              ))}
            </span>
          )}
        </p>
        <p className={styles.ability}>{renderAbilityWithSetupBold(character.ability)}</p>
      </div>
    </div>
  );
}
