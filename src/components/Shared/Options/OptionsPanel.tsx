import { memo, useState } from 'react'
import type { GenerationOptions } from '../../../ts/types/index'
import { OptionGroup } from '../UI/OptionGroup'
import styles from '../../../styles/components/options/OptionsPanel.module.css'
import viewStyles from '../../../styles/components/views/Views.module.css'

interface OptionsPanelProps {
  generationOptions: GenerationOptions
  onOptionChange: (options: Partial<GenerationOptions>) => void
  projectId?: string
}

type OptionTab = 'character' | 'reminder' | 'meta'

export const OptionsPanel = memo(({ generationOptions, onOptionChange }: OptionsPanelProps) => {
  const [activeTab, setActiveTab] = useState<OptionTab>('character')

  return (
    <div className={styles.panelContent}>
      <div className={styles.tabsNav}>
        <button
          className={`${styles.tabButton} ${activeTab === 'character' ? styles.active : ''}`}
          onClick={() => setActiveTab('character')}
        >
          Character
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'reminder' ? styles.active : ''}`}
          onClick={() => setActiveTab('reminder')}
        >
          Reminder
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'meta' ? styles.active : ''}`}
          onClick={() => setActiveTab('meta')}
        >
          Meta
        </button>
      </div>

      {activeTab === 'character' && (
        <div className={styles.tabContent}>
          <div className={styles.sectionContent}>
            <OptionGroup label="Character Variants" description="Generate tokens for characters with multiple images">
              <input
                type="checkbox"
                className={viewStyles.toggleSwitch}
                checked={generationOptions.generateImageVariants || false}
                onChange={(e) => onOptionChange({ generateImageVariants: e.target.checked })}
              />
            </OptionGroup>

            <OptionGroup label="Bootlegger" description="Generate bootlegger tokens from script rules">
              <input
                type="checkbox"
                className={viewStyles.toggleSwitch}
                checked={generationOptions.generateBootleggerRules !== false}
                onChange={(e) => onOptionChange({ generateBootleggerRules: e.target.checked })}
                disabled
              />
            </OptionGroup>
          </div>
        </div>
      )}

      {activeTab === 'reminder' && (
        <div className={styles.tabContent}>
          <div className={styles.sectionContent}>
            <OptionGroup label="Reminder Variants" description="Generate reminder tokens for characters with multiple images">
              <input
                type="checkbox"
                className={viewStyles.toggleSwitch}
                checked={generationOptions.generateReminderVariants || false}
                onChange={(e) => onOptionChange({ generateReminderVariants: e.target.checked })}
              />
            </OptionGroup>
          </div>
        </div>
      )}

      {activeTab === 'meta' && (
        <div className={styles.tabContent}>
          <div className={styles.sectionContent}>
            <OptionGroup label="Pandemonium" description="Include Pandemonium Institute token">
              <input
                type="checkbox"
                className={viewStyles.toggleSwitch}
                checked={generationOptions.pandemoniumToken !== false}
                onChange={(e) => onOptionChange({ pandemoniumToken: e.target.checked })}
              />
            </OptionGroup>

            <OptionGroup label="Script Name" description="Include Script Name token">
              <input
                type="checkbox"
                className={viewStyles.toggleSwitch}
                checked={generationOptions.scriptNameToken !== false}
                onChange={(e) => onOptionChange({ scriptNameToken: e.target.checked })}
              />
            </OptionGroup>

            {generationOptions.scriptNameToken !== false && (
              <OptionGroup label="Generate Author Name" description="Show author name on Script Name token">
                <input
                  type="checkbox"
                  className={viewStyles.toggleSwitch}
                  checked={!(generationOptions.hideScriptNameAuthor ?? false)}
                  onChange={(e) => onOptionChange({ hideScriptNameAuthor: !e.target.checked })}
                />
              </OptionGroup>
            )}

            <OptionGroup label="Almanac" description="Include Almanac link token">
              <input
                type="checkbox"
                className={viewStyles.toggleSwitch}
                checked={generationOptions.almanacToken !== false}
                onChange={(e) => onOptionChange({ almanacToken: e.target.checked })}
              />
            </OptionGroup>

            <OptionGroup label="Tool Token" description="To Be Implemented">
              <input
                type="checkbox"
                className={viewStyles.toggleSwitch}
                disabled
              />
            </OptionGroup>

            <OptionGroup label="Shareable Script" description="To Be Implemented">
              <input
                type="checkbox"
                className={viewStyles.toggleSwitch}
                disabled
              />
            </OptionGroup>
          </div>
        </div>
      )}
    </div>
  )
})

OptionsPanel.displayName = 'OptionsPanel'
