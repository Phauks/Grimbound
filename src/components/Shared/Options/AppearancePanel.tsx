import { memo, useState, useCallback } from 'react'
import type { GenerationOptions, MeasurementUnit, BackgroundStyle } from '../../../ts/types/index'
import { DEFAULT_BACKGROUND_STYLE } from '../../../ts/types/backgroundEffects'
import { BackgroundStyleSelector } from '../Selectors/BackgroundStyleSelector'
import { AssetPreviewSelector } from '../Selectors/AssetPreviewSelector'
import { FontSettingsSelector, type FontSettings, type FontOption } from '../Selectors/FontSettingsSelector'
import { IconSettingsSelector, type IconSettings } from '../Selectors/IconSettingsSelector'
import styles from '../../../styles/components/options/OptionsPanel.module.css'

interface AppearancePanelProps {
  generationOptions: GenerationOptions
  onOptionChange: (options: Partial<GenerationOptions>) => void
  projectId?: string
}

type TokenType = 'character' | 'reminder' | 'meta'

// Font configuration for each token type - unified approach
interface FontConfig {
  fontKey: keyof GenerationOptions
  colorKey: keyof GenerationOptions
  fontOptions: FontOption[]
  spacingKey: 'characterName' | 'abilityText' | 'reminderText' | 'metaText'
  previewText?: string
  label?: string
  defaultSpacing?: number
  defaultShadow?: number
}

// Background configuration for each token type
interface BackgroundConfig {
  typeKey: keyof GenerationOptions
  valueKey: keyof GenerationOptions
  colorKey: keyof GenerationOptions
  styleKey: keyof GenerationOptions  // For BackgroundStyle
  defaultType: 'styled' | 'image'
}

// ============================================================================
// BackgroundSection - Simplified to just use BackgroundStyleSelector
// ============================================================================

interface BackgroundSectionProps {
  config: BackgroundConfig
  tokenType: 'character' | 'reminder' | 'meta'
  generationOptions: GenerationOptions
  onOptionChange: (options: Partial<GenerationOptions>) => void
  projectId?: string
}

const BackgroundSection = memo(function BackgroundSection({
  config,
  tokenType,
  generationOptions,
  onOptionChange,
  projectId,
}: BackgroundSectionProps) {
  const handleStyleChange = useCallback((style: BackgroundStyle) => {
    onOptionChange({ [config.styleKey]: style })
  }, [config.styleKey, onOptionChange])

  return (
    <BackgroundStyleSelector
      value={(generationOptions[config.styleKey] as BackgroundStyle) || DEFAULT_BACKGROUND_STYLE}
      onChange={handleStyleChange}
      onPreviewChange={handleStyleChange}
      tokenType={tokenType}
      ariaLabel={`${tokenType} background style`}
      projectId={projectId}
      generationOptions={generationOptions}
    />
  )
})

// ============================================================================
// FontSection - Extracted as stable component to prevent re-mount on parent render
// ============================================================================

interface FontSectionProps {
  config: FontConfig
  generationOptions: GenerationOptions
  onOptionChange: (options: Partial<GenerationOptions>) => void
}

const FontSection = memo(function FontSection({
  config,
  generationOptions,
  onOptionChange,
}: FontSectionProps) {
  // Build current FontSettings from generationOptions
  const currentSettings: FontSettings = {
    fontFamily: (generationOptions[config.fontKey] as string) || config.fontOptions[0]?.value || '',
    color: (generationOptions[config.colorKey] as string) || '#FFFFFF',
    letterSpacing: generationOptions.fontSpacing?.[config.spacingKey] ?? config.defaultSpacing ?? 0,
    shadowBlur: generationOptions.textShadow?.[config.spacingKey] ?? config.defaultShadow ?? 4,
  }

  // Handle unified font settings change - memoized to prevent unnecessary re-renders
  const handleFontSettingsChange = useCallback((settings: FontSettings) => {
    const currentSpacing = generationOptions.fontSpacing || {
      characterName: 0,
      abilityText: 0,
      reminderText: 0,
      metaText: 0,
    }
    const currentShadow = generationOptions.textShadow || {
      characterName: 4,
      abilityText: 3,
      reminderText: 4,
      metaText: 4,
    }

    onOptionChange({
      [config.fontKey]: settings.fontFamily,
      [config.colorKey]: settings.color,
      fontSpacing: {
        ...currentSpacing,
        [config.spacingKey]: settings.letterSpacing,
      },
      textShadow: {
        ...currentShadow,
        [config.spacingKey]: settings.shadowBlur,
      },
    })
  }, [config, generationOptions.fontSpacing, generationOptions.textShadow, onOptionChange])

  return (
    <FontSettingsSelector
      value={currentSettings}
      onChange={handleFontSettingsChange}
      onPreviewChange={handleFontSettingsChange}
      fontOptions={config.fontOptions}
      previewText={config.previewText || 'Sample Text'}
      defaults={{
        letterSpacing: config.defaultSpacing ?? 0,
        shadowBlur: config.defaultShadow ?? 4,
      }}
      ariaLabel={config.label ? `${config.label} font settings` : 'Font settings'}
    />
  )
})

// ============================================================================
// IconSection - Extracted as stable component to prevent re-mount on parent render
// ============================================================================

interface IconSectionProps {
  tokenType: 'character' | 'reminder' | 'meta'
  generationOptions: GenerationOptions
  onOptionChange: (options: Partial<GenerationOptions>) => void
}

const IconSection = memo(function IconSection({
  tokenType,
  generationOptions,
  onOptionChange,
}: IconSectionProps) {
  const displayUnit: MeasurementUnit = generationOptions.measurementUnit || 'inches'
  const iconSettings = generationOptions.iconSettings?.[tokenType] || { scale: 1.0, offsetX: 0, offsetY: 0 }

  const handleIconSettingsChange = useCallback((settings: IconSettings) => {
    const currentSettings = generationOptions.iconSettings || {
      character: { scale: 1.0, offsetX: 0, offsetY: 0 },
      reminder: { scale: 1.0, offsetX: 0, offsetY: 0 },
      meta: { scale: 1.0, offsetX: 0, offsetY: 0 },
    }
    onOptionChange({
      iconSettings: {
        ...currentSettings,
        [tokenType]: settings,
      },
    })
  }, [tokenType, generationOptions.iconSettings, onOptionChange])

  return (
    <IconSettingsSelector
      value={iconSettings}
      onChange={handleIconSettingsChange}
      onPreviewChange={handleIconSettingsChange}
      displayUnit={displayUnit}
      tokenType={tokenType}
      ariaLabel={`${tokenType} icon settings`}
    />
  )
})

// ============================================================================
// AbilityTextSection - Toggleable font settings for ability text (character only)
// ============================================================================

export interface AbilityTextSectionProps {
  generationOptions: GenerationOptions
  onOptionChange: (options: Partial<GenerationOptions>) => void
}

export const AbilityTextSection = memo(function AbilityTextSection({
  generationOptions,
  onOptionChange,
}: AbilityTextSectionProps) {
  // Get enabled state (defaults to true for backwards compatibility)
  const isEnabled = generationOptions.displayAbilityText !== false

  // Handle enable/disable toggle
  const handleToggle = useCallback((enabled: boolean) => {
    onOptionChange({ displayAbilityText: enabled })
  }, [onOptionChange])

  // Build current FontSettings from generationOptions
  const currentSettings: FontSettings = {
    fontFamily: generationOptions.abilityTextFont || 'TradeGothic',
    color: generationOptions.abilityTextColor || '#FFFFFF',
    letterSpacing: generationOptions.fontSpacing?.abilityText ?? 0,
    shadowBlur: generationOptions.textShadow?.abilityText ?? 3,
  }

  // Font options for ability text
  const fontOptions: FontOption[] = [
    { value: 'TradeGothic', label: 'Trade Gothic', category: 'Sans Serif' },
    { value: 'TradeGothicBold', label: 'Trade Gothic Bold', category: 'Sans Serif' },
  ]

  // Handle font settings change
  const handleFontSettingsChange = useCallback((settings: FontSettings) => {
    const currentSpacing = generationOptions.fontSpacing || {
      characterName: 0,
      abilityText: 0,
      reminderText: 0,
      metaText: 0,
    }
    const currentShadow = generationOptions.textShadow || {
      characterName: 4,
      abilityText: 3,
      reminderText: 4,
      metaText: 4,
    }

    onOptionChange({
      abilityTextFont: settings.fontFamily,
      abilityTextColor: settings.color,
      fontSpacing: {
        ...currentSpacing,
        abilityText: settings.letterSpacing,
      },
      textShadow: {
        ...currentShadow,
        abilityText: settings.shadowBlur,
      },
    })
  }, [generationOptions.fontSpacing, generationOptions.textShadow, onOptionChange])

  // Toggle component - matches background section pattern (half-width)
  const EnableToggle = (
    <div className={styles.inboxToggle}>
      <button
        type="button"
        className={`${styles.inboxToggleButton} ${!isEnabled ? styles.inboxToggleButtonActive : ''}`}
        onClick={() => handleToggle(false)}
      >
        Off
      </button>
      <button
        type="button"
        className={`${styles.inboxToggleButton} ${isEnabled ? styles.inboxToggleButtonActive : ''}`}
        onClick={() => handleToggle(true)}
      >
        On
      </button>
    </div>
  )

  return (
    <FontSettingsSelector
      value={currentSettings}
      onChange={handleFontSettingsChange}
      onPreviewChange={handleFontSettingsChange}
      fontOptions={fontOptions}
      previewText="Ability Text"
      defaults={{
        letterSpacing: 0,
        shadowBlur: 3,
      }}
      visuallyDisabled={!isEnabled}
      headerSlot={EnableToggle}
      ariaLabel="Ability text font settings"
    />
  )
})

// ============================================================================
// SetupSection - Setup flower asset selector (character tokens only)
// ============================================================================

export interface SetupSectionProps {
  generationOptions: GenerationOptions
  onOptionChange: (options: Partial<GenerationOptions>) => void
  projectId?: string
}

export const SetupSection = memo(function SetupSection({
  generationOptions,
  onOptionChange,
  projectId,
}: SetupSectionProps) {
  const handleSetupChange = useCallback((value: string) => {
    onOptionChange({ setupFlowerStyle: value })
  }, [onOptionChange])

  return (
    <AssetPreviewSelector
      value={generationOptions.setupFlowerStyle || 'setup_flower_1'}
      onChange={handleSetupChange}
      assetType="setup-flower"
      shape="square"
      showNone={true}
      noneLabel="No flower"
      projectId={projectId}
      generationOptions={generationOptions}
    />
  )
})

// ============================================================================
// Main AppearancePanel Component
// ============================================================================

export const AppearancePanel = memo(({ generationOptions, onOptionChange, projectId }: AppearancePanelProps) => {
  const [activeTokenType, setActiveTokenType] = useState<TokenType>('character')

  // Configuration for each token type
  const characterBackgroundConfig: BackgroundConfig = {
    typeKey: 'characterBackgroundType',
    valueKey: 'characterBackground',
    colorKey: 'characterBackgroundColor',
    styleKey: 'characterBackgroundStyle',
    defaultType: 'styled',
  }

  const characterFontConfig: FontConfig = {
    fontKey: 'characterNameFont',
    colorKey: 'characterNameColor',
    fontOptions: [
      { value: 'Dumbledor', label: 'Dumbledor', category: 'Display' },
      { value: 'DumbledorThin', label: 'Dumbledor Thin', category: 'Display' },
      { value: 'DumbledorWide', label: 'Dumbledor Wide', category: 'Display' },
    ],
    spacingKey: 'characterName',
    previewText: 'Character Name',
    label: 'Character Name',
    defaultSpacing: 0,
    defaultShadow: 4,
  }

  const reminderBackgroundConfig: BackgroundConfig = {
    typeKey: 'reminderBackgroundType',
    valueKey: 'reminderBackgroundImage',
    colorKey: 'reminderBackground',
    styleKey: 'reminderBackgroundStyle',
    defaultType: 'styled',
  }

  const reminderFontConfig: FontConfig = {
    fontKey: 'characterReminderFont',
    colorKey: 'reminderTextColor',
    fontOptions: [
      { value: 'TradeGothic', label: 'Trade Gothic', category: 'Sans Serif' },
      { value: 'TradeGothicBold', label: 'Trade Gothic Bold', category: 'Sans Serif' },
    ],
    spacingKey: 'reminderText',
    previewText: 'Reminder Text',
    label: 'Reminder Text',
    defaultSpacing: 0,
    defaultShadow: 4,
  }

  const metaBackgroundConfig: BackgroundConfig = {
    typeKey: 'metaBackgroundType',
    valueKey: 'metaBackground',
    colorKey: 'metaBackgroundColor',
    styleKey: 'metaBackgroundStyle',
    defaultType: 'styled',
  }

  const metaFontConfig: FontConfig = {
    fontKey: 'metaNameFont',
    colorKey: 'metaNameColor',
    fontOptions: [
      { value: 'Dumbledor', label: 'Dumbledor', category: 'Display' },
      { value: 'DumbledorThin', label: 'Dumbledor Thin', category: 'Display' },
      { value: 'DumbledorWide', label: 'Dumbledor Wide', category: 'Display' },
    ],
    spacingKey: 'metaText',
    previewText: 'Meta Tokens',
    label: 'Meta Token',
    defaultSpacing: 0,
    defaultShadow: 4,
  }

  return (
    <div className={styles.panelContent}>
      {/* Token Type Tabs */}
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

      {/* Character Token Settings */}
      {activeTokenType === 'character' && (
        <div className={styles.settingsStack}>
          <div className={styles.settingsGroup}>
            <h4 className={styles.settingsGroupLabel}>Background</h4>
            <BackgroundSection
              config={characterBackgroundConfig}
              tokenType="character"
              generationOptions={generationOptions}
              onOptionChange={onOptionChange}
              projectId={projectId}
            />
          </div>

          <div className={styles.settingsGroup}>
            <h4 className={styles.settingsGroupLabel}>Character Name</h4>
            <FontSection
              config={characterFontConfig}
              generationOptions={generationOptions}
              onOptionChange={onOptionChange}
            />
          </div>

          <div className={styles.settingsGroup}>
            <h4 className={styles.settingsGroupLabel}>Icon</h4>
            <IconSection
              tokenType="character"
              generationOptions={generationOptions}
              onOptionChange={onOptionChange}
            />
          </div>
        </div>
      )}

      {/* Reminder Token Settings - NO Accent or Setup */}
      {activeTokenType === 'reminder' && (
        <div className={styles.settingsStack}>
          <div className={styles.settingsGroup}>
            <h4 className={styles.settingsGroupLabel}>Background</h4>
            <BackgroundSection
              config={reminderBackgroundConfig}
              tokenType="reminder"
              generationOptions={generationOptions}
              onOptionChange={onOptionChange}
              projectId={projectId}
            />
          </div>

          <div className={styles.settingsGroup}>
            <h4 className={styles.settingsGroupLabel}>Reminder Text</h4>
            <FontSection
              config={reminderFontConfig}
              generationOptions={generationOptions}
              onOptionChange={onOptionChange}
            />
          </div>

          <div className={styles.settingsGroup}>
            <h4 className={styles.settingsGroupLabel}>Icon</h4>
            <IconSection
              tokenType="reminder"
              generationOptions={generationOptions}
              onOptionChange={onOptionChange}
            />
          </div>
        </div>
      )}

      {/* Meta Token Settings - NO Accent or Setup */}
      {activeTokenType === 'meta' && (
        <div className={styles.settingsStack}>
          <div className={styles.settingsGroup}>
            <h4 className={styles.settingsGroupLabel}>Background</h4>
            <BackgroundSection
              config={metaBackgroundConfig}
              tokenType="meta"
              generationOptions={generationOptions}
              onOptionChange={onOptionChange}
              projectId={projectId}
            />
          </div>

          <div className={styles.settingsGroup}>
            <h4 className={styles.settingsGroupLabel}>Meta Text</h4>
            <FontSection
              config={metaFontConfig}
              generationOptions={generationOptions}
              onOptionChange={onOptionChange}
            />
          </div>

          <div className={styles.settingsGroup}>
            <h4 className={styles.settingsGroupLabel}>Icon</h4>
            <IconSection
              tokenType="meta"
              generationOptions={generationOptions}
              onOptionChange={onOptionChange}
            />
          </div>
        </div>
      )}
    </div>
  )
})

AppearancePanel.displayName = 'AppearancePanel'
