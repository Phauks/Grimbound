import { memo, useState, useMemo } from 'react'
import { useTokenContext } from '../../contexts/TokenContext'
import { useExport } from '../../hooks/useExport'
import { useToast } from '../../contexts/ToastContext'
import { OptionGroup } from '../Shared/OptionGroup'
import { SliderWithValue } from '../Shared/SliderWithValue'
import styles from '../../styles/components/views/Views.module.css'
import type { CompressionLevel, ZipExportOptions } from '../../ts/types/index'

const DEFAULT_ZIP_SETTINGS: ZipExportOptions = {
  saveInTeamFolders: true,
  saveRemindersSeparately: true,
  metaTokenFolder: true,
  includeScriptJson: false,
  compressionLevel: 'normal'
}

export function DownloadView() {
  const { tokens, generationOptions, updateGenerationOptions } = useTokenContext()
  const { downloadZip, downloadPdf, downloadJson, downloadStyleFormat, downloadAll, cancelExport, isExporting, exportProgress, exportStep } = useExport()
  const { addToast } = useToast()
  const [activeSubTab, setActiveSubTab] = useState<'png' | 'zip' | 'pdf'>('zip')
  const [activeZipSubTab, setActiveZipSubTab] = useState<'structure' | 'quality'>('structure')
  const [activePdfSubTab, setActivePdfSubTab] = useState<'layout' | 'quality'>('layout')

  // Ensure zipSettings has all required fields
  const zipSettings = useMemo(() => ({
    ...DEFAULT_ZIP_SETTINGS,
    ...generationOptions.zipSettings
  }), [generationOptions.zipSettings])

  const handleDownloadZip = async () => {
    try {
      addToast('Preparing ZIP download...', 'info')
      await downloadZip()
      addToast('ZIP file downloaded successfully', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      addToast(`Failed to create ZIP: ${message}`, 'error')
    }
  }

  const handleDownloadPdf = async () => {
    try {
      addToast('Preparing PDF download...', 'info')
      await downloadPdf()
      addToast('PDF downloaded successfully', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      addToast(`Failed to generate PDF: ${message}`, 'error')
    }
  }

  const handleDownloadJson = () => {
    try {
      addToast('Preparing JSON download...', 'info')
      downloadJson()
      addToast('JSON downloaded successfully', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      addToast(`Failed to download JSON: ${message}`, 'error')
    }
  }

  const handleDownloadStyleFormat = () => {
    try {
      addToast('Preparing style format download...', 'info')
      downloadStyleFormat()
      addToast('Style format downloaded successfully', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      addToast(`Failed to download style: ${message}`, 'error')
    }
  }

  const handleDownloadAll = async () => {
    try {
      addToast('Preparing complete package...', 'info')
      await downloadAll()
      addToast('All files downloaded successfully', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      addToast(`Failed to download all: ${message}`, 'error')
    }
  }

  const hasTokens = tokens.length > 0

  return (
    <div className={styles.exportView}>
      <div className={styles.exportTwoColumn}>
        {/* Left Column: Export Settings */}
        <div className={styles.exportOptionsColumn}>
          <h2>Export Settings</h2>
          
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

            {/* PNG Settings */}
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
                      onChange={(e) => updateGenerationOptions({
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
                      onChange={(e) => updateGenerationOptions({
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

            {/* ZIP Settings */}
            {activeSubTab === 'zip' && (
              <div className={styles.subtabContent}>
                {/* Nested sub-tabs for ZIP */}
                <div className={styles.nestedSubtabs}>
                  <button
                    className={`${styles.nestedSubtabButton} ${activeZipSubTab === 'structure' ? styles.active : ''}`}
                    onClick={() => setActiveZipSubTab('structure')}
                  >
                    📁 Structure
                  </button>
                  <button
                    className={`${styles.nestedSubtabButton} ${activeZipSubTab === 'quality' ? styles.active : ''}`}
                    onClick={() => setActiveZipSubTab('quality')}
                  >
                    ⚙️ Quality
                  </button>
                </div>

                {activeZipSubTab === 'structure' && (
                  <div className={styles.subsection}>
                    <OptionGroup
                      label="Save in Team Folders"
                      helpText="Organize exported tokens by team (Townsfolk, Outsider, etc.)"
                    >
                      <input
                        type="checkbox"
                        className={styles.toggleSwitch}
                        checked={zipSettings.saveInTeamFolders}
                        onChange={(e) => updateGenerationOptions({
                          zipSettings: {
                            ...zipSettings,
                            saveInTeamFolders: e.target.checked,
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
                        checked={zipSettings.saveRemindersSeparately}
                        onChange={(e) => updateGenerationOptions({
                          zipSettings: {
                            ...zipSettings,
                            saveRemindersSeparately: e.target.checked,
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
                        checked={zipSettings.metaTokenFolder}
                        onChange={(e) => updateGenerationOptions({
                          zipSettings: {
                            ...zipSettings,
                            metaTokenFolder: e.target.checked,
                          }
                        })}
                      />
                    </OptionGroup>
                  </div>
                )}

                {activeZipSubTab === 'quality' && (
                  <div className={styles.subsection}>
                    <OptionGroup
                      label="Compression Level"
                      helpText="Higher compression = smaller file but slower export"
                    >
                      <select
                        className={styles.selectInput}
                        value={zipSettings.compressionLevel}
                        onChange={(e) => updateGenerationOptions({
                          zipSettings: {
                            ...zipSettings,
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
                )}
              </div>
            )}

            {/* PDF Settings */}
            {activeSubTab === 'pdf' && (
              <div className={styles.subtabContent}>
                {/* Nested sub-tabs for PDF */}
                <div className={styles.nestedSubtabs}>
                  <button
                    className={`${styles.nestedSubtabButton} ${activePdfSubTab === 'layout' ? styles.active : ''}`}
                    onClick={() => setActivePdfSubTab('layout')}
                  >
                    📐 Layout
                  </button>
                  <button
                    className={`${styles.nestedSubtabButton} ${activePdfSubTab === 'quality' ? styles.active : ''}`}
                    onClick={() => setActivePdfSubTab('quality')}
                  >
                    ✨ Quality
                  </button>
                </div>

                {activePdfSubTab === 'layout' && (
                  <div className={styles.subsection}>
                    <OptionGroup
                      label="Padding"
                      helpText="Padding between tokens on PDF"
                      isSlider
                    >
                      <SliderWithValue
                        value={(generationOptions.pdfPadding ?? 0.25) * 8}
                        onChange={(value) => updateGenerationOptions({ pdfPadding: value / 8 })}
                        min={0}
                        max={4}
                        step={1}
                        defaultValue={2}
                        unit="/8 in"
                        ariaLabel="PDF Padding value"
                      />
                    </OptionGroup>

                    <OptionGroup
                      label="X Offset"
                      helpText="Horizontal offset for fine-tuning alignment"
                      isSlider
                    >
                      <SliderWithValue
                        value={(generationOptions.pdfXOffset ?? 0) * 16}
                        onChange={(value) => updateGenerationOptions({ pdfXOffset: value / 16 })}
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
                      helpText="Vertical offset for fine-tuning alignment"
                      isSlider
                    >
                      <SliderWithValue
                        value={(generationOptions.pdfYOffset ?? 0) * 16}
                        onChange={(value) => updateGenerationOptions({ pdfYOffset: value / 16 })}
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
                        onChange={(value) => updateGenerationOptions({ pdfBleed: value / 32 })}
                        min={0}
                        max={4}
                        step={1}
                        defaultValue={4}
                        unit="/32 in"
                        ariaLabel="PDF Print Bleed value"
                      />
                    </OptionGroup>
                  </div>
                )}

                {activePdfSubTab === 'quality' && (
                  <div className={styles.subsection}>
                    <OptionGroup
                      label="Image Quality"
                      helpText="JPEG quality for PDF images (higher = larger file, better quality)"
                      isSlider
                    >
                      <SliderWithValue
                        value={(generationOptions.pdfImageQuality ?? 0.90) * 100}
                        onChange={(value) => updateGenerationOptions({ pdfImageQuality: value / 100 })}
                        min={70}
                        max={100}
                        step={5}
                        defaultValue={90}
                        unit="%"
                        ariaLabel="PDF image quality percentage"
                      />
                    </OptionGroup>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Download Actions */}
        <div className={styles.exportActionsColumn}>
          <h2>Download</h2>
          {hasTokens ? (
            <p className={styles.exportSummary}>
              {tokens.length} token{tokens.length !== 1 ? 's' : ''} ready for export
            </p>
          ) : (
            <div className={styles.noTokensMessage}>
              <p>No tokens generated yet.</p>
              <p className={styles.noTokensHint}>Generate tokens in the Editor or Gallery tab first, then come back here to download them.</p>
            </div>
          )}

          <div className={styles.exportButtons}>
            <button
              className={`btn-primary ${styles.btnExport} ${styles.btnExportAll}`}
              onClick={handleDownloadAll}
              disabled={!hasTokens}
            >
              <span className={styles.btnIcon}>📥</span>
              <span className={styles.btnText}>Download All</span>
            </button>
            
            <div className={styles.exportButtonsGrid}>
              <button
                className={`btn-secondary ${styles.btnExportSmall}`}
                onClick={handleDownloadZip}
                disabled={!hasTokens}
              >
                <span className={styles.btnIcon}>📦</span>
                <span className={styles.btnText}>Download Token Images</span>
              </button>
              
              <div className={styles.btnWithInfo}>
                <button
                  className={`btn-secondary ${styles.btnExportSmall}`}
                  onClick={handleDownloadPdf}
                  disabled={!hasTokens}
                >
                  <span className={styles.btnIcon}>🖨️</span>
                  <span className={styles.btnText}>Download Token Print Sheet</span>
                </button>
                <span className={styles.infoIconCorner} title="Compatible with Avery 94500 (1.75” character tokens) and Avery 94509 (1” reminder tokens) label sheets">
                  ℹ️
                </span>
              </div>
              
              <button
                className={`btn-secondary ${styles.btnExportSmall}`}
                onClick={handleDownloadJson}
                disabled={!hasTokens}
              >
                <span className={styles.btnIcon}>📋</span>
                <span className={styles.btnText}>Download JSON</span>
              </button>
              
              <button
                className={`btn-secondary ${styles.btnExportSmall}`}
                onClick={handleDownloadStyleFormat}
                disabled={!hasTokens}
              >
                <span className={styles.btnIcon}>🎨</span>
                <span className={styles.btnText}>Download Style Format</span>
              </button>
              
              <button
                className={`btn-secondary ${styles.btnExportSmall}`}
                disabled={true}
                title="Coming soon"
              >
                <span className={styles.btnIcon}>📜</span>
                <span className={styles.btnText}>Download Script</span>
                <span className={styles.btnBadge}>Soon</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
