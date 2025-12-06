import { memo, useState, useMemo } from 'react'
import type { GenerationOptions, ImageOption } from '../../ts/types/index'
import { ImageSelector } from '../Shared/ImageSelector'
import { OptionGroup } from '../Shared/OptionGroup'
import { SliderWithValue } from '../Shared/SliderWithValue'
import styles from '../../styles/components/options/OptionsPanel.module.css'

interface OptionsPanelProps {
  generationOptions: GenerationOptions
  onOptionChange: (options: Partial<GenerationOptions>) => void
}

type OptionTab = 'decoratives' | 'display' | 'meta'

// Generate flower options from available assets
const FLOWER_OPTIONS: ImageOption[] = Array.from({ length: 7 }, (_, i) => ({
  id: `setup_flower_${i + 1}`,
  label: `Flower ${i + 1}`,
  src: `/assets/images/setup_flower/setup_flower_${i + 1}.png`,
  source: 'builtin' as const,
}))

// Generate leaf options from available assets
const LEAF_OPTIONS: ImageOption[] = [
  {
    id: 'classic',
    label: 'Classic',
    src: '/assets/images/leaves/classic/leaf_1.png',
    source: 'builtin' as const,
  },
]

export const OptionsPanel = memo(({ generationOptions, onOptionChange }: OptionsPanelProps) => {
  const [activeTab, setActiveTab] = useState<OptionTab>('decoratives')

  const handleFontSpacingChange = (type: string, value: number): void => {
    const currentSpacing = generationOptions.fontSpacing || {
      characterName: 0,
      abilityText: 0,
      reminderText: 0,
      metaText: 0,
    }
    onOptionChange({
      fontSpacing: {
        ...currentSpacing,
        [type]: value,
      },
    })
  }

  const handleTextShadowChange = (type: string, value: number): void => {
    const currentShadow = generationOptions.textShadow || {
      characterName: 4,
      abilityText: 3,
      reminderText: 3,
      metaText: 4,
    }
    onOptionChange({
      textShadow: {
        ...currentShadow,
        [type]: value,
      },
    })
  }

  return (
    <div className={styles.panelContent}>
      <div className={styles.tabsNav}>
        <button
          className={`${styles.tabButton} ${activeTab === 'decoratives' ? styles.active : ''}`}
          onClick={() => setActiveTab('decoratives')}
        >
          Character
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'display' ? styles.active : ''}`}
          onClick={() => setActiveTab('display')}
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

      {activeTab === 'decoratives' && (
        <div className={styles.tabContent}>
          <div className={styles.sectionContent}>
            <OptionGroup label="Setup Flower">
              <ImageSelector
                options={FLOWER_OPTIONS}
                value={generationOptions.setupFlowerStyle || 'setup_flower_1'}
                onChange={(value) => onOptionChange({ setupFlowerStyle: value })}
                shape="circle"
                showNone={true}
                noneLabel="No flower"
                ariaLabel="Select setup flower style"
              />
            </OptionGroup>

            <OptionGroup label="Leaf Style">
              <ImageSelector
                options={LEAF_OPTIONS}
                value={generationOptions.leafGeneration || 'classic'}
                onChange={(value) => onOptionChange({ leafGeneration: value })}
                shape="square"
                showNone={false}
                ariaLabel="Select leaf style"
              />
            </OptionGroup>

            <OptionGroup label="Reminder Count" description="Show number of reminder tokens on character">
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={generationOptions.tokenCount !== false}
                  onChange={(e) => onOptionChange({ tokenCount: e.target.checked })}
                />
              </label>
            </OptionGroup>

            <OptionGroup label="Generate Variants" description="Generate tokens for characters with multiple images">
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={generationOptions.generateImageVariants || false}
                  onChange={(e) => onOptionChange({ generateImageVariants: e.target.checked })}
                />
              </label>
            </OptionGroup>

            <OptionGroup label="Ability Text" description="Show ability text on character token">
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={generationOptions.displayAbilityText !== false}
                  onChange={(e) => onOptionChange({ displayAbilityText: e.target.checked })}
                />
              </label>
            </OptionGroup>

            {generationOptions.displayAbilityText !== false && (
              <div className={styles.nestedOptions}>
                <OptionGroup label="Font">
                  <select
                    className={styles.selectInput}
                    value={generationOptions.abilityTextFont}
                    onChange={(e) => onOptionChange({ abilityTextFont: e.target.value })}
                  >
                    <option value="TradeGothic">Trade Gothic</option>
                    <option value="TradeGothicBold">Trade Gothic Bold</option>
                  </select>
                </OptionGroup>

                <OptionGroup label="Color">
                  <input
                    type="color"
                    className={styles.colorInput}
                    value={generationOptions.abilityTextColor}
                    onChange={(e) => onOptionChange({ abilityTextColor: e.target.value })}
                  />
                </OptionGroup>

                <OptionGroup label="Spacing" isSlider>
                  <SliderWithValue
                    value={generationOptions.fontSpacing?.abilityText || 0}
                    onChange={(value) => handleFontSpacingChange('abilityText', value)}
                    min={0}
                    max={20}
                    defaultValue={0}
                    unit="px"
                    ariaLabel="Ability Text Font Spacing"
                  />
                </OptionGroup>

                <OptionGroup label="Shadow" isSlider>
                  <SliderWithValue
                    value={generationOptions.textShadow?.abilityText || 0}
                    onChange={(value) => handleTextShadowChange('abilityText', value)}
                    min={0}
                    max={20}
                    defaultValue={3}
                    unit="px"
                    ariaLabel="Ability Text Shadow"
                  />
                </OptionGroup>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'display' && (
        <div className={styles.tabContent}>
          <div className={styles.sectionContent}>
            <p className={styles.emptyMessage}>No reminder-specific options available.</p>
          </div>
        </div>
      )}

      {activeTab === 'meta' && (
        <div className={styles.tabContent}>
          <div className={styles.sectionContent}>
            <OptionGroup label="Pandemonium" description="Include Pandemonium Institute token">
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={generationOptions.pandemoniumToken !== false}
                  onChange={(e) => onOptionChange({ pandemoniumToken: e.target.checked })}
                />
              </label>
            </OptionGroup>

            <OptionGroup label="Script Name" description="Include Script Name token">
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={generationOptions.scriptNameToken !== false}
                  onChange={(e) => onOptionChange({ scriptNameToken: e.target.checked })}
                />
              </label>
            </OptionGroup>

            <OptionGroup label="Almanac" description="Include Almanac link token">
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={generationOptions.almanacToken !== false}
                  onChange={(e) => onOptionChange({ almanacToken: e.target.checked })}
                />
              </label>
            </OptionGroup>

            <OptionGroup label="Tool Token" description="To Be Implemented">
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  disabled
                />
              </label>
            </OptionGroup>

            <OptionGroup label="Shareable Script" description="To Be Implemented">
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  disabled
                />
              </label>
            </OptionGroup>
          </div>
        </div>
      )}
    </div>
  )
})

OptionsPanel.displayName = 'OptionsPanel'
