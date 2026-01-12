/**
 * Night Sheet Printable Component
 *
 * A print-optimized version of NightSheet for PDF export via Snapdom.
 * This component is rendered offscreen and captured to canvas.
 *
 * Key differences from NightSheet:
 * - No drag-and-drop functionality
 * - Fills container (Snapdom scales to DPI during capture)
 * - No interactive states (hover, focus, context menus)
 * - Uses inline styles for consistent capture
 * - All images pre-resolved before rendering
 *
 * Text hiding for hybrid PDF export is handled by the renderer using
 * clip-path on the DOM after text extraction.
 */

import entryStyles from '@/styles/components/script/NightOrderEntry.module.css';
import styles from '@/styles/components/script/NightSheet.module.css';
import { calculateScaleConfig } from '@/ts/nightOrder/index.js';
import type { NightOrderEntry as NightOrderEntryType } from '@/ts/nightOrder/nightOrderTypes.js';
import { getTeamColor, parseAbilityText } from '@/ts/nightOrder/nightOrderUtils.js';
import { getBackgroundImageStyles } from '@/ts/scriptPdf/utils.js';
import type { BackgroundStyle } from '@/ts/types/backgroundEffects.js';
import type { ScriptMeta } from '@/ts/types/index.js';

export type NightSheetType = 'first' | 'other';

interface NightSheetPrintableProps {
  type: NightSheetType;
  entries: NightOrderEntryType[];
  scriptMeta: ScriptMeta | null;
  /** Background style configuration */
  background: BackgroundStyle;
  /** Resolved background image URL (if using image background) */
  resolvedBackgroundUrl?: string | null;
  /** Pre-resolved image URLs (characterId -> resolved URL) */
  resolvedImageUrls: Map<string, string>;
  /** Current page number (1-based) for multi-page exports */
  pageNumber?: number;
  /** Total number of pages for this night type */
  totalPages?: number;
  /** Pre-resolved script logo URL (for CORS safety) */
  resolvedLogoUrl?: string;
}

/**
 * Get the display title for the sheet
 */
function getSheetTitle(type: NightSheetType): string {
  return type === 'first' ? 'First Night' : 'Other Nights';
}

/**
 * Render ability text with bold reminder tokens and circle indicators
 */
function AbilityTextPrintable({ text }: { text: string }) {
  const segments = parseAbilityText(text);

  return (
    <span className={entryStyles.abilityText}>
      {segments.map((segment, index) => {
        const key = `segment-${index}`;
        if (segment.isCircle) {
          return (
            <span key={key} className={entryStyles.reminderCircle}>
              ●
            </span>
          );
        }
        if (segment.isBold) {
          return (
            <strong key={key} className={entryStyles.reminderToken}>
              {segment.text}
            </strong>
          );
        }
        return <span key={key}>{segment.text}</span>;
      })}
    </span>
  );
}

/**
 * Printable night order entry (simplified, no interactivity)
 */
function NightOrderEntryPrintable({
  entry,
  resolvedImageUrl,
}: {
  entry: NightOrderEntryType;
  resolvedImageUrl: string;
}) {
  const teamColor = getTeamColor(entry.team);

  return (
    <div
      className={`${entryStyles.entry} ${entry.type === 'special' ? entryStyles.special : ''}`}
      data-team={entry.team}
      data-type={entry.type}
      style={{
        // Disable hover/pointer effects for print
        cursor: 'default',
        transform: 'none',
        boxShadow: 'none',
      }}
    >
      {/* No drag area in printable version */}

      {/* Character/Special icon */}
      <div className={entryStyles.iconContainer}>
        <img
          src={resolvedImageUrl}
          alt={entry.name}
          className={entryStyles.icon}
          crossOrigin="anonymous"
        />
      </div>

      {/* Content: Name and ability */}
      <div className={entryStyles.content}>
        <div className={entryStyles.name} style={{ color: teamColor }}>
          {entry.name}
        </div>
        <div className={entryStyles.ability}>
          <AbilityTextPrintable text={entry.ability} />
        </div>
      </div>
    </div>
  );
}

export function NightSheetPrintable({
  type,
  entries,
  scriptMeta,
  background,
  resolvedBackgroundUrl,
  resolvedImageUrls,
  pageNumber,
  totalPages,
  resolvedLogoUrl,
}: NightSheetPrintableProps) {
  // Build title with page number if multi-page
  const baseTitle = getSheetTitle(type);
  const title =
    pageNumber && totalPages && totalPages > 1
      ? `${baseTitle} (${pageNumber}/${totalPages})`
      : baseTitle;

  const scriptName = scriptMeta?.name || 'Untitled Script';
  // Use resolved logo URL if provided (CORS-safe), otherwise use original
  const scriptLogo = resolvedLogoUrl || scriptMeta?.logo;

  // Calculate dynamic scaling to fit all entries on one page
  const scaleConfig = calculateScaleConfig(entries);

  // Get background styles (image or solid/gradient from BackgroundStyle)
  const backgroundStyles = getBackgroundImageStyles(background, resolvedBackgroundUrl);

  // Build dynamic style with CSS custom properties for scaling
  // The component fills its container (which is sized for screen display)
  // Snapdom scales up to target DPI during capture
  const sheetStyle: React.CSSProperties = {
    // Fill the container (container is sized at screen dimensions)
    width: '100%',
    height: '100%',
    // Background customization (image or solid color)
    ...backgroundStyles,
    // Fallback for styled backgrounds - use solidColor when not using image
    ...(background.sourceType !== 'image' && {
      backgroundColor: background.solidColor,
    }),
    // CSS custom properties for dynamic scaling
    '--scale-factor': scaleConfig.scaleFactor,
    '--entry-height': `${scaleConfig.entryHeight}in`,
    '--icon-size': `${scaleConfig.iconSize}in`,
    '--name-font-size': `${scaleConfig.nameFontSize}pt`,
    '--ability-font-size': `${scaleConfig.abilityFontSize}pt`,
    '--entry-spacing': `${scaleConfig.entrySpacing}in`,
    '--header-font-size': `${scaleConfig.headerFontSize}rem`,
    // Ensure crisp rendering
    imageRendering: 'auto',
    fontSmooth: 'always',
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
  } as React.CSSProperties;

  // Render entries list
  const renderEntries = () => {
    if (entries.length === 0) {
      return (
        <div className={styles.emptyState}>
          <p>No characters with night actions found.</p>
        </div>
      );
    }

    return entries.map((entry, index) => {
      const resolvedUrl = resolvedImageUrls.get(entry.id) || entry.image;
      return (
        <NightOrderEntryPrintable
          key={`${entry.id}-${index}`}
          entry={entry}
          resolvedImageUrl={resolvedUrl}
        />
      );
    });
  };

  return (
    <div className={styles.sheet} data-night-type={type} style={sheetStyle}>
      {/* Sheet Header */}
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.scriptInfo}>
          {scriptLogo ? (
            <img
              src={scriptLogo}
              alt={scriptName}
              className={styles.scriptLogo}
              crossOrigin="anonymous"
            />
          ) : (
            <span className={styles.scriptName}>{scriptName}</span>
          )}
        </div>
      </header>

      {/* No scaling warning in printable version */}

      {/* Night Order Entries */}
      <div className={styles.entriesContainer}>{renderEntries()}</div>
    </div>
  );
}
