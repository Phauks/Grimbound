import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '@/contexts/ToastContext';
import { useTokenContext } from '@/contexts/TokenContext';
import { useExpandablePanel } from '@/hooks/useExpandablePanel';
import { useExport } from '@/hooks/useExport';
import layoutStyles from '@/styles/components/layout/ViewLayout.module.css';
import styles from '@/styles/components/views/Views.module.css';
import baseStyles from '@/styles/components/shared/SettingsSelectorBase.module.css';
import exportStyles from '@/styles/components/views/ExportView.module.css';
import type { CompressionLevel, ZipExportOptions } from '@/ts/types/index';
import { BLEED_CONFIG, PDF_OFFSET_CONFIG } from '@/ts/utils/measurementUtils';
import { ViewLayout } from '@/components/Layout/ViewLayout';
import { EditableSlider } from '@/components/Shared/Controls/EditableSlider';
import { MeasurementSlider } from '@/components/Shared/Controls/MeasurementSlider';
import { Button } from '@/components/Shared/UI/Button';
import { OptionGroup } from '@/components/Shared/UI/OptionGroup';
import {
  SettingsSelectorBase,
  PreviewBox,
  InfoSection,
} from '@/components/Shared/Selectors/SettingsSelectorBase';

const DEFAULT_ZIP_SETTINGS: ZipExportOptions = {
  saveInTeamFolders: true,
  saveRemindersSeparately: true,
  metaTokenFolder: true,
  includeScriptJson: false,
  compressionLevel: 'normal',
};

// Types for panel state
interface PngSettings {
  embedMetadata: boolean;
  transparentBackground: boolean;
}

interface ZipSettings {
  saveInTeamFolders: boolean;
  saveRemindersSeparately: boolean;
  metaTokenFolder: boolean;
  includeScriptJson: boolean;
  compressionLevel: CompressionLevel;
}

interface PdfSettings {
  xOffset: number;
  yOffset: number;
  bleed: number;
  imageQuality: number;
}

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
  const [isExportingNightOrder, setIsExportingNightOrder] = useState(false);

  // Current settings from context
  const currentPngSettings: PngSettings = useMemo(
    () => ({
      embedMetadata: generationOptions.pngSettings?.embedMetadata ?? false,
      transparentBackground: generationOptions.pngSettings?.transparentBackground ?? false,
    }),
    [generationOptions.pngSettings]
  );

  const currentZipSettings: ZipSettings = useMemo(
    () => ({
      ...DEFAULT_ZIP_SETTINGS,
      ...generationOptions.zipSettings,
    }),
    [generationOptions.zipSettings]
  );

  const currentPdfSettings: PdfSettings = useMemo(
    () => ({
      xOffset: generationOptions.pdfXOffset ?? 0,
      yOffset: generationOptions.pdfYOffset ?? 0,
      bleed: generationOptions.pdfBleed ?? 0.125,
      imageQuality: generationOptions.pdfImageQuality ?? 0.9,
    }),
    [
      generationOptions.pdfXOffset,
      generationOptions.pdfYOffset,
      generationOptions.pdfBleed,
      generationOptions.pdfImageQuality,
    ]
  );

  // Panel handlers
  const handlePngChange = useCallback(
    (settings: PngSettings) => {
      updateGenerationOptions({
        pngSettings: {
          embedMetadata: settings.embedMetadata,
          transparentBackground: settings.transparentBackground,
        },
      });
    },
    [updateGenerationOptions]
  );

  const handleZipChange = useCallback(
    (settings: ZipSettings) => {
      updateGenerationOptions({
        zipSettings: settings,
      });
    },
    [updateGenerationOptions]
  );

  const handlePdfChange = useCallback(
    (settings: PdfSettings) => {
      updateGenerationOptions({
        pdfXOffset: settings.xOffset,
        pdfYOffset: settings.yOffset,
        pdfBleed: settings.bleed,
        pdfImageQuality: settings.imageQuality,
      });
    },
    [updateGenerationOptions]
  );

  // Use expandable panel hook for each settings box
  const pngPanel = useExpandablePanel<PngSettings>({
    value: currentPngSettings,
    onChange: handlePngChange,
    onPreviewChange: handlePngChange,
    panelHeight: 180,
    minPanelWidth: 300,
  });

  const zipPanel = useExpandablePanel<ZipSettings>({
    value: currentZipSettings,
    onChange: handleZipChange,
    onPreviewChange: handleZipChange,
    panelHeight: 200,
    minPanelWidth: 420,
  });

  const pdfPanel = useExpandablePanel<PdfSettings>({
    value: currentPdfSettings,
    onChange: handlePdfChange,
    onPreviewChange: handlePdfChange,
    panelHeight: 200,
    minPanelWidth: 420,
  });

  // Summary helper functions
  const getPngSummary = () => {
    const settings = pngPanel.isExpanded ? pngPanel.pendingValue : currentPngSettings;
    const parts: string[] = [];
    if (settings.embedMetadata) parts.push('Metadata');
    if (settings.transparentBackground) parts.push('Transparent');
    else parts.push('Opaque');
    return parts.join(', ');
  };

  const getZipSummary = () => {
    const settings = zipPanel.isExpanded ? zipPanel.pendingValue : currentZipSettings;
    const parts: string[] = [];
    if (settings.saveInTeamFolders) parts.push('Team folders');
    parts.push(
      settings.compressionLevel === 'fast'
        ? 'Fast'
        : settings.compressionLevel === 'maximum'
          ? 'Max'
          : 'Normal'
    );
    return parts.join(', ');
  };

  const getPdfSummary = () => {
    const settings = pdfPanel.isExpanded ? pdfPanel.pendingValue : currentPdfSettings;
    const quality = Math.round(settings.imageQuality * 100);
    return `${quality}% quality`;
  };

  // Download handlers
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
      addToast('Please use the Script tab to generate Night Order PDFs', 'info');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      addToast(`Failed to generate Night Order: ${message}`, 'error');
    } finally {
      setIsExportingNightOrder(false);
    }
  }, [isExportingNightOrder, characters, addToast]);

  const hasTokens = tokens.length > 0;

  // Render PNG Settings Panel
  const renderPngPanel = () => {
    if (!(pngPanel.isExpanded && pngPanel.panelPosition)) return null;

    const panelStyle: React.CSSProperties = {
      position: 'fixed',
      top: pngPanel.panelPosition.openUpward ? 'auto' : pngPanel.panelPosition.top,
      bottom: pngPanel.panelPosition.openUpward
        ? window.innerHeight - pngPanel.panelPosition.top
        : 'auto',
      left: pngPanel.panelPosition.left,
      width: pngPanel.panelPosition.width,
      zIndex: 10000,
    };

    return createPortal(
      <div
        ref={pngPanel.panelRef}
        className={`${baseStyles.panel} ${pngPanel.panelPosition.openUpward ? baseStyles.panelUpward : ''}`}
        style={panelStyle}
      >
        <div className={baseStyles.panelContent}>
          <OptionGroup
            label="Embed Metadata"
            helpText="Include character info (name, team, ability) in PNG file metadata"
          >
            <input
              type="checkbox"
              className={styles.toggleSwitch}
              checked={pngPanel.pendingValue.embedMetadata}
              onChange={(e) => pngPanel.updatePendingField('embedMetadata', e.target.checked)}
            />
          </OptionGroup>

          <OptionGroup
            label="Transparent Background"
            helpText="Skip solid color fill (decorative background image is still drawn)"
          >
            <input
              type="checkbox"
              className={styles.toggleSwitch}
              checked={pngPanel.pendingValue.transparentBackground}
              onChange={(e) =>
                pngPanel.updatePendingField('transparentBackground', e.target.checked)
              }
            />
          </OptionGroup>
        </div>

        <div className={baseStyles.panelFooter}>
          <button
            type="button"
            className={baseStyles.resetLink}
            onClick={() =>
              pngPanel.reset({ embedMetadata: false, transparentBackground: false })
            }
          >
            Reset
          </button>
          <div className={baseStyles.panelActions}>
            <button type="button" className={baseStyles.cancelButton} onClick={pngPanel.cancel}>
              Cancel
            </button>
            <button type="button" className={baseStyles.confirmButton} onClick={pngPanel.apply}>
              Apply
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // Render ZIP Settings Panel
  const renderZipPanel = () => {
    if (!(zipPanel.isExpanded && zipPanel.panelPosition)) return null;

    const panelStyle: React.CSSProperties = {
      position: 'fixed',
      top: zipPanel.panelPosition.openUpward ? 'auto' : zipPanel.panelPosition.top,
      bottom: zipPanel.panelPosition.openUpward
        ? window.innerHeight - zipPanel.panelPosition.top
        : 'auto',
      left: zipPanel.panelPosition.left,
      width: zipPanel.panelPosition.width,
      zIndex: 10000,
    };

    return createPortal(
      <div
        ref={zipPanel.panelRef}
        className={`${baseStyles.panel} ${zipPanel.panelPosition.openUpward ? baseStyles.panelUpward : ''}`}
        style={panelStyle}
      >
        <div className={exportStyles.twoPanelLayout}>
          {/* Left Panel: Structure */}
          <div className={exportStyles.leftPanel}>
            <div className={exportStyles.panelTitle}>Structure</div>
            <label className={exportStyles.checkboxRow}>
              <input
                type="checkbox"
                checked={zipPanel.pendingValue.saveInTeamFolders}
                onChange={(e) =>
                  zipPanel.updatePendingField('saveInTeamFolders', e.target.checked)
                }
              />
              <span className={exportStyles.checkboxLabel}>Team Folders</span>
            </label>
            <label className={exportStyles.checkboxRow}>
              <input
                type="checkbox"
                checked={zipPanel.pendingValue.saveRemindersSeparately}
                onChange={(e) =>
                  zipPanel.updatePendingField('saveRemindersSeparately', e.target.checked)
                }
              />
              <span className={exportStyles.checkboxLabel}>Reminders Separate</span>
            </label>
            <label className={exportStyles.checkboxRow}>
              <input
                type="checkbox"
                checked={zipPanel.pendingValue.metaTokenFolder}
                onChange={(e) => zipPanel.updatePendingField('metaTokenFolder', e.target.checked)}
              />
              <span className={exportStyles.checkboxLabel}>Meta Folder</span>
            </label>
            <label className={exportStyles.checkboxRow}>
              <input
                type="checkbox"
                checked={zipPanel.pendingValue.includeScriptJson}
                onChange={(e) =>
                  zipPanel.updatePendingField('includeScriptJson', e.target.checked)
                }
              />
              <span className={exportStyles.checkboxLabel}>Include Script JSON</span>
            </label>
          </div>

          {/* Right Panel: Quality */}
          <div className={exportStyles.rightPanel}>
            <div className={exportStyles.panelTitle}>Quality</div>
            <div className={exportStyles.selectRow}>
              <label className={exportStyles.selectLabel}>Compression Level</label>
              <select
                className={exportStyles.selectInput}
                value={zipPanel.pendingValue.compressionLevel}
                onChange={(e) =>
                  zipPanel.updatePendingField('compressionLevel', e.target.value as CompressionLevel)
                }
              >
                <option value="fast">Fast (larger file)</option>
                <option value="normal">Normal (balanced)</option>
                <option value="maximum">Maximum (smaller file)</option>
              </select>
            </div>
          </div>
        </div>

        <div className={baseStyles.panelFooter}>
          <button
            type="button"
            className={baseStyles.resetLink}
            onClick={() => zipPanel.reset(DEFAULT_ZIP_SETTINGS)}
          >
            Reset
          </button>
          <div className={baseStyles.panelActions}>
            <button type="button" className={baseStyles.cancelButton} onClick={zipPanel.cancel}>
              Cancel
            </button>
            <button type="button" className={baseStyles.confirmButton} onClick={zipPanel.apply}>
              Apply
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // Render PDF Settings Panel
  const renderPdfPanel = () => {
    if (!(pdfPanel.isExpanded && pdfPanel.panelPosition)) return null;

    const panelStyle: React.CSSProperties = {
      position: 'fixed',
      top: pdfPanel.panelPosition.openUpward ? 'auto' : pdfPanel.panelPosition.top,
      bottom: pdfPanel.panelPosition.openUpward
        ? window.innerHeight - pdfPanel.panelPosition.top
        : 'auto',
      left: pdfPanel.panelPosition.left,
      width: pdfPanel.panelPosition.width,
      zIndex: 10000,
    };

    return createPortal(
      <div
        ref={pdfPanel.panelRef}
        className={`${baseStyles.panel} ${pdfPanel.panelPosition.openUpward ? baseStyles.panelUpward : ''}`}
        style={panelStyle}
      >
        <div className={exportStyles.twoPanelLayout}>
          {/* Left Panel: Layout */}
          <div className={exportStyles.leftPanel}>
            <div className={exportStyles.panelTitle}>Layout</div>
            <div className={exportStyles.sliderGroup}>
              <MeasurementSlider
                label="X Offset"
                value={pdfPanel.pendingValue.xOffset}
                onChange={(value) => pdfPanel.updatePendingField('xOffset', value)}
                config={PDF_OFFSET_CONFIG}
                displayUnit={generationOptions.measurementUnit || 'inches'}
                ariaLabel="PDF X Offset value"
              />
            </div>
            <div className={exportStyles.sliderGroup}>
              <MeasurementSlider
                label="Y Offset"
                value={pdfPanel.pendingValue.yOffset}
                onChange={(value) => pdfPanel.updatePendingField('yOffset', value)}
                config={PDF_OFFSET_CONFIG}
                displayUnit={generationOptions.measurementUnit || 'inches'}
                ariaLabel="PDF Y Offset value"
              />
            </div>
            <div className={exportStyles.sliderGroup}>
              <MeasurementSlider
                label="Print Bleed"
                value={pdfPanel.pendingValue.bleed}
                onChange={(value) => pdfPanel.updatePendingField('bleed', value)}
                config={BLEED_CONFIG}
                displayUnit={generationOptions.measurementUnit || 'inches'}
                ariaLabel="PDF Print Bleed value"
              />
            </div>
          </div>

          {/* Right Panel: Quality */}
          <div className={exportStyles.rightPanel}>
            <div className={exportStyles.panelTitle}>Quality</div>
            <div className={exportStyles.sliderGroup}>
              <EditableSlider
                label="Image Quality"
                value={pdfPanel.pendingValue.imageQuality * 100}
                onChange={(value) => pdfPanel.updatePendingField('imageQuality', value / 100)}
                min={70}
                max={100}
                step={5}
                defaultValue={90}
                suffix="%"
                ariaLabel="PDF image quality percentage"
              />
            </div>
          </div>
        </div>

        <div className={baseStyles.panelFooter}>
          <button
            type="button"
            className={baseStyles.resetLink}
            onClick={() =>
              pdfPanel.reset({ xOffset: 0, yOffset: 0, bleed: 0.125, imageQuality: 0.9 })
            }
          >
            Reset
          </button>
          <div className={baseStyles.panelActions}>
            <button type="button" className={baseStyles.cancelButton} onClick={pdfPanel.cancel}>
              Cancel
            </button>
            <button type="button" className={baseStyles.confirmButton} onClick={pdfPanel.apply}>
              Apply
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <ViewLayout variant="2-panel">
      {/* Left Sidebar - Export Settings */}
      <ViewLayout.Panel position="left" width="left" scrollable>
        <div className={layoutStyles.panelContent}>
          {/* PNG Settings */}
          <SettingsSelectorBase
            ref={pngPanel.containerRef}
            preview={
              <PreviewBox shape="square" size="medium">
                <span style={{ fontSize: '1.5rem' }}>PNG</span>
              </PreviewBox>
            }
            info={<InfoSection label="PNG Settings" summary={getPngSummary()} />}
            actionLabel="Customize"
            onAction={pngPanel.toggle}
            isExpanded={pngPanel.isExpanded}
            ariaLabel="PNG export settings"
            onKeyDown={pngPanel.handleKeyDown}
          >
            {renderPngPanel()}
          </SettingsSelectorBase>

          {/* ZIP Settings */}
          <SettingsSelectorBase
            ref={zipPanel.containerRef}
            preview={
              <PreviewBox shape="square" size="medium">
                <span style={{ fontSize: '1.5rem' }}>ZIP</span>
              </PreviewBox>
            }
            info={<InfoSection label="ZIP Settings" summary={getZipSummary()} />}
            actionLabel="Customize"
            onAction={zipPanel.toggle}
            isExpanded={zipPanel.isExpanded}
            ariaLabel="ZIP export settings"
            onKeyDown={zipPanel.handleKeyDown}
          >
            {renderZipPanel()}
          </SettingsSelectorBase>

          {/* PDF Settings */}
          <SettingsSelectorBase
            ref={pdfPanel.containerRef}
            preview={
              <PreviewBox shape="square" size="medium">
                <span style={{ fontSize: '1.5rem' }}>PDF</span>
              </PreviewBox>
            }
            info={<InfoSection label="PDF Settings" summary={getPdfSummary()} />}
            actionLabel="Customize"
            onAction={pdfPanel.toggle}
            isExpanded={pdfPanel.isExpanded}
            ariaLabel="PDF export settings"
            onKeyDown={pdfPanel.handleKeyDown}
          >
            {renderPdfPanel()}
          </SettingsSelectorBase>
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
