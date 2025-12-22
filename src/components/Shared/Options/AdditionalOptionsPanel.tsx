/**
 * AdditionalOptionsPanel Component
 *
 * A flat panel (no tabs) containing advanced token generation options:
 * - Ability Text (with font settings)
 * - Reminder Count (with style options)
 * - Setup (setup flower asset selector)
 * - Accents (accent decorations)
 *
 * These options apply to token generation and are separated from the main
 * Options panel for better organization. Additional token types (Variants,
 * Meta, Bootlegger, QR) are in the AdditionalTokensPanel.
 *
 * @module components/Options/AdditionalOptionsPanel
 */

import { memo } from 'react';
import { AccentSettingsSelector } from '@/components/Shared/Selectors/AccentSettingsSelector';
import { ReminderCountSelector } from '@/components/Shared/Selectors/ReminderCountSelector';
import { SetupSettingsSelector } from '@/components/Shared/Selectors/SetupSettingsSelector';
import styles from '@/styles/components/options/OptionsPanel.module.css';
import type { GenerationOptions } from '@/ts/types/index';
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
        </div>
      </div>
    );
  }
);

AdditionalOptionsPanel.displayName = 'AdditionalOptionsPanel';
