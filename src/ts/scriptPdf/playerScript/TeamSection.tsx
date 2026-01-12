/**
 * TeamSection Component
 *
 * Renders a team section with vertical label and character entries grid.
 */

import styles from '@/styles/components/script/PlayerScript.module.css';
import type { Team } from '@/ts/types/index.js';
import { TEAM_COLORS, TEAM_LABELS } from '../constants.js';
import type { PlayerScriptCharacter } from '../types.js';
import { PlayerScriptEntry } from './PlayerScriptEntry.js';

export interface TeamSectionProps {
  /** Team type for this section */
  team: Team;
  /** Characters in this team */
  characters: PlayerScriptCharacter[];
  /** Map of character IDs to resolved image URLs */
  imageUrls: Map<string, string>;
  /** Set of character IDs that have active jinxes */
  jinxedCharacterIds?: Set<string>;
  /** Number of columns (1 or 2) */
  columns: 1 | 2;
  /** Whether to show setup indicators */
  showSetup?: boolean;
}

/**
 * Team section with vertical label (T-O-W-N-S-F-O-L-K style) and character grid
 */
export function TeamSection({
  team,
  characters,
  imageUrls,
  jinxedCharacterIds,
  columns,
  showSetup = true,
}: TeamSectionProps): React.ReactElement | null {
  // Don't render empty sections
  if (characters.length === 0) {
    return null;
  }

  const teamColor = TEAM_COLORS[team] || TEAM_COLORS.townsfolk;
  const teamLabel = TEAM_LABELS[team] || team.toUpperCase();
  const twoColumn = columns === 2;

  return (
    <div
      className={styles.teamSection}
      style={{ '--team-color': teamColor } as React.CSSProperties}
    >
      {/* Vertical Team Label */}
      <div className={styles.teamLabel} title={teamLabel}>
        {teamLabel.split('').map((letter: string, position: number) => (
          <span key={`${team}-${position}-${letter}`} className={styles.teamLetter}>
            {letter}
          </span>
        ))}
      </div>

      {/* Character Grid */}
      <div
        className={`${styles.characterGrid} ${twoColumn ? styles.twoColumns : styles.oneColumn}`}
      >
        {characters.map((character) => {
          const imageUrl = imageUrls.get(character.id) || '';
          const hasJinx = jinxedCharacterIds?.has(character.id.toLowerCase()) ?? false;

          return (
            <PlayerScriptEntry
              key={character.uuid || character.id}
              character={character}
              imageUrl={imageUrl}
              twoColumn={twoColumn}
              showSetup={showSetup}
              hasJinx={hasJinx}
            />
          );
        })}
      </div>
    </div>
  );
}
