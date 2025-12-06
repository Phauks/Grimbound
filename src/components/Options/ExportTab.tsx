import { memo, useState } from 'react'
import type { GenerationOptions, CompressionLevel } from '../../ts/types/index'
import { OptionGroup } from '../Shared/OptionGroup'
import { SliderWithValue } from '../Shared/SliderWithValue'
import styles from '../../styles/components/options/OptionsTab.module.css'

interface ExportTabProps {
  generationOptions: GenerationOptions
  onOptionChange: (options: Partial<GenerationOptions>) => void
}

type ExportSubTabType = 'png' | 'zip' | 'pdf'

export const ExportTab = memo(({ generationOptions, onOptionChange }: ExportTabProps) => {
  const [activeSubTab, setActiveSubTab] = useState<ExportSubTabType>('png')

  return (
    <div className={styles.tabContent} data-tab-content="export">
      <div className={styles.subtabsContainer}>
        <div className={styles.subtabsNav}>
          <button
            className={`${styles.subtabButton} ${activeSubTab === 'png' ? styles.active : ''}`}
            onClick={() => setActiveSubTab('png')}
          >
            PNG
          </button>
          <button
            className={`${styles.subtabButton} ${activeSubTab === 'zip' ? styles.active : ''}`}
            onClick={() => setActiveSubTab('zip')}
          >
            ZIP
          </button>
          <button
            className={`${styles.subtabButton} ${activeSubTab === 'pdf' ? styles.active : ''}`}
            onClick={() => setActiveSubTab('pdf')}
          >
            PDF
          </button>
        </div>

        {/* PNG Sub-Tab */}
        {activeSubTab === 'png' && (
          <div className={styles.subtabContent}>
            <div className={styles.subsection}>
              <OptionGroup
                label="Embed Metadata"
                helpText="Include character info (name, team, ability) in PNG file metadata"
              >
                <input
                  type="checkbox"
                  className={styles.toggleSwitch}
                  checked={generationOptions.pngSettings?.embedMetadata ?? false}
                  onChange={(e) => onOptionChange({
                    pngSettings: {
                      ...generationOptions.pngSettings,
                      embedMetadata: e.target.checked,
                      transparentBackground: generationOptions.pngSettings?.transparentBackground ?? false
                    }
                  })}
                />
              </OptionGroup>

              <OptionGroup
                label="Transparent Background"
                helpText="Skip solid color fill (decorative background image is still drawn)"
              >
                <input
                  type="checkbox"
                  className={styles.toggleSwitch}
                  checked={generationOptions.pngSettings?.transparentBackground ?? false}
                  onChange={(e) => onOptionChange({
                    pngSettings: {
                      ...generationOptions.pngSettings,
                      embedMetadata: generationOptions.pngSettings?.embedMetadata ?? false,
                      transparentBackground: e.target.checked
                    }
                  })}
                />
              </OptionGroup>
            </div>
          </div>
        )}

        {/* ZIP Sub-Tab */}
        {activeSubTab === 'zip' && (
          <div className={styles.subtabContent}>
            <div className={styles.subsection}>
              <OptionGroup
                label="Save in Team Folders"
                helpText="Organize exported tokens by team (Townsfolk, Outsider, etc.)"
              >
                <input
                  type="checkbox"
                  className={styles.toggleSwitch}
                  checked={generationOptions.zipSettings?.saveInTeamFolders ?? true}
                  onChange={(e) => onOptionChange({
                    zipSettings: {
                      saveInTeamFolders: e.target.checked,
                      saveRemindersSeparately: generationOptions.zipSettings?.saveRemindersSeparately ?? true,
                      metaTokenFolder: generationOptions.zipSettings?.metaTokenFolder ?? true,
                      includeScriptJson: generationOptions.zipSettings?.includeScriptJson ?? false,
                      compressionLevel: generationOptions.zipSettings?.compressionLevel ?? 'normal'
                    }
                  })}
                />
              </OptionGroup>

              <OptionGroup
                label="Save Reminders Separately"
                helpText="Place reminder tokens in a separate folder from character tokens"
              >
                <input
                  type="checkbox"
                  className={styles.toggleSwitch}
                  checked={generationOptions.zipSettings?.saveRemindersSeparately ?? true}
                  onChange={(e) => onOptionChange({
                    zipSettings: {
                      saveInTeamFolders: generationOptions.zipSettings?.saveInTeamFolders ?? true,
                      saveRemindersSeparately: e.target.checked,
                      metaTokenFolder: generationOptions.zipSettings?.metaTokenFolder ?? true,
                      includeScriptJson: generationOptions.zipSettings?.includeScriptJson ?? false,
                      compressionLevel: generationOptions.zipSettings?.compressionLevel ?? 'normal'
                    }
                  })}
                />
              </OptionGroup>

              <OptionGroup
                label="Meta Token Folder"
                helpText="Place script name, almanac, and pandemonium tokens in a _meta folder"
              >
                <input
                  type="checkbox"
                  className={styles.toggleSwitch}
                  checked={generationOptions.zipSettings?.metaTokenFolder ?? true}
                  onChange={(e) => onOptionChange({
                    zipSettings: {
                      saveInTeamFolders: generationOptions.zipSettings?.saveInTeamFolders ?? true,
                      saveRemindersSeparately: generationOptions.zipSettings?.saveRemindersSeparately ?? true,
                      metaTokenFolder: e.target.checked,
                      includeScriptJson: generationOptions.zipSettings?.includeScriptJson ?? false,
                      compressionLevel: generationOptions.zipSettings?.compressionLevel ?? 'normal'
                    }
                  })}
                />
              </OptionGroup>

              <OptionGroup
                label="Include Script JSON"
                helpText="Bundle the source script.json file in the ZIP"
              >
                <input
                  type="checkbox"
                  className={styles.toggleSwitch}
                  checked={generationOptions.zipSettings?.includeScriptJson ?? false}
                  onChange={(e) => onOptionChange({
                    zipSettings: {
                      saveInTeamFolders: generationOptions.zipSettings?.saveInTeamFolders ?? true,
                      saveRemindersSeparately: generationOptions.zipSettings?.saveRemindersSeparately ?? true,
                      metaTokenFolder: generationOptions.zipSettings?.metaTokenFolder ?? true,
                      includeScriptJson: e.target.checked,
                      compressionLevel: generationOptions.zipSettings?.compressionLevel ?? 'normal'
                    }
                  })}
                />
              </OptionGroup>

              <OptionGroup
                label="Compression Level"
                helpText="Higher compression = smaller file but slower export"
              >
                <select
                  className={styles.selectInput}
                  value={generationOptions.zipSettings?.compressionLevel ?? 'normal'}
                  onChange={(e) => onOptionChange({
                    zipSettings: {
                      saveInTeamFolders: generationOptions.zipSettings?.saveInTeamFolders ?? true,
                      saveRemindersSeparately: generationOptions.zipSettings?.saveRemindersSeparately ?? true,
                      metaTokenFolder: generationOptions.zipSettings?.metaTokenFolder ?? true,
                      includeScriptJson: generationOptions.zipSettings?.includeScriptJson ?? false,
                      compressionLevel: e.target.value as CompressionLevel
                    }
                  })}
                >
                  <option value="fast">Fast (larger file)</option>
                  <option value="normal">Normal (balanced)</option>
                  <option value="maximum">Maximum (smaller file)</option>
                </select>
              </OptionGroup>
            </div>
          </div>
        )}

        {/* PDF Sub-Tab */}
        {activeSubTab === 'pdf' && (
          <div className={styles.subtabContent}>
            <div className={styles.subsection}>
              <OptionGroup
                label="X Offset"
                helpText="Fine-tune horizontal alignment for your printer"
                isSlider
              >
                <SliderWithValue
                  value={(generationOptions.pdfXOffset ?? 0) * 16}
                  onChange={(value) => onOptionChange({ pdfXOffset: value / 16 })}
                  min={-8}
                  max={8}
                  step={1}
                  defaultValue={0}
                  unit="/16 in"
                  ariaLabel="PDF X Offset value"
                />
              </OptionGroup>

              <OptionGroup
                label="Y Offset"
                helpText="Fine-tune vertical alignment for your printer"
                isSlider
              >
                <SliderWithValue
                  value={(generationOptions.pdfYOffset ?? 0) * 16}
                  onChange={(value) => onOptionChange({ pdfYOffset: value / 16 })}
                  min={-8}
                  max={8}
                  step={1}
                  defaultValue={0}
                  unit="/16 in"
                  ariaLabel="PDF Y Offset value"
                />
              </OptionGroup>

              <OptionGroup
                label="Print Bleed"
                helpText="Extends edge colors outward for clean cutting - prevents white edges"
                isSlider
              >
                <SliderWithValue
                  value={(generationOptions.pdfBleed ?? 0.125) * 32}
                  onChange={(value) => onOptionChange({ pdfBleed: value / 32 })}
                  min={0}
                  max={4}
                  step={1}
                  defaultValue={4}
                  unit="/32 in"
                  ariaLabel="PDF Print Bleed value"
                />
              </OptionGroup>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

ExportTab.displayName = 'ExportTab'
