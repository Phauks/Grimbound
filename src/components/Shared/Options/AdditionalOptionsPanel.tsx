/**
 * AdditionalOptionsPanel Component
 *
 * A flat panel (no tabs) containing advanced token generation options:
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
import { SetupSettingsSelector } from '@/components/Shared/Selectors/SetupSettingsSelector';
import styles from '@/styles/components/options/OptionsPanel.module.css';
import type { GenerationOptions } from '@/ts/types/index';

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
          {/* 1. Setup */}
          <div className={styles.settingsGroup}>
            <SetupSettingsSelector
              generationOptions={generationOptions}
              onOptionChange={onOptionChange}
              projectId={projectId}
            />
          </div>

          {/* 2. Accents */}
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
