import { useState } from 'react'
import { useTokenContext } from '../../contexts/TokenContext'
import type { CustomPreset } from '../../hooks/usePresets'
import { PresetSection } from '../Presets/PresetSection'
import { OptionsTabNavigation } from '../Options/OptionsTabNavigation'
import { CharacterTab } from '../Options/CharacterTab'
import { ReminderTab } from '../Options/ReminderTab'
import { MetaTab } from '../Options/MetaTab'
import { ExportTab } from '../Options/ExportTab'
import styles from '../../styles/components/layout/Sidebar.module.css'

export function Sidebar() {
  const { generationOptions, updateGenerationOptions } = useTokenContext()
  const [activeTab, setActiveTab] = useState<'character' | 'reminder' | 'meta' | 'export'>('character')
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([])

  return (
    <aside className={styles.sidebar}>
      <div className={styles.content}>
        <div className={styles.card}>
          <h2 className={styles.cardHeader}>Presets</h2>
          <div className={styles.cardBody}>
            <PresetSection
              customPresets={customPresets}
              onCustomPresetsChange={setCustomPresets}
              onShowSaveModal={() => {}}
            />
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardHeader}>Options</h2>
          <div className={styles.cardBody}>
            <div className="tabs-container">
              <OptionsTabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

              {activeTab === 'character' && (
                <CharacterTab
                  generationOptions={generationOptions}
                  onOptionChange={updateGenerationOptions}
                />
              )}
              {activeTab === 'reminder' && (
                <ReminderTab
                  generationOptions={generationOptions}
                  onOptionChange={updateGenerationOptions}
                />
              )}
              {activeTab === 'meta' && (
                <MetaTab
                  generationOptions={generationOptions}
                  onOptionChange={updateGenerationOptions}
                />
              )}
              {activeTab === 'export' && (
                <ExportTab
                  generationOptions={generationOptions}
                  onOptionChange={updateGenerationOptions}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
