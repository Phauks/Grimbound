import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTokenContext } from '@/contexts/TokenContext';
import { useTokenGenerator } from '@/hooks/tokens/useTokenGenerator';
import styles from '@/styles/components/tokens/TokenPreviewRow.module.css';
import { CONFIG } from '@/ts/config.js';
import { calculateTokenCounts, getBestPreviewCharacter } from '@/ts/data/characterUtils';
import { calculateTokenCountsByType, TokenGenerator } from '@/ts/generation/index.js';
import type {
  Character,
  GenerationOptions,
  Jinx,
  ScriptMeta,
  Token,
  TokenType,
} from '@/ts/types/index.js';
import { logger } from '@/ts/utils/logger.js';
import { sanitizeFilename } from '@/ts/utils/stringUtils.js';

/** Result of sample character selection */
interface SampleCharacterResult {
  sampleCharacter: Character;
  wasAutoSelected: boolean;
  selectedReminderText: string | null;
}

/**
 * Determines the sample character to display in preview.
 * Extracted to reduce cognitive complexity.
 */
function selectSampleCharacter(
  characters: Character[],
  exampleToken: Token | null,
  fallback: Character
): SampleCharacterResult {
  if (characters.length === 0) {
    return { sampleCharacter: fallback, wasAutoSelected: false, selectedReminderText: null };
  }

  // Character token selected - find matching character
  if (exampleToken?.type === 'character') {
    const found = characters.find((char) => char.name === exampleToken.name);
    if (found) {
      return { sampleCharacter: found, wasAutoSelected: false, selectedReminderText: null };
    }
  }

  // Reminder token selected - find parent character
  if (exampleToken?.type === 'reminder') {
    const parentName = exampleToken.parentCharacter || exampleToken.name;
    const found = characters.find((char) => char.name === parentName);
    if (found) {
      return {
        sampleCharacter: found,
        wasAutoSelected: false,
        selectedReminderText: exampleToken.reminderText || null,
      };
    }
  }

  // Auto-select best preview character
  return {
    sampleCharacter: getBestPreviewCharacter(characters) || fallback,
    wasAutoSelected: true,
    selectedReminderText: null,
  };
}

/**
 * Creates an auto-selected token object for context.
 */
function createAutoSelectedToken(
  character: Character,
  canvas: HTMLCanvasElement,
  dpi: number
): Token {
  const diameter = CONFIG.TOKEN.ROLE_DIAMETER_INCHES * dpi;
  return {
    type: 'character',
    name: character.name,
    filename: sanitizeFilename(`${character.name}.png`),
    team: character.team,
    canvas,
    diameter,
    characterData: character,
    hasReminders: (character.reminders?.length ?? 0) > 0,
    reminderCount: character.reminders?.length ?? 0,
  };
}

/**
 * Helper to generate meta token canvas based on token type.
 * Extracted to reduce cognitive complexity of generatePreview callback.
 */
async function generateMetaTokenCanvas(
  generator: TokenGenerator,
  metaTokenType: TokenType | undefined,
  scriptMeta: ScriptMeta | null | undefined,
  generationOptions: GenerationOptions,
  exampleMetaToken: Token | null
): Promise<HTMLCanvasElement> {
  const scriptName = scriptMeta?.name || 'Script Name';
  const scriptAuthor = scriptMeta?.author || 'Author';
  const hideAuthor = generationOptions.hideScriptNameAuthor ?? false;

  switch (metaTokenType) {
    case 'almanac': {
      const almanacUrl = scriptMeta?.almanac || '';
      const scriptLogo = scriptMeta?.logo;
      return generator.generateAlmanacQRToken(almanacUrl, scriptName, scriptLogo);
    }
    case 'pandemonium':
      return generator.generatePandemoniumToken();
    case 'bootlegger': {
      const bootleggerRules = scriptMeta?.bootlegger || [];
      const abilityText = bootleggerRules[0] || 'Sample Bootlegger Rule Text';
      return generator.generateBootleggerToken(abilityText);
    }
    case 'jinx': {
      // Use jinxData from the token to regenerate with current options
      const jinxData = exampleMetaToken?.jinxData;
      if (jinxData) {
        const jinx: Jinx = { id: jinxData.char2.id, reason: jinxData.reason };
        const char1: Character = {
          id: jinxData.char1.id,
          uuid: jinxData.char1.id, // Use id as uuid for image resolution
          name: jinxData.char1.name,
          image: jinxData.char1.image,
          team: 'townsfolk', // Team doesn't matter for jinx rendering
          ability: '',
        };
        const char2: Character = {
          id: jinxData.char2.id,
          uuid: jinxData.char2.id, // Use id as uuid for image resolution
          name: jinxData.char2.name,
          image: jinxData.char2.image,
          team: 'townsfolk',
          ability: '',
        };
        return generator.generateJinxToken(jinx, char1, char2);
      }
      // Fallback to script name if no jinx data
      return generator.generateScriptNameToken(scriptName, scriptAuthor, hideAuthor);
    }
    default:
      return generator.generateScriptNameToken(scriptName, scriptAuthor, hideAuthor);
  }
}

// Sample character for preview when no script is loaded
// Uses 'washerwoman' as id so sync storage can resolve the icon
const SAMPLE_CHARACTER: Character = {
  id: 'washerwoman',
  name: 'Washerwoman',
  team: 'townsfolk',
  ability: 'You start knowing that 1 of 2 players is a particular Townsfolk.',
  image: 'washerwoman.webp', // Extension needed for sync storage lookup
  reminders: ['Townsfolk', 'Wrong'],
  setup: false,
};

/** Props for TokenPreviewImage subcomponent */
interface TokenPreviewImageProps {
  canvas: HTMLCanvasElement | null;
  isGenerating: boolean;
  alt: string;
  label: string;
  emptyText: string;
  imageClassName?: string;
  placeholderClassName?: string;
}

/** Extracted component to reduce parent complexity */
function TokenPreviewImage({
  canvas,
  isGenerating,
  alt,
  label,
  emptyText,
  imageClassName = '',
  placeholderClassName = '',
}: TokenPreviewImageProps) {
  return (
    <div className={styles.tokenWrapper}>
      {canvas ? (
        <img
          src={canvas.toDataURL('image/png')}
          alt={alt}
          className={`${styles.tokenImage} ${imageClassName}`.trim()}
        />
      ) : (
        <div className={`${styles.tokenPlaceholder} ${placeholderClassName}`.trim()}>
          {isGenerating ? '...' : emptyText}
        </div>
      )}
      <span className={styles.tokenLabel}>{label}</span>
    </div>
  );
}

/**
 * Props for TokenPreviewRow component.
 * All props are optional - when not provided, values are sourced from TokenContext.
 */
export interface TokenPreviewRowProps {
  /** Characters array - if provided, uses this instead of context */
  characters?: Character[];
  /** Tokens array - if provided, uses this instead of context */
  tokens?: Token[];
  /** Generation options - if provided, uses this instead of context */
  generationOptions?: GenerationOptions;
  /** Script metadata - if provided, uses this instead of context */
  scriptMeta?: ScriptMeta | null;
  /** External loading state - if provided, uses this instead of context */
  isLoading?: boolean;
  /** Whether to show the Generate button (default: true) */
  showGenerateButton?: boolean;
  /** Whether to show the auto-regenerate toggle (default: true) */
  showAutoRegenerate?: boolean;
  /** Custom generate handler - if provided, uses this instead of generateTokens() */
  onGenerate?: () => void;
}

export function TokenPreviewRow({
  characters: propCharacters,
  generationOptions: propGenerationOptions,
  scriptMeta: propScriptMeta,
  isLoading: propIsLoading,
  showGenerateButton = true,
  showAutoRegenerate = true,
  onGenerate,
}: TokenPreviewRowProps = {}) {
  // Get context values (used as fallbacks when props not provided)
  const context = useTokenContext();
  const {
    generateTokens,
    regenerateCharacterTokens,
    regenerateReminderTokens,
    regenerateMetaTokens,
  } = useTokenGenerator();

  // Use props if provided, otherwise fall back to context
  const characters = propCharacters ?? context.characters;
  const generationOptions = propGenerationOptions ?? context.generationOptions;
  const scriptMeta = propScriptMeta ?? context.scriptMeta;
  const isLoading = propIsLoading ?? context.isLoading;

  // These are only used when in context mode (no props provided)
  const exampleCharacterToken = propCharacters ? null : context.exampleCharacterToken;
  const setExampleCharacterToken = propCharacters ? () => {} : context.setExampleCharacterToken;
  const exampleMetaToken = propCharacters ? null : context.exampleMetaToken;

  const [previewCharCanvas, setPreviewCharCanvas] = useState<HTMLCanvasElement | null>(null);
  const [previewReminderCanvas, setPreviewReminderCanvas] = useState<HTMLCanvasElement | null>(
    null
  );
  const [previewMetaCanvas, setPreviewMetaCanvas] = useState<HTMLCanvasElement | null>(null);
  const [autoRegenerate, setAutoRegenerate] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  const optionsRef = useRef(generationOptions);
  // Guard to prevent duplicate preview generation (React StrictMode double-mounts)
  const isGeneratingRef = useRef(false);

  // Get sample character from exampleCharacterToken using extracted helper
  const { sampleCharacter, wasAutoSelected, selectedReminderText } = useMemo(
    () => selectSampleCharacter(characters, exampleCharacterToken, SAMPLE_CHARACTER),
    [characters, exampleCharacterToken]
  );

  // Generate preview tokens - always regenerate fresh to ensure all settings changes are reflected
  const generatePreview = useCallback(async () => {
    // Prevent duplicate generation (React StrictMode double-mounts)
    if (isGeneratingRef.current) {
      return;
    }
    isGeneratingRef.current = true;

    setIsGeneratingPreview(true);
    try {
      // Pass scriptMeta logo to generator options
      const generatorOptions = {
        ...generationOptions,
        logoUrl: scriptMeta?.logo,
      };
      const generator = new TokenGenerator(generatorOptions);

      const charCanvas = await generator.generateCharacterToken(sampleCharacter);
      setPreviewCharCanvas(charCanvas);

      // Set auto-selected character as example token (if auto-selected and not sample Washerwoman)
      if (wasAutoSelected && sampleCharacter !== SAMPLE_CHARACTER) {
        const dpi = generationOptions.dpi || CONFIG.PDF.DPI;
        setExampleCharacterToken(createAutoSelectedToken(sampleCharacter, charCanvas, dpi));
      }

      // Generate reminder token - use selected reminder if user picked one, otherwise first reminder
      const reminders = sampleCharacter.reminders ?? [];
      if (reminders.length > 0) {
        const reminderText =
          selectedReminderText && reminders.includes(selectedReminderText)
            ? selectedReminderText
            : reminders[0];
        const reminderCanvas = await generator.generateReminderToken(sampleCharacter, reminderText);
        setPreviewReminderCanvas(reminderCanvas);
      } else {
        setPreviewReminderCanvas(null);
      }

      // Generate meta token using helper function
      const metaCanvas = await generateMetaTokenCanvas(
        generator,
        exampleMetaToken?.type,
        scriptMeta,
        generationOptions,
        exampleMetaToken
      );
      setPreviewMetaCanvas(metaCanvas);
    } catch (error) {
      logger.error('TokenPreviewRow', 'Failed to generate preview', error);
    } finally {
      setIsGeneratingPreview(false);
      isGeneratingRef.current = false;
    }
  }, [
    generationOptions,
    sampleCharacter,
    scriptMeta,
    exampleMetaToken,
    selectedReminderText,
    wasAutoSelected,
    setExampleCharacterToken,
  ]);

  // Generate preview on mount and when options change
  useEffect(() => {
    generatePreview();
  }, [generatePreview]);

  // Auto-regenerate all tokens when options change (if enabled)
  useEffect(() => {
    // Skip initial render
    if (optionsRef.current === generationOptions) return;
    optionsRef.current = generationOptions;

    if (autoRegenerate && characters.length > 0 && !isLoading) {
      generateTokens();
    }
  }, [generationOptions, autoRegenerate, characters.length, isLoading, generateTokens]);

  // Handle apply to all tokens - use custom handler or default
  const handleApplyToAll = useCallback(() => {
    if (characters.length === 0) return;
    (onGenerate ?? generateTokens)();
  }, [characters.length, onGenerate, generateTokens]);

  // Calculate token counts - use upfront calculation so meta count doesn't increment during generation
  const counts = calculateTokenCounts(characters);
  const tokenCounts = calculateTokenCountsByType(characters, generationOptions, scriptMeta);
  const metaTokenCount = tokenCounts.meta;
  // Don't include meta tokens in total character count
  const totalCharacters = counts.total.characters;
  const totalReminders = counts.total.reminders;

  // Team breakdown data (excluding meta from the list - shown separately)
  const teamBreakdown = [
    {
      label: 'Townsfolk',
      chars: counts.townsfolk.characters,
      reminders: counts.townsfolk.reminders,
    },
    { label: 'Outsider', chars: counts.outsider.characters, reminders: counts.outsider.reminders },
    { label: 'Minion', chars: counts.minion.characters, reminders: counts.minion.reminders },
    { label: 'Demon', chars: counts.demon.characters, reminders: counts.demon.reminders },
    {
      label: 'Traveller',
      chars: counts.traveller.characters,
      reminders: counts.traveller.reminders,
    },
    { label: 'Fabled', chars: counts.fabled.characters, reminders: counts.fabled.reminders },
    {
      label: 'Loric',
      chars: counts.loric?.characters ?? 0,
      reminders: counts.loric?.reminders ?? 0,
    },
  ];

  return (
    <div className={styles.container} data-preview-row>
      <div className={styles.previewSection}>
        <div className={styles.tokenColumn}>
          <div className={styles.tokenPreview}>
            <TokenPreviewImage
              canvas={previewCharCanvas}
              isGenerating={isGeneratingPreview}
              alt="Character token preview"
              label="Character"
              emptyText="No preview"
            />
            <TokenPreviewImage
              canvas={previewReminderCanvas}
              isGenerating={isGeneratingPreview}
              alt="Reminder token preview"
              label="Reminder"
              emptyText="No reminder"
              imageClassName={styles.reminderImage}
              placeholderClassName={styles.reminderPlaceholder}
            />
            <TokenPreviewImage
              canvas={previewMetaCanvas}
              isGenerating={isGeneratingPreview}
              alt="Meta token preview"
              label="Meta"
              emptyText="No meta"
            />
          </div>

          {(showGenerateButton || showAutoRegenerate) && (
            <div className={styles.actionsRow}>
              <div className={styles.generateGroup}>
                {showGenerateButton && (
                  <button
                    type="button"
                    className={styles.generateBtn}
                    onClick={handleApplyToAll}
                    disabled={isLoading || characters.length === 0}
                    title="Generate all tokens with current options"
                  >
                    {isLoading ? 'Generating...' : 'Generate All'}
                  </button>
                )}
                {showAutoRegenerate && (
                  <button
                    type="button"
                    className={`${styles.autoBtn} ${autoRegenerate ? styles.autoBtnActive : ''}`}
                    onClick={() => setAutoRegenerate(!autoRegenerate)}
                    title={autoRegenerate ? 'Auto-regenerate enabled' : 'Enable auto-regenerate'}
                  >
                    🔄
                  </button>
                )}
              </div>
              {showGenerateButton && (
                <div className={styles.partialGroup}>
                  <button
                    type="button"
                    className={styles.partialBtnFirst}
                    onClick={() => regenerateCharacterTokens()}
                    disabled={isLoading || characters.length === 0}
                    title="Regenerate character tokens only"
                  >
                    Character
                  </button>
                  <button
                    type="button"
                    className={styles.partialBtnMiddle}
                    onClick={() => regenerateReminderTokens()}
                    disabled={isLoading || characters.length === 0}
                    title="Regenerate reminder tokens only"
                  >
                    Reminder
                  </button>
                  <button
                    type="button"
                    className={styles.partialBtnLast}
                    onClick={() => regenerateMetaTokens()}
                    disabled={isLoading || characters.length === 0}
                    title="Regenerate meta tokens only"
                  >
                    Meta
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.infoColumn}>
          <div className={styles.totalsRow}>
            <div className={styles.totalItem}>
              <span className={styles.totalValue}>{totalCharacters}</span>
              <span className={styles.totalLabel}>Characters</span>
            </div>
            <span className={styles.totalDivider}>/</span>
            <div className={styles.totalItem}>
              <span className={styles.totalValue}>{totalReminders}</span>
              <span className={styles.totalLabel}>Reminders</span>
            </div>
            <span className={styles.totalDivider}>/</span>
            <div className={styles.totalItem}>
              <span className={`${styles.totalValue} ${styles.metaValue}`}>{metaTokenCount}</span>
              <span className={styles.totalLabel}>Meta</span>
            </div>
          </div>

          <div className={styles.teamBreakdown}>
            {teamBreakdown.map(({ label, chars, reminders }) => (
              <div key={label} className={styles.teamRow}>
                <span className={styles.teamLabel}>{label}:</span>
                <span className={styles.teamValue}>
                  {chars} / {reminders}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
