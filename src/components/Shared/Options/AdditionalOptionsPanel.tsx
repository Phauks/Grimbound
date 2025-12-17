/**
 * AdditionalOptionsPanel Component
 *
 * A flat panel (no tabs) containing additional token options:
 * - Ability Text (with font settings)
 * - Reminder Count (with style options)
 * - Setup (setup flower asset selector)
 * - Accents (leaf decorations)
 * - Variants (character and reminder variants)
 * - Bootlegger Tokens (custom bootlegger token settings)
 * - Meta Tokens (Pandemonium, Script Name, Almanac)
 *
 * These options apply to token generation and are separated from the main
 * Options panel for better organization.
 *
 * @module components/Options/AdditionalOptionsPanel
 */

import { memo } from 'react';
import styles from '../../../styles/components/options/OptionsPanel.module.css';
import type { GenerationOptions } from '../../../ts/types/index';
import { AccentSettingsSelector } from '../Selectors/AccentSettingsSelector';
import { BootleggerSettingsSelector } from '../Selectors/BootleggerSettingsSelector';
import { GenerateVariantsSelector } from '../Selectors/GenerateVariantsSelector';
import { MetaTokensSelector } from '../Selectors/MetaTokensSelector';
import { QRCodeSettingsSelector } from '../Selectors/QRCodeSettingsSelector';
import { ReminderCountSelector } from '../Selectors/ReminderCountSelector';
import { SetupSettingsSelector } from '../Selectors/SetupSettingsSelector';
import { AbilityTextSection } from './AppearancePanel';

interface AdditionalOptionsPanelProps {
  generationOptions: GenerationOptions;
  onOptionChange: (options: Partial<GenerationOptions>) => void;
  projectId?: string;
}

export const AdditionalOptionsPanel = memo(
  ({ generationOptions, onOptionChange, projectId }: AdditionalOptionsPanelProps) => {
    return (
      <div className={styles.panelContent}>
        <div className={styles.settingsStack}>
          {/* 1. Ability Text */}
          <div className={styles.settingsGroup}>
            <AbilityTextSection
              generationOptions={generationOptions}
              onOptionChange={onOptionChange}
            />
          </div>

          {/* 2. Reminder Count */}
          <div className={styles.settingsGroup}>
            <ReminderCountSelector
              generationOptions={generationOptions}
              onOptionChange={onOptionChange}
            />
          </div>

          {/* 3. Setup (renamed from Setup Flower) */}
          <div className={styles.settingsGroup}>
            <SetupSettingsSelector
              generationOptions={generationOptions}
              onOptionChange={onOptionChange}
              projectId={projectId}
            />
          </div>

          {/* 4. Accents */}
          <div className={styles.settingsGroup}>
            <AccentSettingsSelector
              generationOptions={generationOptions}
              onOptionChange={onOptionChange}
              projectId={projectId}
            />
          </div>

          {/* 5. Variants */}
          <div className={styles.settingsGroup}>
            <GenerateVariantsSelector
              generationOptions={generationOptions}
              onOptionChange={onOptionChange}
            />
          </div>

          {/* 6. Bootlegger */}
          <div className={styles.settingsGroup}>
            <BootleggerSettingsSelector
              generationOptions={generationOptions}
              onOptionChange={onOptionChange}
            />
          </div>

          {/* 7. Meta Tokens */}
          <div className={styles.settingsGroup}>
            <MetaTokensSelector
              generationOptions={generationOptions}
              onOptionChange={onOptionChange}
            />
          </div>

          {/* 8. QR Code Style */}
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

AdditionalOptionsPanel.displayName = 'AdditionalOptionsPanel';
