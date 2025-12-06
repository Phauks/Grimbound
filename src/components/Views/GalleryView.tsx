import { useState } from 'react'
import { useTokenContext } from '../../contexts/TokenContext'
import { usePresets, type CustomPreset } from '../../hooks/usePresets'
import { PresetSection } from '../Presets/PresetSection'
import { FilterBar } from '../TokenGrid/FilterBar'
import { AppearancePanel } from '../Options/AppearancePanel'
import { OptionsPanel } from '../Options/OptionsPanel'
import { TokenGrid } from '../TokenGrid/TokenGrid'
import { TokenPreviewRow } from '../TokenGrid/TokenPreviewRow'
import type { Token } from '../../ts/types/index'
import styles from '../../styles/components/views/Views.module.css'

interface GalleryViewProps {
  onTokenClick: (token: Token) => void
}

export function GalleryView({ onTokenClick }: GalleryViewProps) {
  const { generationOptions, updateGenerationOptions, generationProgress, isLoading } = useTokenContext()
  const { getCustomPresets } = usePresets()
  // Initialize with presets directly to avoid flash of empty state
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>(() => getCustomPresets())

  return (
    <div className={styles.galleryView}>
      {/* Left Sidebar - Presets and Options */}
      <aside className={styles.gallerySidebar}>
        <div className={styles.panelContent}>
          <details className={styles.sidebarCard} open>
            <summary className={styles.sectionHeader}>Presets</summary>
            <div className={styles.optionSection}>
              <PresetSection
                customPresets={customPresets}
                onCustomPresetsChange={setCustomPresets}
                onShowSaveModal={() => {}}
              />
            </div>
          </details>

          <details className={styles.sidebarCard}>
            <summary className={styles.sectionHeader}>Filters</summary>
            <div className={styles.optionSection}>
              <FilterBar />
            </div>
          </details>

          <details className={styles.sidebarCard} open>
            <summary className={styles.sectionHeader}>Appearance</summary>
            <div className={styles.optionSection}>
              <AppearancePanel
                generationOptions={generationOptions}
                onOptionChange={updateGenerationOptions}
              />
            </div>
          </details>

          <details className={styles.sidebarCard} open>
            <summary className={styles.sectionHeader}>Options</summary>
            <div className={styles.optionSection}>
              <OptionsPanel
                generationOptions={generationOptions}
                onOptionChange={updateGenerationOptions}
              />
            </div>
          </details>
        </div>
      </aside>

      {/* Right Content - Token Grid */}
      <div className={styles.galleryContent}>
        <TokenPreviewRow />
        <div className={styles.galleryHeader}>
          {isLoading && generationProgress && (
            <div className={styles.generationProgress}>
              Generating {generationProgress.current}/{generationProgress.total}...
            </div>
          )}
        </div>
        <TokenGrid onTokenClick={onTokenClick} />
      </div>
    </div>
  )
}
