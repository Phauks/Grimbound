import { memo, useState } from 'react'
import type { GenerationOptions } from '../../ts/types/index'
import { OptionGroup } from '../Shared/OptionGroup'
import { SegmentedControl } from '../Shared/SegmentedControl'
import styles from '../../styles/components/options/OptionsTab.module.css'

interface MetaTabProps {
  generationOptions: GenerationOptions
  onOptionChange: (options: Partial<GenerationOptions>) => void
}

type SubTabType = 'tokens' | 'background' | 'font'

export const MetaTab = memo(({ generationOptions, onOptionChange }: MetaTabProps) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('tokens')

  return (
    <div className={styles.tabContent} data-tab-content="meta">
      <div className={styles.subtabsContainer}>
        <div className={styles.subtabsNav}>
          <button
            className={`${styles.subtabButton} ${activeSubTab === 'tokens' ? styles.active : ''}`}
            onClick={() => setActiveSubTab('tokens')}
          >
            Tokens
          </button>
          <button
            className={`${styles.subtabButton} ${activeSubTab === 'background' ? styles.active : ''}`}
            onClick={() => setActiveSubTab('background')}
          >
            Background
          </button>
          <button
            className={`${styles.subtabButton} ${activeSubTab === 'font' ? styles.active : ''}`}
            onClick={() => setActiveSubTab('font')}
          >
            Font
          </button>
        </div>

        {/* Tokens Sub-Tab */}
        {activeSubTab === 'tokens' && (
          <div className={styles.subtabContent}>
            <div className={styles.subsection}>
              <OptionGroup
                label="Pandemonium Institute"
                helpText="Generate official game branding token"
              >
                <input
                  type="checkbox"
                  className={styles.toggleSwitch}
                  checked={generationOptions.pandemoniumToken}
                  onChange={(e) => onOptionChange({ pandemoniumToken: e.target.checked })}
                />
              </OptionGroup>

              <OptionGroup
                label="Script Name"
                helpText="Generate a meta token showing script name and author"
              >
                <input
                  type="checkbox"
                  className={styles.toggleSwitch}
                  checked={generationOptions.scriptNameToken}
                  onChange={(e) => onOptionChange({ scriptNameToken: e.target.checked })}
                />
              </OptionGroup>

              <OptionGroup
                label="Almanac QR"
                helpText="Generate a QR code token linking to the almanac"
              >
                <input
                  type="checkbox"
                  className={styles.toggleSwitch}
                  checked={generationOptions.almanacToken}
                  onChange={(e) => onOptionChange({ almanacToken: e.target.checked })}
                />
              </OptionGroup>
            </div>
          </div>
        )}

        {/* Background Sub-Tab */}
        {activeSubTab === 'background' && (
          <div className={styles.subtabContent}>
            <div className={styles.subsection}>
              <OptionGroup label="Background Type" description="Choose between a solid color or image background.">
                <SegmentedControl
                  options={[
                    { value: 'image', label: 'Image' },
                    { value: 'color', label: 'Color' },
                  ]}
                  value={generationOptions.metaBackgroundType || 'image'}
                  onChange={(value) => onOptionChange({ metaBackgroundType: value as 'color' | 'image' })}
                />
              </OptionGroup>

              {generationOptions.metaBackgroundType === 'color' ? (
                <OptionGroup
                  label="Background Color"
                  description="Choose a solid background color for meta tokens."
                >
                  <input
                    type="color"
                    className={styles.colorInput}
                    value={generationOptions.metaBackgroundColor || '#FFFFFF'}
                    onChange={(e) => onOptionChange({ metaBackgroundColor: e.target.value })}
                  />
                </OptionGroup>
              ) : (
                <OptionGroup
                  label="Background Image"
                  description="Choose the decorative pattern for meta tokens."
                >
                  <select
                    className={styles.selectInput}
                    value={generationOptions.metaBackground || 'character_background_1'}
                    onChange={(e) => onOptionChange({ metaBackground: e.target.value })}
                  >
                    {Array.from({ length: 7 }, (_, i) => (
                      <option key={i + 1} value={`character_background_${i + 1}`}>
                        Background {i + 1}
                      </option>
                    ))}
                  </select>
                </OptionGroup>
              )}
            </div>
          </div>
        )}

        {/* Font Sub-Tab */}
        {activeSubTab === 'font' && (
          <div className={styles.subtabContent}>
            <div className={styles.subsection}>
              <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>TBI</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

MetaTab.displayName = 'MetaTab'
