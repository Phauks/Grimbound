import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTokenContext } from '@/contexts/TokenContext';
import { useTokenGenerator } from '@/hooks';
import styles from '@/styles/components/tokens/TokenPreviewRow.module.css';
import { CONFIG } from '@/ts/config.js';
import { calculateTokenCounts, getBestPreviewCharacter } from '@/ts/data/characterUtils';
import { TokenGenerator } from '@/ts/generation/index.js';
import type { Character, GenerationOptions, ScriptMeta, Token } from '@/ts/types/index.js';
import { logger } from '@/ts/utils/logger.js';
import { sanitizeFilename } from '@/ts/utils/stringUtils.js';

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
  tokens: propTokens,
  generationOptions: propGenerationOptions,
  scriptMeta: propScriptMeta,
  isLoading: propIsLoading,
  showGenerateButton = true,
  showAutoRegenerate = true,
  onGenerate,
}: TokenPreviewRowProps = {}) {
  // Get context values (used as fallbacks when props not provided)
  const context = useTokenContext();
  const { generateTokens } = useTokenGenerator();

  // Use props if provided, otherwise fall back to context
  const characters = propCharacters ?? context.characters;
  const tokens = propTokens ?? context.tokens;
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

  // Get sample character from exampleCharacterToken
  // Character/Reminder tokens are in sync - reminders find their parent character
  // Memoized to prevent callback recreation on every render
  const { sampleCharacter, wasAutoSelected, selectedReminderText } = useMemo(() => {
    if (characters.length === 0) {
      return {
        sampleCharacter: SAMPLE_CHARACTER,
        wasAutoSelected: false,
        selectedReminderText: null,
      };
    }

    // If a character token is selected
    if (exampleCharacterToken?.type === 'character') {
      const exampleChar = characters.find((char) => char.name === exampleCharacterToken.name);
      if (exampleChar) {
        return { sampleCharacter: exampleChar, wasAutoSelected: false, selectedReminderText: null };
      }
    }

    // If a reminder token is selected, find its parent character
    if (exampleCharacterToken?.type === 'reminder') {
      const parentName = exampleCharacterToken.parentCharacter || exampleCharacterToken.name;
      const parentChar = characters.find((char) => char.name === parentName);
      if (parentChar) {
        return {
          sampleCharacter: parentChar,
          wasAutoSelected: false,
          selectedReminderText: exampleCharacterToken.reminderText || null,
        };
      }
    }

    // Auto-select best preview character
    return {
      sampleCharacter: getBestPreviewCharacter(characters) || SAMPLE_CHARACTER,
      wasAutoSelected: true,
      selectedReminderText: null,
    };
  }, [characters, exampleCharacterToken]);

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

      // If we auto-selected this character (no example was set), set it as the example character token
      // Don't set the sample Washerwoman as the example token - only script characters
      if (wasAutoSelected && sampleCharacter !== SAMPLE_CHARACTER) {
        const dpi = generationOptions.dpi || CONFIG.PDF.DPI;
        const diameter = CONFIG.TOKEN.ROLE_DIAMETER_INCHES * dpi;

        const autoSelectedToken: Token = {
          type: 'character',
          name: sampleCharacter.name,
          filename: sanitizeFilename(`${sampleCharacter.name}.png`),
          team: sampleCharacter.team,
          canvas: charCanvas,
          diameter,
          characterData: sampleCharacter,
          hasReminders: (sampleCharacter.reminders?.length ?? 0) > 0,
          reminderCount: sampleCharacter.reminders?.length ?? 0,
        };

        setExampleCharacterToken(autoSelectedToken);
      }

      // Generate reminder token - use selected reminder if user picked one, otherwise first reminder
      let reminderCanvas: HTMLCanvasElement | null = null;
      if (sampleCharacter.reminders && sampleCharacter.reminders.length > 0) {
        // Use the selected reminder text if available, otherwise default to first
        const reminderText =
          selectedReminderText && sampleCharacter.reminders.includes(selectedReminderText)
            ? selectedReminderText
            : sampleCharacter.reminders[0];
        reminderCanvas = await generator.generateReminderToken(sampleCharacter, reminderText);
        setPreviewReminderCanvas(reminderCanvas);
      } else {
        setPreviewReminderCanvas(null);
      }

      // Generate meta token - use exampleMetaToken (independent from character selection)
      // ALWAYS regenerate fresh to ensure all settings changes are reflected
      let metaCanvas: HTMLCanvasElement;
      if (exampleMetaToken?.type === 'almanac') {
        // Regenerate almanac token with current QR styling
        const almanacUrl = scriptMeta?.almanac || '';
        const scriptName = scriptMeta?.name || 'Script Name';
        const scriptLogo = scriptMeta?.logo;
        metaCanvas = await generator.generateAlmanacQRToken(almanacUrl, scriptName, scriptLogo);
      } else if (exampleMetaToken?.type === 'pandemonium') {
        // Regenerate pandemonium token
        metaCanvas = await generator.generatePandemoniumToken();
      } else if (exampleMetaToken?.type === 'bootlegger') {
        // Regenerate bootlegger token - get ability text from scriptMeta or use default
        const bootleggerRules = scriptMeta?.bootlegger || [];
        // Use the first rule if available, otherwise a sample text
        const abilityText = bootleggerRules[0] || 'Sample Bootlegger Rule Text';
        metaCanvas = await generator.generateBootleggerToken(abilityText);
      } else if (exampleMetaToken?.type === 'script-name') {
        // Regenerate script name token
        const scriptName = scriptMeta?.name || 'Script Name';
        const scriptAuthor = scriptMeta?.author || 'Author';
        const hideAuthor = generationOptions.hideScriptNameAuthor ?? false;
        metaCanvas = await generator.generateScriptNameToken(scriptName, scriptAuthor, hideAuthor);
      } else {
        // Default: generate Script Name token when no meta token selected
        const scriptName = scriptMeta?.name || 'Script Name';
        const scriptAuthor = scriptMeta?.author || 'Author';
        const hideAuthor = generationOptions.hideScriptNameAuthor ?? false;
        metaCanvas = await generator.generateScriptNameToken(scriptName, scriptAuthor, hideAuthor);
      }
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

  // Handle apply to all tokens
  const handleApplyToAll = () => {
    if (characters.length > 0) {
      // Use custom handler if provided, otherwise use generateTokens from hook
      if (onGenerate) {
        onGenerate();
      } else {
        generateTokens();
      }
    }
  };

  // Calculate token counts
  const counts = calculateTokenCounts(characters);
  const metaTokenCount = tokens.filter(
    (t) =>
      t.type === 'script-name' ||
      t.type === 'almanac' ||
      t.type === 'pandemonium' ||
      t.type === 'bootlegger'
  ).length;
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
            <div className={styles.tokenWrapper}>
              {previewCharCanvas ? (
                <img
                  src={previewCharCanvas.toDataURL('image/png')}
                  alt="Character token preview"
                  className={styles.tokenImage}
                />
              ) : (
                <div className={styles.tokenPlaceholder}>
                  {isGeneratingPreview ? '...' : 'No preview'}
                </div>
              )}
              <span className={styles.tokenLabel}>Character</span>
            </div>

            <div className={styles.tokenWrapper}>
              {previewReminderCanvas ? (
                <img
                  src={previewReminderCanvas.toDataURL('image/png')}
                  alt="Reminder token preview"
                  className={`${styles.tokenImage} ${styles.reminderImage}`}
                />
              ) : (
                <div className={`${styles.tokenPlaceholder} ${styles.reminderPlaceholder}`}>
                  {isGeneratingPreview ? '...' : 'No reminder'}
                </div>
              )}
              <span className={styles.tokenLabel}>Reminder</span>
            </div>

            <div className={styles.tokenWrapper}>
              {previewMetaCanvas ? (
                <img
                  src={previewMetaCanvas.toDataURL('image/png')}
                  alt="Meta token preview"
                  className={styles.tokenImage}
                />
              ) : (
                <div className={styles.tokenPlaceholder}>
                  {isGeneratingPreview ? '...' : 'No meta'}
                </div>
              )}
              <span className={styles.tokenLabel}>Meta</span>
            </div>
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
                    {isLoading ? 'Generating...' : 'Generate'}
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
