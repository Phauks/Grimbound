/**
 * PlayerScriptFront Component
 *
 * Main front page of the player script PDF containing:
 * - Header with script name and author
 * - Team sections (Townsfolk, Outsiders, Minions, Demons)
 * - Footer with copyright
 */

import styles from '@/styles/components/script/PlayerScript.module.css';
import type { ScriptMeta } from '@/ts/types/index.js';
import { FOOTER_TEXT, PLAYER_SCRIPT_FONTS, PLAYER_SCRIPT_FRONT } from '../constants.js';
import type { PlayerScriptCharacter, PlayerScriptSettings } from '../types.js';
import {
  calculateOptimalColumns,
  getBackgroundImageStyles,
  getCharactersWithJinxes,
  groupCharactersByTeam,
  SCRIPT_TEAM_ORDER,
} from '../utils.js';
import { TeamSection } from './TeamSection.js';

export interface PlayerScriptFrontProps {
  /** Script metadata (name, author, logo) */
  scriptMeta: ScriptMeta | null;
  /** Main characters (townsfolk, outsiders, minions, demons) */
  characters: PlayerScriptCharacter[];
  /** Map of character IDs to resolved image URLs */
  imageUrls: Map<string, string>;
  /** Player script settings */
  settings: PlayerScriptSettings;
  /** Resolved background image URL (if using image background) */
  resolvedBackgroundUrl?: string | null;
  /** Page width for rendering (default: 8.5in) */
  pageWidth?: string;
  /** Page height for rendering (default: 11in) */
  pageHeight?: string;
}

/**
 * Front page of the player script with all character roles
 */
export function PlayerScriptFront({
  scriptMeta,
  characters,
  imageUrls,
  settings,
  resolvedBackgroundUrl,
  pageWidth = '8.5in',
  pageHeight = '11in',
}: PlayerScriptFrontProps): React.ReactElement {
  // Group characters by team
  const charactersByTeam = groupCharactersByTeam(characters);

  // Calculate column layout
  const columns =
    settings.columns === 'auto' ? calculateOptimalColumns(characters.length) : settings.columns;

  // Get characters with jinxes for indicators
  const jinxedCharacterIds = getCharactersWithJinxes(
    characters.map((c) => ({
      ...c,
      image: c.image,
      jinxes: c.jinxes,
    }))
  );

  // Get background styles (image or white fallback)
  const backgroundStyles = getBackgroundImageStyles(settings.background, resolvedBackgroundUrl);

  return (
    <div
      className={styles.sheet}
      style={
        {
          ...backgroundStyles,
          width: pageWidth,
          height: pageHeight,
          '--margin-top': `${PLAYER_SCRIPT_FRONT.MARGIN_TOP}in`,
          '--margin-bottom': `${PLAYER_SCRIPT_FRONT.MARGIN_BOTTOM}in`,
          '--margin-left': `${PLAYER_SCRIPT_FRONT.MARGIN_LEFT}in`,
          '--margin-right': `${PLAYER_SCRIPT_FRONT.MARGIN_RIGHT}in`,
          '--title-font': PLAYER_SCRIPT_FONTS.TITLE,
          '--author-font': PLAYER_SCRIPT_FONTS.AUTHOR,
        } as React.CSSProperties
      }
    >
      {/* Header: Script Name & Author */}
      <header className={styles.header}>
        <h1 className={styles.title}>{scriptMeta?.name || 'Untitled Script'}</h1>
        {settings.showAuthor && scriptMeta?.author && (
          <p className={styles.author}>by {scriptMeta.author}</p>
        )}
      </header>

      {/* Main Content: Team Sections */}
      <main className={styles.content}>
        {SCRIPT_TEAM_ORDER.map((team) => {
          const teamChars = charactersByTeam.get(team) || [];
          if (teamChars.length === 0) return null;

          return (
            <TeamSection
              key={team}
              team={team}
              characters={teamChars}
              imageUrls={imageUrls}
              jinxedCharacterIds={jinxedCharacterIds}
              columns={columns}
              showSetup={true}
            />
          );
        })}
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <span>{FOOTER_TEXT.NOT_FIRST_NIGHT}</span>
        <span>{FOOTER_TEXT.COPYRIGHT}</span>
      </footer>
    </div>
  );
}
