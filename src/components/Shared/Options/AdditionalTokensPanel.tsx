/**
 * AdditionalTokensPanel Component
 *
 * A panel containing settings for additional token types:
 * - Variants (character and reminder variants)
 * - Meta Tokens (Pandemonium, Script Name, Almanac)
 * - Bootlegger Tokens (custom bootlegger token settings)
 * - QR Code Tokens (QR code style and content)
 *
 * These options control the generation of supplementary tokens
 * beyond the core character and reminder tokens.
 *
 * @module components/Options/AdditionalTokensPanel
 */

import { memo } from 'react';
import { BootleggerSettingsSelector } from '@/components/Shared/Selectors/BootleggerSettingsSelector';
import { GenerateVariantsSelector } from '@/components/Shared/Selectors/GenerateVariantsSelector';
import { MetaTokensSelector } from '@/components/Shared/Selectors/MetaTokensSelector';
import { QRCodeSettingsSelector } from '@/components/Shared/Selectors/QRCodeSettingsSelector';
import styles from '@/styles/components/options/OptionsPanel.module.css';
import type { GenerationOptions } from '@/ts/types/index';

interface AdditionalTokensPanelProps {
  generationOptions: GenerationOptions;
  onOptionChange: (options: Partial<GenerationOptions>) => void;
}

export const AdditionalTokensPanel = memo(
  ({ generationOptions, onOptionChange }: AdditionalTokensPanelProps) => {
    return (
      <div className={styles.panelContent}>
        <div className={styles.settingsStack}>
          {/* 1. Variants */}
          <div className={styles.settingsGroup}>
            <GenerateVariantsSelector
              generationOptions={generationOptions}
              onOptionChange={onOptionChange}
            />
          </div>

          {/* 2. Meta Tokens */}
          <div className={styles.settingsGroup}>
            <MetaTokensSelector
              generationOptions={generationOptions}
              onOptionChange={onOptionChange}
            />
          </div>

          {/* 3. Bootlegger */}
          <div className={styles.settingsGroup}>
            <BootleggerSettingsSelector
              generationOptions={generationOptions}
              onOptionChange={onOptionChange}
            />
          </div>

          {/* 4. QR Code Tokens */}
          <div className={styles.settingsGroup}>
            <QRCodeSettingsSelector
              generationOptions={generationOptions}
              onOptionChange={onOptionChange}
            />
          </div>
        </div>
      </div>
    );
  }
);

AdditionalTokensPanel.displayName = 'AdditionalTokensPanel';
