/**
 * PlayerScriptPreview Component
 *
 * Interactive preview of the player script PDF with drag-and-drop character reordering.
 * Shows both front page (roles) and backing sheet side by side at a scaled size.
 */

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useEffect, useState } from 'react';
import { useScriptPdf } from '@/contexts/ScriptPdfContext';
import { useBackgroundImageUrl } from '@/hooks/characters/useBackgroundImageUrl.js';
import { usePlayerScriptOrder } from '@/hooks/scripts/usePlayerScriptOrder';
import nightOrderStyles from '@/styles/components/script/NightOrderView.module.css';
import styles from '@/styles/components/script/PlayerScriptPreview.module.css';
import { tabPreRenderService } from '@/ts/cache/index.js';
import { TEAM_COLORS, TEAM_LABELS } from '@/ts/scriptPdf/constants.js';
import { PlayerCountTable } from '@/ts/scriptPdf/playerScript/PlayerCountTable.js';
import type { JinxIconInfo } from '@/ts/scriptPdf/playerScript/PlayerScriptEntry';
import type {
  BackgroundStyle,
  NightOrderIcon,
  PlayerScriptCharacter,
  PlayerScriptJinx,
} from '@/ts/scriptPdf/types.js';
import {
  extractActiveJinxes,
  getBackgroundImageStyles,
  SCRIPT_TEAM_ORDER,
} from '@/ts/scriptPdf/utils.js';
import type { ScriptMeta, Team } from '@/ts/types/index.js';
import { resolveCharacterImageUrl } from '@/ts/utils/characterImageResolver.js';
import { ScaledPage } from './ScaledPage';
import { SortablePlayerScriptEntry } from './SortablePlayerScriptEntry';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build bootlegger data from scriptMeta.bootlegger
 * Entries can be either character IDs (look up) or rule text strings (display directly)
 */
function buildBootleggerData(
  scriptMeta: ScriptMeta | null,
  characters: PlayerScriptCharacter[]
): { characters: PlayerScriptCharacter[]; rules: string[] } {
  if (!scriptMeta?.bootlegger || scriptMeta.bootlegger.length === 0) {
    return { characters: [], rules: [] };
  }

  const bootleggerChars: PlayerScriptCharacter[] = [];
  const bootleggerRules: string[] = [];

  for (const entry of scriptMeta.bootlegger) {
    // If it contains spaces or is longer than typical ID, treat as rule text
    if (entry.includes(' ') || entry.length > 30) {
      bootleggerRules.push(entry);
    } else {
      // Try to look up as character ID
      const char = characters.find((c) => c.id.toLowerCase() === entry.toLowerCase());
      if (char) {
        bootleggerChars.push(char);
      } else {
        // Couldn't find character, treat as rule text
        bootleggerRules.push(entry);
      }
    }
  }

  return { characters: bootleggerChars, rules: bootleggerRules };
}

/**
 * Build CSS background style from settings
 * Supports image backgrounds, gradients, and solid colors
 */
function buildPageBackgroundStyle(
  background: BackgroundStyle,
  margins?: { top: number; right: number; bottom: number; left: number },
  resolvedImageUrl?: string | null
): React.CSSProperties {
  // Handle image backgrounds using the shared utility
  if (background.sourceType === 'image') {
    const imageStyles = getBackgroundImageStyles(background, resolvedImageUrl);
    return {
      ...imageStyles,
      ...(margins && {
        padding: `${margins.top}in ${margins.right}in ${margins.bottom}in ${margins.left}in`,
      }),
    };
  }

  // Handle gradient and solid color backgrounds
  const baseStyle: React.CSSProperties = {};

  if (background.mode === 'gradient') {
    const { type, colorStart, colorEnd, rotation } = background.gradient;
    let gradientCss: string;
    switch (type) {
      case 'radial':
        gradientCss = `radial-gradient(circle, ${colorStart}, ${colorEnd})`;
        break;
      case 'conic':
        gradientCss = `conic-gradient(from ${rotation}deg, ${colorStart}, ${colorEnd})`;
        break;
      default:
        gradientCss = `linear-gradient(${rotation}deg, ${colorStart}, ${colorEnd})`;
    }
    baseStyle.background = gradientCss;
  } else {
    baseStyle.backgroundColor = background.solidColor;
  }

  if (margins) {
    baseStyle.padding = `${margins.top}in ${margins.right}in ${margins.bottom}in ${margins.left}in`;
  }

  return baseStyle;
}

/**
 * Get night order icons based on settings
 */
function getNightOrderIcons(
  showNightOrderOnBack: boolean,
  firstNightIcons: NightOrderIcon[],
  otherNightIcons: NightOrderIcon[]
): { firstNight: NightOrderIcon[]; otherNight: NightOrderIcon[] } {
  if (showNightOrderOnBack) {
    return { firstNight: firstNightIcons, otherNight: otherNightIcons };
  }
  return { firstNight: [], otherNight: [] };
}

// ============================================================================
// TYPES
// ============================================================================

export interface PlayerScriptPreviewProps {
  /** Characters to display */
  characters: PlayerScriptCharacter[];
  /** Script metadata */
  scriptMeta: ScriptMeta | null;
  /** Map of character IDs to resolved image URLs */
  imageUrls: Map<string, string>;
  /** Logo URL for backing sheet (if using logo mode) */
  logoUrl?: string;
  /** Whether drag-and-drop reordering is enabled */
  enableReordering?: boolean;
  /** Pre-computed first night order icons (optional - if not provided, won't show night order) */
  firstNightIcons?: NightOrderIcon[];
  /** Pre-computed other night order icons (optional - if not provided, won't show night order) */
  otherNightIcons?: NightOrderIcon[];
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

/**
 * Build author/version text for script header
 */
function buildAuthorVersionText(
  scriptMeta: ScriptMeta | null,
  showAuthor: boolean,
  showVersion: boolean
): string | null {
  const parts: string[] = [];
  if (showAuthor && scriptMeta?.author) {
    parts.push(`by ${scriptMeta.author}`);
  }
  if (showVersion && scriptMeta?.version) {
    parts.push(`v${scriptMeta.version}`);
  }
  return parts.length > 0 ? parts.join(' • ') : null;
}

interface ScriptHeaderProps {
  scriptName: string;
  titleStyle: 'centered' | 'compact';
  authorVersionText: string | null;
}

function ScriptHeader({ scriptName, titleStyle, authorVersionText }: ScriptHeaderProps) {
  const isCompact = titleStyle === 'compact';
  return (
    <div className={`${styles.header} ${isCompact ? styles.headerCompact : ''}`}>
      <h1 className={`${styles.scriptName} ${isCompact ? styles.scriptNameCompact : ''}`}>
        {scriptName}
      </h1>
      {authorVersionText && (
        <p className={`${styles.author} ${isCompact ? styles.authorCompact : ''}`}>
          {authorVersionText}
        </p>
      )}
    </div>
  );
}

interface TeamSectionPreviewProps {
  team: Team;
  characters: PlayerScriptCharacter[];
  imageUrls: Map<string, string>;
  jinxes: PlayerScriptJinx[];
  showJinxIconsInline: boolean;
  twoColumn: boolean;
  enableDragDrop: boolean;
  itemIds: string[];
  /** Handler for DndContext onDragStart */
  onDragStart: (event: { active: { id: string | number } }) => void;
  /** Handler for DndContext onDragEnd */
  onDragEnd: (event: DragEndEvent) => void;
  /** Handler for DndContext onDragCancel */
  onDragCancel: () => void;
  /** Whether any item is being dragged */
  isDragging: boolean;
  /** Icon scale multiplier */
  iconScale: number;
}

function TeamSectionPreview({
  team,
  characters,
  imageUrls,
  jinxes,
  showJinxIconsInline,
  twoColumn,
  enableDragDrop,
  itemIds,
  onDragStart,
  onDragEnd,
  onDragCancel,
  isDragging,
  iconScale,
}: TeamSectionPreviewProps) {
  // Configure dnd-kit sensors for this team
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (characters.length === 0) return null;

  const teamLabel = TEAM_LABELS[team] || team.toUpperCase();
  const teamColor = TEAM_COLORS[team] || '#888';

  // Compute jinx icons for each character
  const getJinxIconsForCharacter = (characterId: string): JinxIconInfo[] => {
    if (!showJinxIconsInline) return [];
    const icons: JinxIconInfo[] = [];
    for (const jinx of jinxes) {
      if (jinx.char1.id === characterId) {
        // This character is jinxed with char2
        icons.push({
          id: jinx.char2.id,
          imageUrl: imageUrls.get(jinx.char2.id) || jinx.char2.image,
          name: jinx.char2.name,
        });
      } else if (jinx.char2.id === characterId) {
        // This character is jinxed with char1
        icons.push({
          id: jinx.char1.id,
          imageUrl: imageUrls.get(jinx.char1.id) || jinx.char1.image,
          name: jinx.char1.name,
        });
      }
    }
    return icons;
  };

  return (
    <div className={`${styles.teamSection} ${isDragging ? styles.dragging : ''}`}>
      {/* Vertical team label */}
      <div className={styles.teamLabel} style={{ color: teamColor }} title={teamLabel}>
        {teamLabel.split('').map((letter, i) => (
          <span key={`${team}-${i}-${letter}`} className={styles.teamLetter}>
            {letter}
          </span>
        ))}
      </div>

      {/* Character grid with isolated DndContext per team */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <div
            className={`${styles.characterGrid} ${twoColumn ? styles.twoColumn : ''}`}
            style={
              twoColumn
                ? ({ '--row-count': Math.ceil(characters.length / 2) } as React.CSSProperties)
                : undefined
            }
          >
            {characters.map((char) => (
              <SortablePlayerScriptEntry
                key={char.id}
                character={char}
                imageUrl={imageUrls.get(char.id) || char.image}
                twoColumn={twoColumn}
                jinxIcons={getJinxIconsForCharacter(char.id)}
                enableDragDrop={enableDragDrop}
                iconScale={iconScale}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PlayerScriptPreview({
  characters,
  scriptMeta,
  imageUrls,
  logoUrl,
  enableReordering = true,
  firstNightIcons = [],
  otherNightIcons = [],
}: PlayerScriptPreviewProps) {
  const { settings, updateSettings } = useScriptPdf();
  const ps = settings.playerScript;
  const bs = settings.backingSheet;
  const background = ps.background;
  const backingBackground = bs.background;

  // Use player script-specific icon scale
  const playerScriptIconScale = ps.iconScale;
  // Backing sheet has its own icon scale
  const backingSheetIconScale = bs.iconScale;

  // Backing sheet icon scale style - for CSS transform-based scaling
  const backingIconScaleStyle = { '--icon-scale': backingSheetIconScale } as React.CSSProperties;

  // Build bootlegger data using extracted helper
  const bootleggerData = buildBootleggerData(scriptMeta, characters);

  // Resolve background image URLs if using image backgrounds
  const { resolvedUrl: resolvedFrontBgUrl } = useBackgroundImageUrl({
    imageUrl: background?.sourceType === 'image' ? background.imageUrl : undefined,
  });
  const { resolvedUrl: resolvedBackBgUrl } = useBackgroundImageUrl({
    imageUrl: backingBackground?.sourceType === 'image' ? backingBackground.imageUrl : undefined,
  });

  // Detect background errors: image was requested but failed to resolve
  const hasFrontBgError =
    background?.sourceType === 'image' && background.imageUrl && !resolvedFrontBgUrl;
  const hasBackBgError =
    backingBackground?.sourceType === 'image' && backingBackground.imageUrl && !resolvedBackBgUrl;

  // Build background styles using extracted helper (with resolved image URLs)
  // Skip background styles when error - CSS class will apply error pattern
  const backgroundStyle = hasFrontBgError
    ? {}
    : buildPageBackgroundStyle(background, ps.margins, resolvedFrontBgUrl);
  const backingBackgroundStyle = hasBackBgError
    ? {}
    : buildPageBackgroundStyle(backingBackground, bs.margins, resolvedBackBgUrl);

  // Build class names for pages - add error class if resolution failed
  const frontPageClassName = hasFrontBgError
    ? `${styles.pageContent} ${styles.errorBackground}`
    : styles.pageContent;
  const backingPageClassName = hasBackBgError
    ? `${styles.pageContent} ${styles.errorBackground}`
    : styles.pageContent;

  // Handle order changes
  const handleOrderChange = (newOrder: string[]) => {
    updateSettings({
      playerScript: {
        customOrder: newOrder.length > 0 ? newOrder : undefined,
      },
    });
  };

  // Use the player script order hook
  const {
    charactersByTeam,
    fabled,
    travellers,
    teamItemIds,
    isDragging,
    onDragStart,
    onDragEnd,
    onDragCancel,
    resetToSAO,
    hasCustomOrder,
  } = usePlayerScriptOrder({
    characters,
    customOrder: ps.customOrder,
    onOrderChange: handleOrderChange,
  });

  // Extract jinxes and night order (now controlled by backing sheet settings)
  const jinxes = bs.showJinxes ? extractActiveJinxes(characters) : [];

  // Use pre-computed night order icons from props
  const nightOrderIcons = getNightOrderIcons(
    bs.showNightOrderOnBack,
    firstNightIcons,
    otherNightIcons
  );

  // Determine column layout
  const totalMainChars = Array.from(charactersByTeam.values()).reduce(
    (sum, chars) => sum + chars.length,
    0
  );
  const twoColumn = ps.columns === 2 || (ps.columns === 'auto' && totalMainChars > 16);

  return (
    <div className={styles.previewContainer}>
      {/* Pages Container - Vertical stack like Night Order */}
      <div className={`${nightOrderStyles.sheetsContainer} ${isDragging ? styles.dragging : ''}`}>
        {/* Front Page */}
        <div className={nightOrderStyles.pageWrapper}>
          <ScaledPage>
            <div className={frontPageClassName} style={backgroundStyle}>
              {/* SAO Reset Button - floats in top right of script page */}
              {hasCustomOrder && (
                <button
                  type="button"
                  className={styles.saoResetButton}
                  onClick={resetToSAO}
                  title="Reset to Standard Almanac Order"
                >
                  Reset to SAO
                </button>
              )}

              {/* Header */}
              <ScriptHeader
                scriptName={scriptMeta?.name || 'Untitled Script'}
                titleStyle={ps.titleStyle}
                authorVersionText={buildAuthorVersionText(
                  scriptMeta,
                  ps.showAuthor,
                  ps.showVersion
                )}
              />

              {/* Team Sections */}
              <div className={styles.teamSections}>
                {SCRIPT_TEAM_ORDER.map((team) => {
                  const teamChars = charactersByTeam.get(team) || [];
                  const itemIds = (teamItemIds.get(team) || []) as string[];
                  return (
                    <TeamSectionPreview
                      key={team}
                      team={team}
                      characters={teamChars}
                      imageUrls={imageUrls}
                      jinxes={jinxes}
                      showJinxIconsInline={ps.showJinxIconsInline}
                      twoColumn={twoColumn}
                      enableDragDrop={enableReordering}
                      itemIds={itemIds}
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
                      onDragCancel={onDragCancel}
                      isDragging={isDragging}
                      iconScale={playerScriptIconScale}
                    />
                  );
                })}
              </div>

              {/* Footer */}
              <div className={styles.footer}>
                <span className={styles.footerNote}>*Not the first night</span>
                <span className={styles.footerCopyright}>© bloodontheclocktower.com</span>
              </div>
            </div>
          </ScaledPage>
        </div>

        {/* Backing Sheet - Always included with player script */}
        <div className={nightOrderStyles.pageWrapper}>
          <ScaledPage>
            <div className={backingPageClassName} style={backingBackgroundStyle}>
              {/* Night Order Icons - Show all with wrapping */}
              {bs.showNightOrderOnBack && (
                <NightOrderBar
                  firstNight={nightOrderIcons.firstNight}
                  otherNight={nightOrderIcons.otherNight}
                  iconScaleStyle={backingIconScaleStyle}
                />
              )}

              {/* Center Content */}
              <div className={styles.centerContent}>
                {bs.backingContent === 'logo' && logoUrl && (
                  <img src={logoUrl} alt="Script Logo" className={styles.logo} />
                )}
                {bs.backingContent === 'name' && (
                  <h1 className={styles.backingScriptName}>
                    {scriptMeta?.name || 'Untitled Script'}
                  </h1>
                )}

                {/* Jinxes */}
                {bs.showJinxes && jinxes.length > 0 && (
                  <div className={styles.jinxSection}>
                    <h3 className={styles.sectionLabel}>Jinxes</h3>
                    {jinxes.map((jinx) => (
                      <JinxEntry
                        key={`${jinx.char1.id}-${jinx.char2.id}`}
                        jinx={jinx}
                        iconScaleStyle={backingIconScaleStyle}
                      />
                    ))}
                  </div>
                )}

                {/* Fabled */}
                {bs.showFabled && (
                  <CharacterSection
                    characters={fabled}
                    sectionClass={styles.fabledSection}
                    label="Fabled"
                    entryClass={styles.fabledEntry}
                    iconWrapperClass={styles.fabledIconWrapper}
                    iconClass={styles.fabledIcon}
                    nameClass={styles.fabledName}
                    abilityClass={styles.fabledAbility}
                    iconScaleStyle={backingIconScaleStyle}
                    nameColor={TEAM_COLORS.fabled}
                  />
                )}

                {/* Travellers */}
                {bs.showTravellers && (
                  <CharacterSection
                    characters={travellers}
                    sectionClass={styles.travellersSection}
                    label="Travellers"
                    entryClass={styles.travellerEntry}
                    iconWrapperClass={styles.travellerIconWrapper}
                    iconClass={styles.travellerIcon}
                    nameClass={styles.travellerName}
                    abilityClass={styles.travellerAbility}
                    iconScaleStyle={backingIconScaleStyle}
                  />
                )}

                {/* Bootlegger */}
                {bs.showBootlegger && (
                  <BootleggerSection
                    characters={bootleggerData.characters}
                    rules={bootleggerData.rules}
                    iconScaleStyle={backingIconScaleStyle}
                  />
                )}
              </div>

              {/* Player Count Table */}
              {bs.showPlayerCountOnBack && <PlayerCountTable />}
            </div>
          </ScaledPage>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/**
 * Image component that resolves URLs using SSOT utility
 * Same pattern as NightOrderEntry for consistent image loading
 */
interface ResolvedImageProps {
  characterId: string;
  fallbackUrl: string;
  alt: string;
  className?: string;
  title?: string;
  style?: React.CSSProperties;
}

function ResolvedImage({
  characterId,
  fallbackUrl,
  alt,
  className,
  title,
  style,
}: ResolvedImageProps) {
  // Check for pre-cached image URL first
  const cachedImageUrl = tabPreRenderService.getCachedCharacterImageUrl(characterId);
  // Start with cached URL, then fallback URL, so we always have something to render
  const [resolvedUrl, setResolvedUrl] = useState<string>(cachedImageUrl || fallbackUrl);

  useEffect(() => {
    if (cachedImageUrl) {
      setResolvedUrl(cachedImageUrl);
      return;
    }

    // Start with fallback to ensure image is visible
    setResolvedUrl(fallbackUrl);

    let cancelled = false;
    const blobUrls: string[] = [];

    resolveCharacterImageUrl(fallbackUrl, characterId, { logContext: 'PlayerScriptPreview' })
      .then((result) => {
        if (!cancelled) {
          if (result.blobUrl) blobUrls.push(result.blobUrl);
          setResolvedUrl(result.url);
        }
      })
      .catch(() => {
        // Already showing fallback, no action needed
      });

    return () => {
      cancelled = true;
      for (const url of blobUrls) URL.revokeObjectURL(url);
    };
  }, [fallbackUrl, characterId, cachedImageUrl]);

  if (!resolvedUrl) return null;
  return <img src={resolvedUrl} alt={alt} className={className} title={title} style={style} />;
}

interface JinxEntryProps {
  jinx: PlayerScriptJinx;
  iconScaleStyle: React.CSSProperties;
}

function JinxEntry({ jinx, iconScaleStyle }: JinxEntryProps) {
  return (
    <div className={styles.jinxEntry}>
      <div className={styles.jinxIcons}>
        <div className={styles.jinxIconWrapper}>
          <ResolvedImage
            characterId={jinx.char1.id}
            fallbackUrl={jinx.char1.image}
            alt={jinx.char1.name}
            className={styles.jinxIcon}
            style={iconScaleStyle}
          />
        </div>
        <div className={styles.jinxIconWrapper}>
          <ResolvedImage
            characterId={jinx.char2.id}
            fallbackUrl={jinx.char2.image}
            alt={jinx.char2.name}
            className={styles.jinxIcon}
            style={iconScaleStyle}
          />
        </div>
      </div>
      <p className={styles.jinxText}>{jinx.reason}</p>
    </div>
  );
}

// ============================================================================
// BACKING SHEET SECTION COMPONENTS (extracted to reduce main component complexity)
// ============================================================================

interface NightOrderBarProps {
  firstNight: NightOrderIcon[];
  otherNight: NightOrderIcon[];
  iconScaleStyle: React.CSSProperties;
}

function NightOrderBar({ firstNight, otherNight, iconScaleStyle }: NightOrderBarProps) {
  return (
    <div className={styles.nightOrderBar}>
      <div className={styles.nightOrderRow}>
        <span className={styles.nightOrderLabel}>First Night:</span>
        <div className={styles.nightOrderIcons}>
          {firstNight.map((icon) => (
            <div key={`first-${icon.id}`} className={styles.nightOrderIconWrapper}>
              <ResolvedImage
                characterId={icon.id}
                fallbackUrl={icon.image}
                alt={icon.name || icon.id}
                title={icon.name}
                className={styles.nightOrderIcon}
                style={iconScaleStyle}
              />
            </div>
          ))}
        </div>
      </div>
      <div className={styles.nightOrderRow}>
        <span className={styles.nightOrderLabel}>Other Nights:</span>
        <div className={styles.nightOrderIcons}>
          {otherNight.map((icon) => (
            <div key={`other-${icon.id}`} className={styles.nightOrderIconWrapper}>
              <ResolvedImage
                characterId={icon.id}
                fallbackUrl={icon.image}
                alt={icon.name || icon.id}
                title={icon.name}
                className={styles.nightOrderIcon}
                style={iconScaleStyle}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface CharacterSectionProps {
  characters: PlayerScriptCharacter[];
  sectionClass: string;
  label: string;
  entryClass: string;
  iconWrapperClass: string;
  iconClass: string;
  nameClass: string;
  abilityClass: string;
  iconScaleStyle: React.CSSProperties;
  nameColor?: string;
}

function CharacterSection({
  characters,
  sectionClass,
  label,
  entryClass,
  iconWrapperClass,
  iconClass,
  nameClass,
  abilityClass,
  iconScaleStyle,
  nameColor,
}: CharacterSectionProps) {
  if (characters.length === 0) return null;

  return (
    <div className={sectionClass}>
      <h3 className={styles.sectionLabel}>{label}</h3>
      {characters.map((char) => (
        <div key={char.id} className={entryClass}>
          <div className={iconWrapperClass}>
            <ResolvedImage
              characterId={char.id}
              fallbackUrl={char.image}
              alt={char.name}
              className={iconClass}
              style={iconScaleStyle}
            />
          </div>
          <div>
            <span className={nameClass} style={nameColor ? { color: nameColor } : undefined}>
              {char.name}
            </span>
            <p className={abilityClass}>{char.ability}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

interface BootleggerSectionProps {
  characters: PlayerScriptCharacter[];
  rules: string[];
  iconScaleStyle: React.CSSProperties;
}

function BootleggerSection({ characters, rules, iconScaleStyle }: BootleggerSectionProps) {
  if (characters.length === 0 && rules.length === 0) return null;

  return (
    <div className={styles.bootleggerSection}>
      <h3 className={styles.sectionLabel}>Bootlegger</h3>
      {characters.map((char) => (
        <div key={char.id} className={styles.bootleggerEntry}>
          <div className={styles.bootleggerIconWrapper}>
            <ResolvedImage
              characterId={char.id}
              fallbackUrl={char.image}
              alt={char.name}
              className={styles.bootleggerIcon}
              style={iconScaleStyle}
            />
          </div>
          <div>
            <span className={styles.bootleggerName}>{char.name}</span>
            <p className={styles.bootleggerAbility}>{char.ability}</p>
          </div>
        </div>
      ))}
      {rules.map((rule) => (
        <div key={rule} className={styles.bootleggerEntry}>
          <div className={styles.bootleggerIconWrapper}>
            <ResolvedImage
              characterId="bootlegger"
              fallbackUrl="/images/icons/bootlegger.webp"
              alt="Bootlegger"
              className={styles.bootleggerIcon}
              style={iconScaleStyle}
            />
          </div>
          <p className={styles.bootleggerAbility}>{rule}</p>
        </div>
      ))}
    </div>
  );
}
