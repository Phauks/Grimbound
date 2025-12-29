import { memo, useCallback } from 'react';
import { AdditionalTokensSettingsSelector } from '@/components/Shared/Selectors/AdditionalTokensSettingsSelector';
import { BackgroundStyleSelector } from '@/components/Shared/Selectors/BackgroundStyleSelector';
import { DecorativesSettingsSelector } from '@/components/Shared/Selectors/DecorativesSettingsSelector';
import { FontSettingsSelector } from '@/components/Shared/Selectors/FontSettingsSelector';
import { IconSettingsSelector } from '@/components/Shared/Selectors/IconSettingsSelector';
import { QRCodeSettingsSelector } from '@/components/Shared/Selectors/QRCodeSettingsSelector';
import styles from '@/styles/components/options/OptionsPanel.module.css';
import { DEFAULT_BACKGROUND_STYLE } from '@/ts/types/backgroundEffects';
import type { Character, GenerationOptions, TokenSettingsLink } from '@/ts/types/index';
import { DEFAULT_TOKEN_SETTINGS_LINK } from '@/ts/types/index';

interface AppearancePanelProps {
  generationOptions: GenerationOptions;
  onOptionChange: (options: Partial<GenerationOptions>) => void;
  projectId?: string;
  /** Characters for jinx token counting */
  characters?: Character[];
}

// ============================================================================
// Main AppearancePanel Component
// ============================================================================

export const AppearancePanel = memo(
  ({ generationOptions, onOptionChange, projectId, characters = [] }: AppearancePanelProps) => {
    // Get current link configuration (with defaults)
    const linkConfig: TokenSettingsLink =
      generationOptions.characterMetaLink || DEFAULT_TOKEN_SETTINGS_LINK;

    // Toggle handler for background link
    // When enabling link, copies Character settings to Meta
    const handleBackgroundLinkToggle = useCallback(() => {
      const newLinked = !linkConfig.background;
      const updates: Partial<GenerationOptions> = {
        characterMetaLink: { ...linkConfig, background: newLinked },
      };

      // When enabling link, sync Meta to match Character
      if (newLinked) {
        updates.metaBackgroundStyle =
          generationOptions.characterBackgroundStyle || DEFAULT_BACKGROUND_STYLE;
      }

      onOptionChange(updates);
    }, [linkConfig, generationOptions.characterBackgroundStyle, onOptionChange]);

    // Toggle handler for icon link
    // When enabling link, copies Character settings to Meta
    const handleIconLinkToggle = useCallback(() => {
      const newLinked = !linkConfig.icon;
      const updates: Partial<GenerationOptions> = {
        characterMetaLink: { ...linkConfig, icon: newLinked },
      };

      // When enabling link, sync Meta to match Character
      if (newLinked && generationOptions.iconSettings) {
        updates.iconSettings = {
          ...generationOptions.iconSettings,
          meta: generationOptions.iconSettings.character || {
            scale: 1.0,
            offsetX: 0,
            offsetY: 0,
          },
        };
      }

      onOptionChange(updates);
    }, [linkConfig, generationOptions.iconSettings, onOptionChange]);

    // Toggle handler for font link (Character Name ↔ Meta Name)
    const handleFontLinkToggle = useCallback(() => {
      const newLinked = !linkConfig.font;
      onOptionChange({
        characterMetaLink: { ...linkConfig, font: newLinked },
      });
    }, [linkConfig, onOptionChange]);

    // Toggle handler for text link (Ability Text ↔ Meta Text)
    const handleTextLinkToggle = useCallback(() => {
      const newLinked = !linkConfig.text;
      onOptionChange({
        characterMetaLink: { ...linkConfig, text: newLinked },
      });
    }, [linkConfig, onOptionChange]);

    return (
      <div className={styles.panelContent}>
        {/* Background Settings - self-contained selector */}
        <div className={styles.settingsGroup}>
          <BackgroundStyleSelector
            generationOptions={generationOptions}
            onOptionChange={onOptionChange}
            projectId={projectId}
            isLinked={linkConfig.background}
            onLinkToggle={handleBackgroundLinkToggle}
            ariaLabel="Background style for all token types"
          />
        </div>

        {/* Font Settings - self-contained selector with all token types */}
        <div className={styles.settingsGroup}>
          <FontSettingsSelector
            generationOptions={generationOptions}
            onOptionChange={onOptionChange}
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
            isNameLinked={linkConfig.font}
            onNameLinkToggle={handleFontLinkToggle}
            isTextLinked={linkConfig.text}
            onTextLinkToggle={handleTextLinkToggle}
          />
        </div>

        {/* Icon Settings - self-contained selector */}
        <div className={styles.settingsGroup}>
          <IconSettingsSelector
            generationOptions={generationOptions}
            onOptionChange={onOptionChange}
            ariaLabel="Icon settings for all token types"
            isLinked={linkConfig.icon}
            onLinkToggle={handleIconLinkToggle}
          />
        </div>

        {/* Decoratives Settings - Setup and Accents */}
        <div className={styles.settingsGroup}>
          <DecorativesSettingsSelector
            generationOptions={generationOptions}
            onOptionChange={onOptionChange}
            projectId={projectId}
          />
        </div>

        {/* Additional Tokens - Pandemonium, Script Name, Jinx, Bootlegger */}
        <div className={styles.settingsGroup}>
          <AdditionalTokensSettingsSelector
            generationOptions={generationOptions}
            onOptionChange={onOptionChange}
            characters={characters}
          />
        </div>

        {/* QR Code Settings */}
        <div className={styles.settingsGroup}>
          <QRCodeSettingsSelector
            generationOptions={generationOptions}
            onOptionChange={onOptionChange}
          />
        </div>
      </div>
    );
  }
);

AppearancePanel.displayName = 'AppearancePanel';
