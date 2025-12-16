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

import { memo } from 'react'
import type { GenerationOptions } from '../../../ts/types/index'
import { AbilityTextSection } from './AppearancePanel'
import { ReminderCountSelector } from '../Selectors/ReminderCountSelector'
import { SetupSettingsSelector } from '../Selectors/SetupSettingsSelector'
import { AccentSettingsSelector } from '../Selectors/AccentSettingsSelector'
import { GenerateVariantsSelector } from '../Selectors/GenerateVariantsSelector'
import { BootleggerSettingsSelector } from '../Selectors/BootleggerSettingsSelector'
import { MetaTokensSelector } from '../Selectors/MetaTokensSelector'
import { QRCodeSettingsSelector } from '../Selectors/QRCodeSettingsSelector'
import styles from '../../../styles/components/options/OptionsPanel.module.css'

interface AdditionalOptionsPanelProps {
  generationOptions: GenerationOptions
  onOptionChange: (options: Partial<GenerationOptions>) => void
  projectId?: string
}

export const AdditionalOptionsPanel = memo(({
  generationOptions,
  onOptionChange,
  projectId,
}: AdditionalOptionsPanelProps) => {
  return (
    <div className={styles.panelContent}>
      <div className={styles.settingsStack}>
        {/* 1. Ability Text */}
        <div className={styles.settingsGroup}>
          <h4 className={styles.settingsGroupLabel}>Ability Text</h4>
          <AbilityTextSection
            generationOptions={generationOptions}
            onOptionChange={onOptionChange}
          />
        </div>

        {/* 2. Reminder Count */}
        <div className={styles.settingsGroup}>
          <h4 className={styles.settingsGroupLabel}>Reminder Count</h4>
          <ReminderCountSelector
            generationOptions={generationOptions}
            onOptionChange={onOptionChange}
          />
        </div>

        {/* 3. Setup (renamed from Setup Flower) */}
        <div className={styles.settingsGroup}>
          <h4 className={styles.settingsGroupLabel}>Setup</h4>
          <SetupSettingsSelector
            generationOptions={generationOptions}
            onOptionChange={onOptionChange}
            projectId={projectId}
          />
        </div>

        {/* 4. Accents */}
        <div className={styles.settingsGroup}>
          <h4 className={styles.settingsGroupLabel}>Accents</h4>
          <AccentSettingsSelector
            generationOptions={generationOptions}
            onOptionChange={onOptionChange}
            projectId={projectId}
          />
        </div>

        {/* 5. Variants */}
        <div className={styles.settingsGroup}>
          <h4 className={styles.settingsGroupLabel}>Variants</h4>
          <GenerateVariantsSelector
            generationOptions={generationOptions}
            onOptionChange={onOptionChange}
          />
        </div>

        {/* 6. Bootlegger */}
        <div className={styles.settingsGroup}>
          <h4 className={styles.settingsGroupLabel}>Bootlegger</h4>
          <BootleggerSettingsSelector
            generationOptions={generationOptions}
            onOptionChange={onOptionChange}
          />
        </div>

        {/* 7. Meta Tokens */}
        <div className={styles.settingsGroup}>
          <h4 className={styles.settingsGroupLabel}>Meta Tokens</h4>
          <MetaTokensSelector
            generationOptions={generationOptions}
            onOptionChange={onOptionChange}
          />
        </div>

        {/* 8. QR Code Style */}
        <div className={styles.settingsGroup}>
          <h4 className={styles.settingsGroupLabel}>QR Code Style</h4>
          <QRCodeSettingsSelector
            generationOptions={generationOptions}
            onOptionChange={onOptionChange}
          />
        </div>
      </div>
    </div>
  )
})

AdditionalOptionsPanel.displayName = 'AdditionalOptionsPanel'
