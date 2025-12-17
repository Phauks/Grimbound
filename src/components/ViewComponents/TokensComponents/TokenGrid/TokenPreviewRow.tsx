import { useCallback, useEffect, useRef, useState } from 'react';
import { useTokenContext } from '../../../../contexts/TokenContext';
import { useTokenGenerator } from '../../../../hooks/useTokenGenerator';
import styles from '../../../../styles/components/tokens/TokenPreviewRow.module.css';
import { CONFIG } from '../../../../ts/config.js';
import { calculateTokenCounts, getBestPreviewCharacter } from '../../../../ts/data/characterUtils';
import { TokenGenerator } from '../../../../ts/generation/tokenGenerator.js';
import type { Character, Token } from '../../../../ts/types/index.js';
import { sanitizeFilename } from '../../../../ts/utils/stringUtils.js';

// Sample character for preview when no script is loaded
const SAMPLE_CHARACTER: Character = {
  id: '_preview_sample',
  name: 'Washerwoman',
  team: 'townsfolk',
  ability: 'You start knowing that 1 of 2 players is a particular Townsfolk.',
  image: '',
  reminders: ['Townsfolk', 'Wrong'],
  setup: false,
};

export function TokenPreviewRow() {
  const {
    characters,
    tokens,
    generationOptions,
    isLoading,
    scriptMeta,
    exampleCharacterToken,
    setExampleCharacterToken,
    exampleMetaToken,
    setExampleToken: _setExampleToken,
  } = useTokenContext();
  const { generateTokens } = useTokenGenerator();

  const [previewCharCanvas, setPreviewCharCanvas] = useState<HTMLCanvasElement | null>(null);
  const [previewReminderCanvas, setPreviewReminderCanvas] = useState<HTMLCanvasElement | null>(
    null
  );
  const [previewMetaCanvas, setPreviewMetaCanvas] = useState<HTMLCanvasElement | null>(null);
  const [autoRegenerate, setAutoRegenerate] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  const optionsRef = useRef(generationOptions);

  // Get sample character from exampleCharacterToken
  // Character/Reminder tokens are in sync - reminders find their parent character
  const { sampleCharacter, wasAutoSelected, selectedReminderText } = (() => {
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
  })();

  // Generate preview tokens - always regenerate fresh to ensure all settings changes are reflected
  const generatePreview = useCallback(async () => {
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
      if (wasAutoSelected && sampleCharacter.id !== '_preview_sample') {
        const dpi = generationOptions.dpi || 300;
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
      console.error('Failed to generate preview:', error);
    } finally {
      setIsGeneratingPreview(false);
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
      generateTokens();
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

          <div className={styles.actionsRow}>
            <div className={styles.generateGroup}>
              <button
                type="button"
                className={styles.generateBtn}
                onClick={handleApplyToAll}
                disabled={isLoading || characters.length === 0}
                title="Generate all tokens with current options"
              >
                {isLoading ? 'Generating...' : 'Generate'}
              </button>
              <button
                type="button"
                className={`${styles.autoBtn} ${autoRegenerate ? styles.autoBtnActive : ''}`}
                onClick={() => setAutoRegenerate(!autoRegenerate)}
                title={autoRegenerate ? 'Auto-regenerate enabled' : 'Enable auto-regenerate'}
              >
                🔄
              </button>
            </div>
          </div>
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
