/**
 * CharacterDecorativesPanel Component
 *
 * A comprehensive panel for per-character decorative overrides that reuses
 * the same option components from the global AppearancePanel.
 *
 * Features:
 * - Master toggle to enable/disable custom settings (vs global defaults)
 * - Background style selector (from AppearancePanel)
 * - Text settings - unified font selector for name and ability (from AppearancePanel)
 * - Icon settings (from AppearancePanel)
 * - Decoratives settings - setup overlays and accents (from AppearancePanel)
 *
 * When custom settings are disabled, the character uses global generation options.
 * When enabled, any set overrides take precedence over global options.
 *
 * @module components/CharactersComponents/CharacterDecorativesPanel
 */

import { memo, useCallback, useMemo } from 'react';
import { BackgroundStyleSelector } from '@/components/Shared/Selectors/BackgroundStyleSelector';
import { DecorativesSettingsSelector } from '@/components/Shared/Selectors/DecorativesSettingsSelector';
import { FontSettingsSelector } from '@/components/Shared/Selectors/FontSettingsSelector';
import { IconSettingsSelector } from '@/components/Shared/Selectors/IconSettingsSelector';
import styles from '@/styles/components/characterEditor/TokenEditor.module.css';
import optionStyles from '@/styles/components/options/OptionsPanel.module.css';
import viewStyles from '@/styles/components/views/Views.module.css';
import type { DecorativeOverrides, GenerationOptions } from '@/ts/types/index';
import {
  createEffectiveOptions,
  mapDecorativesOptionsToDecorative,
} from '@/ts/utils/decorativeUtils.js';

// ============================================================================
// Types
// ============================================================================

interface CharacterDecorativesPanelProps {
  decoratives: DecorativeOverrides;
  generationOptions: GenerationOptions;
  onDecorativesChange: (updates: Partial<DecorativeOverrides>) => void;
  projectId?: string;
}

// ============================================================================
// Main Component
// ============================================================================

export const CharacterDecorativesPanel = memo(function CharacterDecorativesPanel({
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

  // Background style change handler - converts GenerationOptions changes to DecorativeOverrides
  const handleBackgroundOptionChange = useCallback(
    (options: Partial<GenerationOptions>) => {
      if (options.characterBackgroundStyle) {
        onDecorativesChange({ backgroundStyle: options.characterBackgroundStyle });
      }
    },
    [onDecorativesChange]
  );

  // Text settings change handler - handles both character name and ability text
  const handleTextOptionChange = useCallback(
    (options: Partial<GenerationOptions>) => {
      const updates: Partial<DecorativeOverrides> = {};

      // Character name font settings
      if (options.characterNameFont !== undefined) updates.nameFont = options.characterNameFont;
      if (options.characterNameColor !== undefined) updates.nameColor = options.characterNameColor;
      if (options.fontSpacing?.characterName !== undefined)
        updates.nameFontSpacing = options.fontSpacing.characterName;
      if (options.textShadow?.characterName !== undefined)
        updates.nameTextShadow = options.textShadow.characterName;

      // Ability text font settings
      if (options.abilityTextFont !== undefined) updates.abilityTextFont = options.abilityTextFont;
      if (options.abilityTextColor !== undefined)
        updates.abilityTextColor = options.abilityTextColor;
      if (options.fontSpacing?.characterText !== undefined)
        updates.abilityTextFontSpacing = options.fontSpacing.characterText;
      if (options.textShadow?.characterText !== undefined)
        updates.abilityTextShadow = options.textShadow.characterText;

      // Display ability text toggle
      if (options.displayAbilityText !== undefined)
        updates.displayAbilityText = options.displayAbilityText;

      if (Object.keys(updates).length > 0) {
        onDecorativesChange(updates);
      }
    },
    [onDecorativesChange]
  );

  // Icon settings change handler - converts GenerationOptions to DecorativeOverrides
  const handleIconOptionChange = useCallback(
    (options: Partial<GenerationOptions>) => {
      const updates: Partial<DecorativeOverrides> = {};

      // Extract character icon settings
      if (options.iconSettings?.character) {
        const { scale, offsetX, offsetY } = options.iconSettings.character;
        if (scale !== undefined) updates.iconScale = scale;
        if (offsetX !== undefined) updates.iconOffsetX = offsetX;
        if (offsetY !== undefined) updates.iconOffsetY = offsetY;
      }

      if (Object.keys(updates).length > 0) {
        onDecorativesChange(updates);
      }
    },
    [onDecorativesChange]
  );

  // Decoratives settings change handler (setup + accents)
  const handleDecorativesOptionChange = useCallback(
    (options: Partial<GenerationOptions>) => {
      onDecorativesChange(mapDecorativesOptionsToDecorative(options));
    },
    [onDecorativesChange]
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
            : "Using global settings. Enable to customize this character's appearance."}
        </p>
      </div>

      {/* Custom Settings Content - matches TokensView AppearancePanel layout */}
      {isEnabled && (
        <div className={styles.decorativesSections}>
          {/* Background Settings */}
          <div className={optionStyles.settingsGroup}>
            <BackgroundStyleSelector
              generationOptions={effectiveOptions}
              onOptionChange={handleBackgroundOptionChange}
              ariaLabel="Character background style"
              projectId={projectId}
            />
          </div>

          {/* Text Settings - unified selector for name and ability text */}
          <div className={optionStyles.settingsGroup}>
            <FontSettingsSelector
              generationOptions={effectiveOptions}
              onOptionChange={handleTextOptionChange}
              title="Text"
              defaults={{
                letterSpacing: 0,
                shadowBlur: 4,
                fontSize: 0,
                renderStyle: 'filled',
                strokeColor: '#000000',
                strokeWidth: 2,
              }}
              ariaLabel="Text settings"
            />
          </div>

          {/* Icon Settings */}
          <div className={optionStyles.settingsGroup}>
            <IconSettingsSelector
              generationOptions={effectiveOptions}
              onOptionChange={handleIconOptionChange}
              ariaLabel="Icon settings"
            />
          </div>

          {/* Decoratives Settings (Setup Overlays + Accents) */}
          <div className={optionStyles.settingsGroup}>
            <DecorativesSettingsSelector
              generationOptions={effectiveOptions}
              onOptionChange={handleDecorativesOptionChange}
              projectId={projectId}
              ariaLabel="Setup overlay and accent settings"
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
