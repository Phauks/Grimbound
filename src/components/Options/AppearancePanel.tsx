import { memo, useState } from 'react'
import type { GenerationOptions, ImageOption } from '../../ts/types/index'
import { ImageSelector } from '../Shared/ImageSelector'
import { OptionGroup } from '../Shared/OptionGroup'
import { SegmentedControl } from '../Shared/SegmentedControl'
import { SliderWithValue } from '../Shared/SliderWithValue'
import styles from '../../styles/components/options/OptionsPanel.module.css'

interface AppearancePanelProps {
  generationOptions: GenerationOptions
  onOptionChange: (options: Partial<GenerationOptions>) => void
}

type TokenType = 'character' | 'reminder' | 'meta'
type SectionType = 'background' | 'font' | 'icon'

// Generate background options from available assets
const BACKGROUND_OPTIONS: ImageOption[] = Array.from({ length: 7 }, (_, i) => ({
  id: `character_background_${i + 1}`,
  label: `Background ${i + 1}`,
  src: `/assets/images/character_background/character_background_${i + 1}.png`,
  source: 'builtin' as const,
}))

// Font configuration for each token type
interface FontConfig {
  fontKey: keyof GenerationOptions
  colorKey: keyof GenerationOptions
  fontOptions: Array<{ value: string; label: string }>
  spacingKey: 'characterName' | 'abilityText' | 'reminderText' | 'metaText'
}

// Background configuration for each token type
interface BackgroundConfig {
  typeKey: keyof GenerationOptions
  valueKey: keyof GenerationOptions
  colorKey: keyof GenerationOptions
  defaultType: 'color' | 'image'
}

export const AppearancePanel = memo(({ generationOptions, onOptionChange }: AppearancePanelProps) => {
  const [activeTokenType, setActiveTokenType] = useState<TokenType>('character')
  const [activeSection, setActiveSection] = useState<SectionType>('background')

  // Consolidated font spacing handler
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

  // Consolidated text shadow handler
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

  // Reusable Background Section Component
  const BackgroundSection = ({ config }: { config: BackgroundConfig }) => (
    <div className={styles.sectionContent}>
      <OptionGroup label="Type">
        <SegmentedControl
          options={[
            { value: config.defaultType === 'image' ? 'image' : 'color', label: config.defaultType === 'image' ? 'Image' : 'Color' },
            { value: config.defaultType === 'image' ? 'color' : 'image', label: config.defaultType === 'image' ? 'Color' : 'Image' },
          ]}
          value={(generationOptions[config.typeKey] as 'color' | 'image') || config.defaultType}
          onChange={(value) => onOptionChange({ [config.typeKey]: value as 'color' | 'image' })}
        />
      </OptionGroup>

      <OptionGroup label="Value">
        {(generationOptions[config.typeKey] as 'color' | 'image') === 'color' ? (
          <input
            type="color"
            className={styles.colorInput}
            value={(generationOptions[config.colorKey] as string) || '#FFFFFF'}
            onChange={(e) => onOptionChange({ [config.colorKey]: e.target.value })}
          />
        ) : (
          <ImageSelector
            options={BACKGROUND_OPTIONS}
            value={(generationOptions[config.valueKey] as string) || 'character_background_1'}
            onChange={(value) => onOptionChange({ [config.valueKey]: value })}
            shape="circle"
            showNone={false}
            ariaLabel="Select background"
          />
        )}
      </OptionGroup>
    </div>
  )

  // Reusable Font Section Component
  const FontSection = ({ config }: { config: FontConfig }) => (
    <div className={styles.sectionContent}>
      <OptionGroup label="Font">
        <select
          className={styles.selectInput}
          value={generationOptions[config.fontKey] as string}
          onChange={(e) => onOptionChange({ [config.fontKey]: e.target.value })}
        >
          {config.fontOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </OptionGroup>

      <OptionGroup label="Color">
        <input
          type="color"
          className={styles.colorInput}
          value={generationOptions[config.colorKey] as string}
          onChange={(e) => onOptionChange({ [config.colorKey]: e.target.value })}
        />
      </OptionGroup>

      <OptionGroup label="Spacing" isSlider>
        <SliderWithValue
          value={generationOptions.fontSpacing?.[config.spacingKey] || 0}
          onChange={(value) => handleFontSpacingChange(config.spacingKey, value)}
          min={0}
          max={20}
          defaultValue={0}
          unit="px"
          ariaLabel={`${config.spacingKey} Font Spacing`}
        />
      </OptionGroup>

      <OptionGroup label="Shadow" isSlider>
        <SliderWithValue
          value={generationOptions.textShadow?.[config.spacingKey] || 4}
          onChange={(value) => handleTextShadowChange(config.spacingKey, value)}
          min={0}
          max={20}
          defaultValue={4}
          unit="px"
          ariaLabel={`${config.spacingKey} Text Shadow`}
        />
      </OptionGroup>
    </div>
  )

  // Reusable Icon Section Component
  const IconSection = ({ tokenType }: { tokenType: 'character' | 'reminder' | 'meta' }) => {
    const handleIconChange = (property: 'scale' | 'offsetX' | 'offsetY', value: number) => {
      const currentSettings = generationOptions.iconSettings || {
        character: { scale: 1.0, offsetX: 0, offsetY: 0 },
        reminder: { scale: 1.0, offsetX: 0, offsetY: 0 },
        meta: { scale: 1.0, offsetX: 0, offsetY: 0 },
      }
      onOptionChange({
        iconSettings: {
          ...currentSettings,
          [tokenType]: {
            ...currentSettings[tokenType],
            [property]: value,
          },
        },
      })
    }

    const iconSettings = generationOptions.iconSettings?.[tokenType] || { scale: 1.0, offsetX: 0, offsetY: 0 }

    return (
      <div className={styles.sectionContent}>
        <OptionGroup label="Scale" isSlider>
          <SliderWithValue
            value={iconSettings.scale}
            onChange={(value) => handleIconChange('scale', value)}
            min={0.5}
            max={2.0}
            step={0.1}
            defaultValue={1.0}
            unit="x"
            ariaLabel={`${tokenType} Icon Scale`}
          />
        </OptionGroup>

        <OptionGroup label="Offset X" isSlider>
          <SliderWithValue
            value={iconSettings.offsetX}
            onChange={(value) => handleIconChange('offsetX', value)}
            min={-100}
            max={100}
            defaultValue={0}
            unit="px"
            ariaLabel={`${tokenType} Icon Horizontal Offset`}
          />
        </OptionGroup>

        <OptionGroup label="Offset Y" isSlider>
          <SliderWithValue
            value={iconSettings.offsetY}
            onChange={(value) => handleIconChange('offsetY', value)}
            min={-100}
            max={100}
            defaultValue={0}
            unit="px"
            ariaLabel={`${tokenType} Icon Vertical Offset`}
          />
        </OptionGroup>
      </div>
    )
  }

  // Configuration for each token type
  const characterBackgroundConfig: BackgroundConfig = {
    typeKey: 'characterBackgroundType',
    valueKey: 'characterBackground',
    colorKey: 'characterBackgroundColor',
    defaultType: 'image',
  }

  const characterFontConfig: FontConfig = {
    fontKey: 'characterNameFont',
    colorKey: 'characterNameColor',
    fontOptions: [
      { value: 'Dumbledor', label: 'Dumbledor' },
      { value: 'DumbledorThin', label: 'Dumbledor Thin' },
      { value: 'DumbledorWide', label: 'Dumbledor Wide' },
    ],
    spacingKey: 'characterName',
  }

  const reminderBackgroundConfig: BackgroundConfig = {
    typeKey: 'reminderBackgroundType',
    valueKey: 'reminderBackgroundImage',
    colorKey: 'reminderBackground',
    defaultType: 'color',
  }

  const reminderFontConfig: FontConfig = {
    fontKey: 'characterReminderFont',
    colorKey: 'reminderTextColor',
    fontOptions: [
      { value: 'TradeGothic', label: 'Trade Gothic' },
      { value: 'TradeGothicBold', label: 'Trade Gothic Bold' },
    ],
    spacingKey: 'reminderText',
  }

  const metaBackgroundConfig: BackgroundConfig = {
    typeKey: 'metaBackgroundType',
    valueKey: 'metaBackground',
    colorKey: 'metaBackgroundColor',
    defaultType: 'image',
  }

  const metaFontConfig: FontConfig = {
    fontKey: 'metaNameFont',
    colorKey: 'metaNameColor',
    fontOptions: [
      { value: 'Dumbledor', label: 'Dumbledor' },
      { value: 'DumbledorThin', label: 'Dumbledor Thin' },
      { value: 'DumbledorWide', label: 'Dumbledor Wide' },
    ],
    spacingKey: 'metaText',
  }

  return (
    <div className={styles.panelContent}>
      <div className={styles.tabsNav}>
        <button
          className={`${styles.tabButton} ${activeTokenType === 'character' ? styles.active : ''}`}
          onClick={() => setActiveTokenType('character')}
        >
          Character
        </button>
        <button
          className={`${styles.tabButton} ${activeTokenType === 'reminder' ? styles.active : ''}`}
          onClick={() => setActiveTokenType('reminder')}
        >
          Reminder
        </button>
        <button
          className={`${styles.tabButton} ${activeTokenType === 'meta' ? styles.active : ''}`}
          onClick={() => setActiveTokenType('meta')}
        >
          Meta
        </button>
      </div>

      {activeTokenType === 'character' && (
        <div className={styles.tabContent}>
          {/* Section tabs */}
          <div className={styles.subTabsNav}>
            <button
              className={`${styles.subTabButton} ${activeSection === 'background' ? styles.active : ''}`}
              onClick={() => setActiveSection('background')}
            >
              Background
            </button>
            <button
              className={`${styles.subTabButton} ${activeSection === 'font' ? styles.active : ''}`}
              onClick={() => setActiveSection('font')}
            >
              Font
            </button>
            <button
              className={`${styles.subTabButton} ${activeSection === 'icon' ? styles.active : ''}`}
              onClick={() => setActiveSection('icon')}
            >
              Icon
            </button>
          </div>

          {/* Section content */}
          {activeSection === 'background' && <BackgroundSection config={characterBackgroundConfig} />}
          {activeSection === 'font' && <FontSection config={characterFontConfig} />}
          {activeSection === 'icon' && <IconSection tokenType="character" />}
        </div>
      )}

      {activeTokenType === 'reminder' && (
        <div className={styles.tabContent}>
          {/* Section tabs */}
          <div className={styles.subTabsNav}>
            <button
              className={`${styles.subTabButton} ${activeSection === 'background' ? styles.active : ''}`}
              onClick={() => setActiveSection('background')}
            >
              Background
            </button>
            <button
              className={`${styles.subTabButton} ${activeSection === 'font' ? styles.active : ''}`}
              onClick={() => setActiveSection('font')}
            >
              Font
            </button>
            <button
              className={`${styles.subTabButton} ${activeSection === 'icon' ? styles.active : ''}`}
              onClick={() => setActiveSection('icon')}
            >
              Icon
            </button>
          </div>

          {/* Section content */}
          {activeSection === 'background' && <BackgroundSection config={reminderBackgroundConfig} />}
          {activeSection === 'font' && <FontSection config={reminderFontConfig} />}
          {activeSection === 'icon' && <IconSection tokenType="reminder" />}
        </div>
      )}

      {activeTokenType === 'meta' && (
        <div className={styles.tabContent}>
          {/* Section tabs */}
          <div className={styles.subTabsNav}>
            <button
              className={`${styles.subTabButton} ${activeSection === 'background' ? styles.active : ''}`}
              onClick={() => setActiveSection('background')}
            >
              Background
            </button>
            <button
              className={`${styles.subTabButton} ${activeSection === 'font' ? styles.active : ''}`}
              onClick={() => setActiveSection('font')}
            >
              Font
            </button>
            <button
              className={`${styles.subTabButton} ${activeSection === 'icon' ? styles.active : ''}`}
              onClick={() => setActiveSection('icon')}
            >
              Icon
            </button>
          </div>

          {/* Section content */}
          {activeSection === 'background' && <BackgroundSection config={metaBackgroundConfig} />}
          {activeSection === 'font' && <FontSection config={metaFontConfig} />}
          {activeSection === 'icon' && <IconSection tokenType="meta" />}
        </div>
      )}
    </div>
  )
})

AppearancePanel.displayName = 'AppearancePanel'
