/**
 * CharacterDecorativesPanel Component
 *
 * A comprehensive panel for per-character decorative overrides that reuses
 * the same option components from the global Options and Advanced Options panels.
 *
 * Features:
 * - Master toggle to enable/disable custom settings (vs global defaults)
 * - Background style selector (from AppearancePanel)
 * - Font settings (from AppearancePanel)
 * - Icon settings (from AppearancePanel)
 * - Ability text settings (from AdditionalOptionsPanel)
 * - Setup overlay settings (from AdditionalOptionsPanel)
 * - Accent settings (from AdditionalOptionsPanel)
 *
 * When custom settings are disabled, the character uses global generation options.
 * When enabled, any set overrides take precedence over global options.
 *
 * @module components/CharactersComponents/CharacterDecorativesPanel
 */

import { memo, useCallback, useMemo } from 'react';
import styles from '@/styles/components/characterEditor/TokenEditor.module.css';
import viewStyles from '@/styles/components/views/Views.module.css';
import optionStyles from '@/styles/components/options/OptionsPanel.module.css';
import { DEFAULT_BACKGROUND_STYLE } from '@/ts/types/backgroundEffects';
import type {
  BackgroundStyle,
  Character,
  DecorativeOverrides,
  GenerationOptions,
} from '@/ts/types/index';
import { BackgroundStyleSelector } from '@/components/Shared/Selectors/BackgroundStyleSelector';
import {
  type FontOption,
  type FontSettings,
  FontSettingsSelector,
} from '@/components/Shared/Selectors/FontSettingsSelector';
import {
  type IconSettings,
  IconSettingsSelector,
} from '@/components/Shared/Selectors/IconSettingsSelector';
import { AccentSettingsSelector } from '@/components/Shared/Selectors/AccentSettingsSelector';
import { AssetPreviewSelector } from '@/components/Shared/Selectors/AssetPreviewSelector';

interface CharacterDecorativesPanelProps {
  character: Character;
  decoratives: DecorativeOverrides;
  generationOptions: GenerationOptions;
  onDecorativesChange: (updates: Partial<DecorativeOverrides>) => void;
  projectId?: string;
}

// Font options for character name
const CHARACTER_NAME_FONT_OPTIONS: FontOption[] = [
  { value: 'Dumbledor', label: 'Dumbledor', category: 'Display' },
  { value: 'DumbledorThin', label: 'Dumbledor Thin', category: 'Display' },
  { value: 'DumbledorWide', label: 'Dumbledor Wide', category: 'Display' },
];

// Font options for ability text
const ABILITY_TEXT_FONT_OPTIONS: FontOption[] = [
  { value: 'TradeGothic', label: 'Trade Gothic', category: 'Sans Serif' },
  { value: 'TradeGothicBold', label: 'Trade Gothic Bold', category: 'Sans Serif' },
];

/**
 * Creates an effective GenerationOptions object by merging global options
 * with character-specific decorative overrides.
 */
function createEffectiveOptions(
  globalOptions: GenerationOptions,
  decoratives: DecorativeOverrides
): GenerationOptions {
  if (!decoratives.useCustomSettings) {
    return globalOptions;
  }

  return {
    ...globalOptions,
    // Background
    characterBackgroundStyle: decoratives.backgroundStyle ?? globalOptions.characterBackgroundStyle,
    // Font
    characterNameFont: decoratives.nameFont ?? globalOptions.characterNameFont,
    characterNameColor: decoratives.nameColor ?? globalOptions.characterNameColor,
    fontSpacing: {
      characterName: decoratives.nameFontSpacing ?? globalOptions.fontSpacing?.characterName ?? 0,
      abilityText:
        decoratives.abilityTextFontSpacing ?? globalOptions.fontSpacing?.abilityText ?? 0,
      reminderText: globalOptions.fontSpacing?.reminderText ?? 0,
      metaText: globalOptions.fontSpacing?.metaText ?? 0,
    },
    textShadow: {
      characterName: decoratives.nameTextShadow ?? globalOptions.textShadow?.characterName ?? 4,
      abilityText: decoratives.abilityTextShadow ?? globalOptions.textShadow?.abilityText ?? 3,
      reminderText: globalOptions.textShadow?.reminderText ?? 4,
      metaText: globalOptions.textShadow?.metaText ?? 4,
    },
    // Icon
    iconSettings: {
      character: {
        scale: decoratives.iconScale ?? globalOptions.iconSettings?.character?.scale ?? 1.0,
        offsetX: decoratives.iconOffsetX ?? globalOptions.iconSettings?.character?.offsetX ?? 0,
        offsetY: decoratives.iconOffsetY ?? globalOptions.iconSettings?.character?.offsetY ?? 0,
      },
      reminder: globalOptions.iconSettings?.reminder ?? { scale: 1.0, offsetX: 0, offsetY: 0 },
      meta: globalOptions.iconSettings?.meta ?? { scale: 1.0, offsetX: 0, offsetY: 0 },
    },
    // Ability text
    displayAbilityText: decoratives.displayAbilityText ?? globalOptions.displayAbilityText,
    abilityTextFont: decoratives.abilityTextFont ?? globalOptions.abilityTextFont,
    abilityTextColor: decoratives.abilityTextColor ?? globalOptions.abilityTextColor,
    // Setup
    setupStyle: decoratives.setupStyle ?? globalOptions.setupStyle,
    // Accents
    accentEnabled: decoratives.accentEnabled ?? globalOptions.accentEnabled,
    accentGeneration: decoratives.accentGeneration ?? globalOptions.accentGeneration,
    maximumAccents: decoratives.maximumAccents ?? globalOptions.maximumAccents,
    accentPopulationProbability:
      decoratives.accentPopulationProbability ?? globalOptions.accentPopulationProbability,
    accentArcSpan: decoratives.accentArcSpan ?? globalOptions.accentArcSpan,
    accentSlots: decoratives.accentSlots ?? globalOptions.accentSlots,
    enableLeftAccent: decoratives.enableLeftAccent ?? globalOptions.enableLeftAccent,
    enableRightAccent: decoratives.enableRightAccent ?? globalOptions.enableRightAccent,
    sideAccentProbability:
      decoratives.sideAccentProbability ?? globalOptions.sideAccentProbability,
  };
}

export const CharacterDecorativesPanel = memo(function CharacterDecorativesPanel({
  character,
  decoratives,
  generationOptions,
  onDecorativesChange,
  projectId,
}: CharacterDecorativesPanelProps) {
  const isEnabled = decoratives.useCustomSettings ?? false;

  // Create effective options for display
  const effectiveOptions = useMemo(
    () => createEffectiveOptions(generationOptions, decoratives),
    [generationOptions, decoratives]
  );

  // Toggle handler for master switch
  const handleToggleCustomSettings = useCallback(
    (enabled: boolean) => {
      onDecorativesChange({ useCustomSettings: enabled });
    },
    [onDecorativesChange]
  );

  // Background style change handler
  const handleBackgroundStyleChange = useCallback(
    (style: BackgroundStyle) => {
      onDecorativesChange({ backgroundStyle: style });
    },
    [onDecorativesChange]
  );

  // Font settings change handler (for character name)
  const handleFontSettingsChange = useCallback(
    (settings: FontSettings) => {
      onDecorativesChange({
        nameFont: settings.fontFamily,
        nameColor: settings.color,
        nameFontSpacing: settings.letterSpacing,
        nameTextShadow: settings.shadowBlur,
      });
    },
    [onDecorativesChange]
  );

  // Icon settings change handler
  const handleIconSettingsChange = useCallback(
    (settings: IconSettings) => {
      onDecorativesChange({
        iconScale: settings.scale,
        iconOffsetX: settings.offsetX,
        iconOffsetY: settings.offsetY,
      });
    },
    [onDecorativesChange]
  );

  // Ability text toggle handler
  const handleAbilityTextToggle = useCallback(
    (enabled: boolean) => {
      onDecorativesChange({ displayAbilityText: enabled });
    },
    [onDecorativesChange]
  );

  // Ability text font settings change handler
  const handleAbilityFontSettingsChange = useCallback(
    (settings: FontSettings) => {
      onDecorativesChange({
        abilityTextFont: settings.fontFamily,
        abilityTextColor: settings.color,
        abilityTextFontSpacing: settings.letterSpacing,
        abilityTextShadow: settings.shadowBlur,
      });
    },
    [onDecorativesChange]
  );

  // Setup style change handler
  const handleSetupStyleChange = useCallback(
    (value: string) => {
      onDecorativesChange({ setupStyle: value });
    },
    [onDecorativesChange]
  );

  // Setup overlay visibility toggle
  const handleHideSetupOverlayChange = useCallback(
    (hidden: boolean) => {
      onDecorativesChange({ hideSetupOverlay: hidden });
    },
    [onDecorativesChange]
  );

  // Accent settings change handler - adapts GenerationOptions changes to DecorativeOverrides
  const handleAccentOptionChange = useCallback(
    (options: Partial<GenerationOptions>) => {
      const updates: Partial<DecorativeOverrides> = {};
      if ('accentEnabled' in options) updates.accentEnabled = options.accentEnabled;
      if ('accentGeneration' in options) updates.accentGeneration = options.accentGeneration;
      if ('maximumAccents' in options) updates.maximumAccents = options.maximumAccents;
      if ('accentPopulationProbability' in options)
        updates.accentPopulationProbability = options.accentPopulationProbability;
      if ('accentArcSpan' in options) updates.accentArcSpan = options.accentArcSpan;
      if ('accentSlots' in options) updates.accentSlots = options.accentSlots;
      if ('enableLeftAccent' in options) updates.enableLeftAccent = options.enableLeftAccent;
      if ('enableRightAccent' in options) updates.enableRightAccent = options.enableRightAccent;
      if ('sideAccentProbability' in options)
        updates.sideAccentProbability = options.sideAccentProbability;
      onDecorativesChange(updates);
    },
    [onDecorativesChange]
  );

  // Current font settings for character name
  const currentNameFontSettings: FontSettings = {
    fontFamily:
      decoratives.nameFont ??
      effectiveOptions.characterNameFont ??
      CHARACTER_NAME_FONT_OPTIONS[0].value,
    color: decoratives.nameColor ?? effectiveOptions.characterNameColor ?? '#FFFFFF',
    letterSpacing:
      decoratives.nameFontSpacing ?? effectiveOptions.fontSpacing?.characterName ?? 0,
    shadowBlur: decoratives.nameTextShadow ?? effectiveOptions.textShadow?.characterName ?? 4,
  };

  // Current font settings for ability text
  const currentAbilityFontSettings: FontSettings = {
    fontFamily:
      decoratives.abilityTextFont ??
      effectiveOptions.abilityTextFont ??
      ABILITY_TEXT_FONT_OPTIONS[0].value,
    color: decoratives.abilityTextColor ?? effectiveOptions.abilityTextColor ?? '#FFFFFF',
    letterSpacing:
      decoratives.abilityTextFontSpacing ?? effectiveOptions.fontSpacing?.abilityText ?? 0,
    shadowBlur: decoratives.abilityTextShadow ?? effectiveOptions.textShadow?.abilityText ?? 3,
  };

  // Current icon settings
  const currentIconSettings: IconSettings = {
    scale: decoratives.iconScale ?? effectiveOptions.iconSettings?.character?.scale ?? 1.0,
    offsetX: decoratives.iconOffsetX ?? effectiveOptions.iconSettings?.character?.offsetX ?? 0,
    offsetY: decoratives.iconOffsetY ?? effectiveOptions.iconSettings?.character?.offsetY ?? 0,
  };

  // Ability text enabled state
  const abilityTextEnabled =
    decoratives.displayAbilityText ?? effectiveOptions.displayAbilityText !== false;

  // Ability text toggle component
  const AbilityTextToggle = (
    <div className={optionStyles.inboxToggle}>
      <button
        type="button"
        className={`${optionStyles.inboxToggleButton} ${!abilityTextEnabled ? optionStyles.inboxToggleButtonActive : ''}`}
        onClick={() => handleAbilityTextToggle(false)}
      >
        Off
      </button>
      <button
        type="button"
        className={`${optionStyles.inboxToggleButton} ${abilityTextEnabled ? optionStyles.inboxToggleButtonActive : ''}`}
        onClick={() => handleAbilityTextToggle(true)}
      >
        On
      </button>
    </div>
  );

  return (
    <div className={styles.tabContent}>
      {/* Master Toggle */}
      <div className={styles.decorativesHeader}>
        <div className={styles.decorativesToggleRow}>
          <span className={styles.decorativesToggleLabel}>Use Custom Settings</span>
          <input
            type="checkbox"
            className={viewStyles.toggleSwitch}
            checked={isEnabled}
            onChange={(e) => handleToggleCustomSettings(e.target.checked)}
          />
        </div>
        <p className={styles.decorativesDescription}>
          {isEnabled
            ? 'Custom settings are enabled. Changes here override global options for this character only.'
            : 'Using global settings. Enable to customize this character\'s appearance.'}
        </p>
      </div>

      {/* Custom Settings Content */}
      {isEnabled && (
        <div className={styles.decorativesSections}>
          {/* Options Section Header */}
          <div className={styles.decorativesSectionHeader}>
            <h4>Options</h4>
            <span className={styles.decorativesSectionHint}>
              Background, font, and icon settings
            </span>
          </div>

          {/* Background Style */}
          <div className={optionStyles.settingsGroup}>
            <BackgroundStyleSelector
              value={
                (decoratives.backgroundStyle ??
                  effectiveOptions.characterBackgroundStyle) ||
                DEFAULT_BACKGROUND_STYLE
              }
              onChange={handleBackgroundStyleChange}
              onPreviewChange={handleBackgroundStyleChange}
              tokenType="character"
              ariaLabel="Character background style"
              projectId={projectId}
              generationOptions={effectiveOptions}
            />
          </div>

          {/* Font Settings */}
          <div className={optionStyles.settingsGroup}>
            <FontSettingsSelector
              value={currentNameFontSettings}
              onChange={handleFontSettingsChange}
              onPreviewChange={handleFontSettingsChange}
              fontOptions={CHARACTER_NAME_FONT_OPTIONS}
              previewText="Character Name"
              title="Font"
              defaults={{ letterSpacing: 0, shadowBlur: 4 }}
              ariaLabel="Character name font settings"
            />
          </div>

          {/* Icon Settings */}
          <div className={optionStyles.settingsGroup}>
            <IconSettingsSelector
              value={currentIconSettings}
              onChange={handleIconSettingsChange}
              onPreviewChange={handleIconSettingsChange}
              displayUnit={effectiveOptions.measurementUnit || 'inches'}
              tokenType="character"
              ariaLabel="Character icon settings"
            />
          </div>

          {/* Advanced Options Section Header */}
          <div className={styles.decorativesSectionHeader}>
            <h4>Advanced Options</h4>
            <span className={styles.decorativesSectionHint}>
              Ability text, setup overlays, and accents
            </span>
          </div>

          {/* Ability Text Settings */}
          <div className={optionStyles.settingsGroup}>
            <FontSettingsSelector
              value={currentAbilityFontSettings}
              onChange={handleAbilityFontSettingsChange}
              onPreviewChange={handleAbilityFontSettingsChange}
              fontOptions={ABILITY_TEXT_FONT_OPTIONS}
              previewText="Ability Text"
              title="Ability Text"
              defaults={{ letterSpacing: 0, shadowBlur: 3 }}
              visuallyDisabled={!abilityTextEnabled}
              headerSlot={AbilityTextToggle}
              ariaLabel="Ability text font settings"
            />
          </div>

          {/* Setup Overlay Settings (only for setup characters) */}
          {character.setup && (
            <div className={optionStyles.settingsGroup}>
              <div className={styles.decorativesSubsection}>
                <div className={styles.decorativesSubsectionHeader}>
                  <span className={styles.decorativesSubsectionLabel}>Setup Overlay</span>
                  <label className={styles.decorativesInlineToggle}>
                    <span>Hide</span>
                    <input
                      type="checkbox"
                      className={viewStyles.toggleSwitch}
                      checked={decoratives.hideSetupOverlay ?? false}
                      onChange={(e) => handleHideSetupOverlayChange(e.target.checked)}
                    />
                  </label>
                </div>
                {!decoratives.hideSetupOverlay && (
                  <AssetPreviewSelector
                    value={decoratives.setupStyle ?? effectiveOptions.setupStyle ?? 'setup_flower_1'}
                    onChange={handleSetupStyleChange}
                    assetType="setup-overlay"
                    shape="square"
                    showNone={true}
                    noneLabel="No overlay"
                    projectId={projectId}
                    generationOptions={effectiveOptions}
                  />
                )}
              </div>
            </div>
          )}

          {/* Accent Settings */}
          <div className={optionStyles.settingsGroup}>
            <AccentSettingsSelector
              generationOptions={effectiveOptions}
              onOptionChange={handleAccentOptionChange}
              projectId={projectId}
              ariaLabel="Character accent settings"
            />
          </div>
        </div>
      )}

      {/* Note about override behavior */}
      {isEnabled && (
        <div className={styles.decorativesNote}>
          <p>
            <strong>Note:</strong> These settings will override global options when regenerating
            this character&apos;s token.
          </p>
        </div>
      )}
    </div>
  );
});

export default CharacterDecorativesPanel;
