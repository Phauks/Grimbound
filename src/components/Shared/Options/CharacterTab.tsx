import { memo, useState } from 'react'
import type { GenerationOptions } from '../../../ts/types/index'
import { AssetPreviewSelector } from '../Selectors/AssetPreviewSelector'
import { ColorPreviewSelector } from '../Selectors/ColorPreviewSelector'
import { OptionGroup } from '../UI/OptionGroup'
import { SegmentedControl } from '../UI/SegmentedControl'
import { SliderWithValue } from '../Controls/SliderWithValue'
import styles from '../../../styles/components/options/OptionsTab.module.css'

interface CharacterTabProps {
  generationOptions: GenerationOptions
  onOptionChange: (options: Partial<GenerationOptions>) => void
  projectId?: string
}

type SubTabType = 'background' | 'name' | 'ability' | 'decoratives' | 'qol'

export const CharacterTab = memo(({ generationOptions, onOptionChange, projectId }: CharacterTabProps) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('background')

  const handleFontSpacingChange = (type: string, value: number) => {
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

  const handleTextShadowChange = (type: string, value: number) => {
    const currentShadow = generationOptions.textShadow || {
      characterName: 4,
      abilityText: 3,
      reminderText: 4,
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
    <div className={styles.tabContent} data-tab-content="character">
      <div className={styles.subtabsContainer}>
        <div className={styles.subtabsNav}>
          <button
            className={`${styles.subtabButton} ${activeSubTab === 'background' ? styles.active : ''}`}
            onClick={() => setActiveSubTab('background')}
          >
            Background
          </button>
          <button
            className={`${styles.subtabButton} ${activeSubTab === 'name' ? styles.active : ''}`}
            onClick={() => setActiveSubTab('name')}
          >
            Font
          </button>
          <button
            className={`${styles.subtabButton} ${activeSubTab === 'ability' ? styles.active : ''}`}
            onClick={() => setActiveSubTab('ability')}
          >
            Ability
          </button>
          <button
            className={`${styles.subtabButton} ${activeSubTab === 'decoratives' ? styles.active : ''}`}
            onClick={() => setActiveSubTab('decoratives')}
          >
            Decoratives
          </button>
          <button
            className={`${styles.subtabButton} ${activeSubTab === 'qol' ? styles.active : ''}`}
            onClick={() => setActiveSubTab('qol')}
          >
            QoL
          </button>
        </div>

        {/* Background Sub-Tab */}
        {activeSubTab === 'background' && (
          <div className={styles.subtabContent}>
            <div className={styles.subsection}>
              <OptionGroup label="Type">
                <SegmentedControl
                  options={[
                    { value: 'image', label: 'Image' },
                    { value: 'color', label: 'Color' },
                  ]}
                  value={generationOptions.characterBackgroundType || 'image'}
                  onChange={(value) => onOptionChange({ characterBackgroundType: value as 'color' | 'image' })}
                />
              </OptionGroup>

              {/* Direct selector without wrapper - matches AppearancePanel */}
              {generationOptions.characterBackgroundType === 'color' ? (
                <ColorPreviewSelector
                  value={generationOptions.characterBackgroundColor || '#FFFFFF'}
                  onChange={(value) => onOptionChange({ characterBackgroundColor: value })}
                  shape="circle"
                />
              ) : (
                <AssetPreviewSelector
                  value={generationOptions.characterBackground || 'character_background_1'}
                  onChange={(value) => onOptionChange({ characterBackground: value })}
                  assetType="token-background"
                  shape="circle"
                  showNone={false}
                  projectId={projectId}
                  generationOptions={generationOptions}
                />
              )}
            </div>
          </div>
        )}

        {/* Name Sub-Tab */}
        {activeSubTab === 'name' && (
          <div className={styles.subtabContent}>
            <div className={styles.subsection}>
              <OptionGroup label="Font" description="Select the typeface used to display character names on tokens.">
                <select
                  className={styles.selectInput}
                  value={generationOptions.characterNameFont}
                  onChange={(e) => onOptionChange({ characterNameFont: e.target.value })}
                >
                  <option value="Dumbledor">Dumbledor</option>
                  <option value="DumbledorThin">Dumbledor Thin</option>
                  <option value="DumbledorWide">Dumbledor Wide</option>
                </select>
              </OptionGroup>

              <OptionGroup label="Color" description="Choose the text color for character names.">
                <input
                  type="color"
                  className={styles.colorInput}
                  value={generationOptions.characterNameColor}
                  onChange={(e) => onOptionChange({ characterNameColor: e.target.value })}
                />
              </OptionGroup>

              <OptionGroup
                label="Font Spacing"
                description="Adjust the horizontal spacing between letters in the character name. Higher values spread letters apart."
                isSlider
              >
                <SliderWithValue
                  value={generationOptions.fontSpacing?.characterName || 0}
                  onChange={(value) => handleFontSpacingChange('characterName', value)}
                  min={0}
                  max={20}
                  defaultValue={0}
                  unit="px"
                  ariaLabel="Character Name Font Spacing value"
                />
              </OptionGroup>

              <OptionGroup
                label="Text Shadow"
                helpText="Adjust text shadow intensity"
                isSlider
              >
                <SliderWithValue
                  value={generationOptions.textShadow?.characterName || 0}
                  onChange={(value) => handleTextShadowChange('characterName', value)}
                  min={0}
                  max={20}
                  defaultValue={4}
                  unit="px"
                  ariaLabel="Character Name Text Shadow value"
                />
              </OptionGroup>
            </div>
          </div>
        )}

        {/* Ability Sub-Tab */}
        {activeSubTab === 'ability' && (
          <div className={styles.subtabContent}>
            <div className={styles.subsection}>
              <OptionGroup
                label="Display Ability Text"
                helpText="Display ability text on character tokens"
              >
                <input
                  type="checkbox"
                  className={styles.toggleSwitch}
                  checked={generationOptions.displayAbilityText}
                  onChange={(e) => onOptionChange({ displayAbilityText: e.target.checked })}
                />
              </OptionGroup>

              <OptionGroup label="Font" helpText="Font for ability text display">
                <select
                  className={styles.selectInput}
                  value={generationOptions.abilityTextFont}
                  onChange={(e) => onOptionChange({ abilityTextFont: e.target.value })}
                >
                  <option value="TradeGothic">Trade Gothic</option>
                  <option value="TradeGothicBold">Trade Gothic Bold</option>
                </select>
              </OptionGroup>

              <OptionGroup label="Color" helpText="Color for ability text">
                <input
                  type="color"
                  className={styles.colorInput}
                  value={generationOptions.abilityTextColor}
                  onChange={(e) => onOptionChange({ abilityTextColor: e.target.value })}
                />
              </OptionGroup>

              <OptionGroup
                label="Font Spacing"
                helpText="Adjust spacing between ability text characters"
                isSlider
              >
                <SliderWithValue
                  value={generationOptions.fontSpacing?.abilityText || 0}
                  onChange={(value) => handleFontSpacingChange('abilityText', value)}
                  min={0}
                  max={20}
                  defaultValue={0}
                  unit="px"
                  ariaLabel="Ability Text Font Spacing value"
                />
              </OptionGroup>

              <OptionGroup label="Text Shadow" helpText="Adjust text shadow intensity" isSlider>
                <SliderWithValue
                  value={generationOptions.textShadow?.abilityText || 0}
                  onChange={(value) => handleTextShadowChange('abilityText', value)}
                  min={0}
                  max={20}
                  defaultValue={3}
                  unit="px"
                  ariaLabel="Ability Text Shadow value"
                />
              </OptionGroup>
            </div>
          </div>
        )}

        {/* Decoratives Sub-Tab */}
        {activeSubTab === 'decoratives' && (
          <div className={styles.subtabContent}>
            <div className={styles.subsection}>
              {/* Setup Flower - clean selector matching AppearancePanel style */}
              <AssetPreviewSelector
                value={generationOptions.setupFlowerStyle || 'setup_flower_1'}
                onChange={(value) => onOptionChange({ setupFlowerStyle: value })}
                assetType="setup-flower"
                shape="square"
                showNone={false}
                projectId={projectId}
                generationOptions={generationOptions}
              />

              <OptionGroup
                label="Maximum Leaves"
                helpText="Maximum number of leaves to generate (0 = disabled)"
                isSlider
              >
                <SliderWithValue
                  value={Math.min(generationOptions.maximumLeaves ?? 0, (generationOptions.leafSlots || 7) + 2)}
                  onChange={(value) => onOptionChange({ maximumLeaves: value })}
                  min={0}
                  max={(generationOptions.leafSlots || 7) + 2}
                  defaultValue={0}
                  ariaLabel="Maximum Leaves value"
                />
              </OptionGroup>

              {(generationOptions.maximumLeaves ?? 0) > 0 && (
                <>
                  {/* Leaf Style - clean selector */}
                  <AssetPreviewSelector
                    value={generationOptions.leafGeneration || 'classic'}
                    onChange={(value) => onOptionChange({ leafGeneration: value })}
                    assetType="leaf"
                    shape="square"
                    showNone={false}
                    projectId={projectId}
                    generationOptions={generationOptions}
                  />

                  <OptionGroup
                    label="Leaf Probability"
                    helpText="Chance of each position spawning a leaf (0-100%)"
                    isSlider
                  >
                    <SliderWithValue
                      value={generationOptions.leafPopulationProbability || 30}
                      onChange={(value) => onOptionChange({ leafPopulationProbability: value })}
                      min={0}
                      max={100}
                      defaultValue={30}
                      unit="%"
                      ariaLabel="Leaf Population Probability value"
                    />
                  </OptionGroup>

                  <OptionGroup
                    label="Arc Span"
                    helpText="Width of the arc for top leaves in degrees (30-180)"
                    isSlider
                  >
                    <SliderWithValue
                      value={generationOptions.leafArcSpan || 120}
                      onChange={(value) => onOptionChange({ leafArcSpan: value })}
                      min={30}
                      max={180}
                      defaultValue={120}
                      unit="°"
                      ariaLabel="Leaf Arc Span value"
                    />
                  </OptionGroup>

                  <OptionGroup
                    label="Arc Slots"
                    helpText="Number of leaf positions along the top arc (3-15)"
                    isSlider
                  >
                    <SliderWithValue
                      value={generationOptions.leafSlots || 7}
                      onChange={(value) => onOptionChange({ leafSlots: value })}
                      min={3}
                      max={15}
                      defaultValue={7}
                      ariaLabel="Leaf Arc Slots value"
                    />
                  </OptionGroup>
                </>
              )}
            </div>
          </div>
        )}

        {/* QoL Sub-Tab */}
        {activeSubTab === 'qol' && (
          <div className={styles.subtabContent}>
            <div className={styles.subsection}>
              <OptionGroup
                label="Show Reminder Count"
                helpText="Show reminder count on character tokens"
              >
                <input
                  type="checkbox"
                  className={styles.toggleSwitch}
                  checked={generationOptions.tokenCount}
                  onChange={(e) => onOptionChange({ tokenCount: e.target.checked })}
                />
              </OptionGroup>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

CharacterTab.displayName = 'CharacterTab'
