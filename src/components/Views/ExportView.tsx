import { useCallback, useMemo, useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { useTokenContext } from '../../contexts/TokenContext';
import { useExport } from '../../hooks/useExport';
import layoutStyles from '../../styles/components/layout/ViewLayout.module.css';
import styles from '../../styles/components/views/Views.module.css';
import type { CompressionLevel, ZipExportOptions } from '../../ts/types/index';
import { BLEED_CONFIG, PDF_OFFSET_CONFIG } from '../../ts/utils/measurementUtils';
import { ViewLayout } from '../Layout/ViewLayout';
import { EditableSlider } from '../Shared/Controls/EditableSlider';
import { MeasurementSlider } from '../Shared/Controls/MeasurementSlider';
import { Button } from '../Shared/UI/Button';
import { OptionGroup } from '../Shared/UI/OptionGroup';

const DEFAULT_ZIP_SETTINGS: ZipExportOptions = {
  saveInTeamFolders: true,
  saveRemindersSeparately: true,
  metaTokenFolder: true,
  includeScriptJson: false,
  compressionLevel: 'normal',
};

export function ExportView() {
  const {
    tokens,
    generationOptions,
    updateGenerationOptions,
    characters,
    scriptMeta: _scriptMeta,
  } = useTokenContext();
  const {
    downloadZip,
    downloadPdf,
    downloadJson,
    downloadStyleFormat,
    downloadAll,
    cancelExport: _cancelExport,
    isExporting: _isExporting,
    exportProgress: _exportProgress,
    exportStep: _exportStep,
  } = useExport();
  const { addToast } = useToast();
  const [activeZipSubTab, setActiveZipSubTab] = useState<'structure' | 'quality'>('structure');
  const [activePdfSubTab, setActivePdfSubTab] = useState<'layout' | 'quality'>('layout');
  const [isExportingNightOrder, setIsExportingNightOrder] = useState(false);

  // Ensure zipSettings has all required fields
  const zipSettings = useMemo(
    () => ({
      ...DEFAULT_ZIP_SETTINGS,
      ...generationOptions.zipSettings,
    }),
    [generationOptions.zipSettings]
  );

  const handleDownloadZip = async () => {
    try {
      addToast('Preparing ZIP download...', 'info');
      await downloadZip();
      addToast('ZIP file downloaded successfully', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      addToast(`Failed to create ZIP: ${message}`, 'error');
    }
  };

  const handleDownloadPdf = async () => {
    try {
      addToast('Preparing PDF download...', 'info');
      await downloadPdf();
      addToast('PDF downloaded successfully', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      addToast(`Failed to generate PDF: ${message}`, 'error');
    }
  };

  const handleDownloadJson = () => {
    try {
      addToast('Preparing JSON download...', 'info');
      downloadJson();
      addToast('JSON downloaded successfully', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      addToast(`Failed to download JSON: ${message}`, 'error');
    }
  };

  const handleDownloadStyleFormat = () => {
    try {
      addToast('Preparing style format download...', 'info');
      downloadStyleFormat();
      addToast('Style format downloaded successfully', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      addToast(`Failed to download style: ${message}`, 'error');
    }
  };

  const handleDownloadAll = async () => {
    try {
      addToast('Preparing complete package...', 'info');
      await downloadAll();
      addToast('All files downloaded successfully', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      addToast(`Failed to download all: ${message}`, 'error');
    }
  };

  const handleDownloadNightOrder = useCallback(async () => {
    if (isExportingNightOrder) return;
    if (characters.length === 0) {
      addToast('No characters found. Load a script first.', 'warning');
      return;
    }

    setIsExportingNightOrder(true);
    try {
      addToast('Preparing Night Order PDF...', 'info');
      // For now, inform the user to use the Script tab
      // A full implementation would require rendering the night order sheets programmatically
      addToast('Please use the Script tab to generate Night Order PDFs', 'info');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      addToast(`Failed to generate Night Order: ${message}`, 'error');
    } finally {
      setIsExportingNightOrder(false);
    }
  }, [isExportingNightOrder, characters, addToast]);

  const hasTokens = tokens.length > 0;

  return (
    <ViewLayout variant="2-panel">
      {/* Left Sidebar - Export Settings */}
      <ViewLayout.Panel position="left" width="left" scrollable>
        <div className={layoutStyles.panelContent}>
          {/* PNG Settings */}
          <details className={layoutStyles.sidebarCard} open>
            <summary className={layoutStyles.sectionHeader}>PNG Settings</summary>
            <div className={layoutStyles.optionSection}>
              <OptionGroup
                label="Embed Metadata"
                helpText="Include character info (name, team, ability) in PNG file metadata"
              >
                <input
                  type="checkbox"
                  className={styles.toggleSwitch}
                  checked={generationOptions.pngSettings?.embedMetadata ?? false}
                  onChange={(e) =>
                    updateGenerationOptions({
                      pngSettings: {
                        ...generationOptions.pngSettings,
                        embedMetadata: e.target.checked,
                        transparentBackground:
                          generationOptions.pngSettings?.transparentBackground ?? false,
                      },
                    })
                  }
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
                  onChange={(e) =>
                    updateGenerationOptions({
                      pngSettings: {
                        ...generationOptions.pngSettings,
                        embedMetadata: generationOptions.pngSettings?.embedMetadata ?? false,
                        transparentBackground: e.target.checked,
                      },
                    })
                  }
                />
              </OptionGroup>
            </div>
          </details>

          {/* ZIP Settings */}
          <details className={layoutStyles.sidebarCard} open>
            <summary className={layoutStyles.sectionHeader}>ZIP Settings</summary>
            <div className={layoutStyles.optionSection}>
              {/* Nested sub-tabs for ZIP */}
              <div className={styles.nestedSubtabs}>
                <button
                  type="button"
                  className={`${styles.nestedSubtabButton} ${activeZipSubTab === 'structure' ? styles.active : ''}`}
                  onClick={() => setActiveZipSubTab('structure')}
                >
                  Structure
                </button>
                <button
                  type="button"
                  className={`${styles.nestedSubtabButton} ${activeZipSubTab === 'quality' ? styles.active : ''}`}
                  onClick={() => setActiveZipSubTab('quality')}
                >
                  Quality
                </button>
              </div>

              {activeZipSubTab === 'structure' && (
                <>
                  <OptionGroup
                    label="Save in Team Folders"
                    helpText="Organize exported tokens by team (Townsfolk, Outsider, etc.)"
                  >
                    <input
                      type="checkbox"
                      className={styles.toggleSwitch}
                      checked={zipSettings.saveInTeamFolders}
                      onChange={(e) =>
                        updateGenerationOptions({
                          zipSettings: {
                            ...zipSettings,
                            saveInTeamFolders: e.target.checked,
                          },
                        })
                      }
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
                      onChange={(e) =>
                        updateGenerationOptions({
                          zipSettings: {
                            ...zipSettings,
                            saveRemindersSeparately: e.target.checked,
                          },
                        })
                      }
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
                      onChange={(e) =>
                        updateGenerationOptions({
                          zipSettings: {
                            ...zipSettings,
                            metaTokenFolder: e.target.checked,
                          },
                        })
                      }
                    />
                  </OptionGroup>
                </>
              )}

              {activeZipSubTab === 'quality' && (
                <OptionGroup
                  label="Compression Level"
                  helpText="Higher compression = smaller file but slower export"
                >
                  <select
                    className={styles.selectInput}
                    value={zipSettings.compressionLevel}
                    onChange={(e) =>
                      updateGenerationOptions({
                        zipSettings: {
                          ...zipSettings,
                          compressionLevel: e.target.value as CompressionLevel,
                        },
                      })
                    }
                  >
                    <option value="fast">Fast (larger file)</option>
                    <option value="normal">Normal (balanced)</option>
                    <option value="maximum">Maximum (smaller file)</option>
                  </select>
                </OptionGroup>
              )}
            </div>
          </details>

          {/* PDF Settings */}
          <details className={layoutStyles.sidebarCard} open>
            <summary className={layoutStyles.sectionHeader}>PDF Settings</summary>
            <div className={layoutStyles.optionSection}>
              {/* Nested sub-tabs for PDF */}
              <div className={styles.nestedSubtabs}>
                <button
                  type="button"
                  className={`${styles.nestedSubtabButton} ${activePdfSubTab === 'layout' ? styles.active : ''}`}
                  onClick={() => setActivePdfSubTab('layout')}
                >
                  Layout
                </button>
                <button
                  type="button"
                  className={`${styles.nestedSubtabButton} ${activePdfSubTab === 'quality' ? styles.active : ''}`}
                  onClick={() => setActivePdfSubTab('quality')}
                >
                  Quality
                </button>
              </div>

              {activePdfSubTab === 'layout' && (
                <>
                  <OptionGroup
                    label="X Offset"
                    helpText="Horizontal offset for fine-tuning alignment"
                    isSlider
                  >
                    <MeasurementSlider
                      value={generationOptions.pdfXOffset ?? 0}
                      onChange={(value) => updateGenerationOptions({ pdfXOffset: value })}
                      config={PDF_OFFSET_CONFIG}
                      displayUnit={generationOptions.measurementUnit || 'inches'}
                      ariaLabel="PDF X Offset value"
                    />
                  </OptionGroup>

                  <OptionGroup
                    label="Y Offset"
                    helpText="Vertical offset for fine-tuning alignment"
                    isSlider
                  >
                    <MeasurementSlider
                      value={generationOptions.pdfYOffset ?? 0}
                      onChange={(value) => updateGenerationOptions({ pdfYOffset: value })}
                      config={PDF_OFFSET_CONFIG}
                      displayUnit={generationOptions.measurementUnit || 'inches'}
                      ariaLabel="PDF Y Offset value"
                    />
                  </OptionGroup>

                  <OptionGroup
                    label="Print Bleed"
                    helpText="Extends edge colors outward for clean cutting - prevents white edges"
                    isSlider
                  >
                    <MeasurementSlider
                      value={generationOptions.pdfBleed ?? 0.125}
                      onChange={(value) => updateGenerationOptions({ pdfBleed: value })}
                      config={BLEED_CONFIG}
                      displayUnit={generationOptions.measurementUnit || 'inches'}
                      ariaLabel="PDF Print Bleed value"
                    />
                  </OptionGroup>
                </>
              )}

              {activePdfSubTab === 'quality' && (
                <OptionGroup
                  label="Image Quality"
                  helpText="JPEG quality for PDF images (higher = larger file, better quality)"
                  isSlider
                >
                  <EditableSlider
                    value={(generationOptions.pdfImageQuality ?? 0.9) * 100}
                    onChange={(value) => updateGenerationOptions({ pdfImageQuality: value / 100 })}
                    min={70}
                    max={100}
                    step={5}
                    defaultValue={90}
                    suffix="%"
                    ariaLabel="PDF image quality percentage"
                  />
                </OptionGroup>
              )}
            </div>
          </details>
        </div>
      </ViewLayout.Panel>

      {/* Right Content - Download Actions & Summary */}
      <ViewLayout.Panel position="right" width="flex" scrollable>
        <div className={styles.exportActionsPanel}>
          <h2 className={styles.exportTitle}>Download</h2>

          {hasTokens ? (
            <p className={styles.exportSummary}>
              {tokens.length} token{tokens.length !== 1 ? 's' : ''} ready for export
            </p>
          ) : (
            <div className={styles.noTokensMessage}>
              <p>No tokens generated yet.</p>
              <p className={styles.noTokensHint}>
                Generate tokens in the Editor or Gallery tab first, then come back here to download
                them.
              </p>
            </div>
          )}

          <div className={styles.exportButtons}>
            <Button
              variant="primary"
              fullWidth
              onClick={handleDownloadAll}
              disabled={!hasTokens}
              className={styles.btnExportAll}
            >
              <span className={styles.btnIcon}>📥</span>
              <span className={styles.btnText}>Download All</span>
            </Button>

            <div className={styles.exportButtonsGrid}>
              <Button
                variant="secondary"
                onClick={handleDownloadZip}
                disabled={!hasTokens}
                className={styles.btnExportSmall}
              >
                <span className={styles.btnIcon}>📦</span>
                <span className={styles.btnText}>Download Token Images</span>
              </Button>

              <Button
                variant="secondary"
                onClick={handleDownloadPdf}
                disabled={!hasTokens}
                className={styles.btnExportSmall}
              >
                <span className={styles.btnIcon}>🖨️</span>
                <span className={styles.btnText}>Download Token Print Sheet</span>
              </Button>

              <Button
                variant="secondary"
                onClick={handleDownloadJson}
                disabled={!hasTokens}
                className={styles.btnExportSmall}
              >
                <span className={styles.btnIcon}>📋</span>
                <span className={styles.btnText}>Download JSON</span>
              </Button>

              <Button
                variant="secondary"
                onClick={handleDownloadStyleFormat}
                disabled={!hasTokens}
                className={styles.btnExportSmall}
              >
                <span className={styles.btnIcon}>🎨</span>
                <span className={styles.btnText}>Download Style Format</span>
              </Button>

              <Button
                variant="secondary"
                onClick={handleDownloadNightOrder}
                disabled={isExportingNightOrder || characters.length === 0}
                className={styles.btnExportSmall}
              >
                <span className={styles.btnIcon}>🌙</span>
                <span className={styles.btnText}>
                  {isExportingNightOrder ? 'Generating...' : 'Generate Night Order'}
                </span>
              </Button>

              <Button
                variant="secondary"
                disabled
                title="Coming soon"
                className={styles.btnExportSmall}
              >
                <span className={styles.btnIcon}>📜</span>
                <span className={styles.btnText}>Download Script</span>
                <span className={styles.btnBadge}>Soon</span>
              </Button>
            </div>

            <p className={styles.btnDescription}>
              Token Print Sheets are compatible with Avery 94500 (1.75" character tokens) and Avery
              94509 (1" reminder tokens) label sheets.
            </p>
          </div>
        </div>
      </ViewLayout.Panel>
    </ViewLayout>
  );
}
