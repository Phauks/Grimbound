import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '@/contexts/ToastContext';
import { useTokenContext } from '@/contexts/TokenContext';
import { useExpandablePanel, useExportDownloads } from '@/hooks';
import layoutStyles from '@/styles/components/layout/ViewLayout.module.css';
import styles from '@/styles/components/views/Views.module.css';
import baseStyles from '@/styles/components/shared/SettingsSelectorBase.module.css';
import exportStyles from '@/styles/components/views/ExportView.module.css';
import type { CompressionLevel, ZipExportOptions } from '@/ts/types/index';
import { BLEED_CONFIG, PDF_OFFSET_CONFIG } from '@/ts/utils/measurementUtils';
import { ViewLayout } from '@/components/Layout/ViewLayout';
import { CharacterListView } from '@/components/ViewComponents/ProjectsComponents/CharacterListView';
import { EditableSlider } from '@/components/Shared/Controls/EditableSlider';
import { MeasurementSlider } from '@/components/Shared/Controls/MeasurementSlider';
import { OptionGroup } from '@/components/Shared/UI/OptionGroup';
import {
  SettingsSelectorBase,
  PreviewBox,
  InfoSection,
} from '@/components/Shared/Selectors/SettingsSelectorBase';
import {
  FeaturedDownloads,
  DownloadSection,
} from '@/components/ViewComponents/ExportComponents';

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
    generationOptions,
    updateGenerationOptions,
    characters,
    characterMetadata,
    setCharacterEnabled,
    setAllCharactersEnabled,
    characterSelectionSummary,
  } = useTokenContext();
  const {
    featuredDownloads,
    jsonDownloads,
    tokenDownloads,
    scriptDownloads,
    executingId,
    executeDownload,
  } = useExportDownloads();
  const { addToast } = useToast();

  // List view column visibility settings
  const [listViewSettings, setListViewSettings] = useState({
    showAbility: true,
    showFirstNightReminder: false,
    showOtherNightReminder: false,
    showReminders: false,
  });
  const [showListSettings, setShowListSettings] = useState(false);

  // Character toggle handlers
  const handleCharacterToggle = useCallback(
    (uuid: string, enabled: boolean) => {
      setCharacterEnabled(uuid, enabled);
    },
    [setCharacterEnabled]
  );

  const handleToggleAllCharacters = useCallback(
    (enabled: boolean) => {
      setAllCharactersEnabled(enabled);
      addToast(enabled ? 'All characters enabled' : 'All characters disabled', 'success');
    },
    [setAllCharactersEnabled, addToast]
  );

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

      {/* Right Content - Downloads Hub */}
      <ViewLayout.Panel position="right" width="flex" scrollable>
        <div className={styles.exportActionsPanel}>
          {/* Featured Downloads */}
          <FeaturedDownloads
            items={featuredDownloads}
            executingId={executingId}
            onExecute={executeDownload}
          />

          {/* JSON Section */}
          <DownloadSection
            title="JSON"
            icon="📋"
            items={jsonDownloads}
            collapsible
            defaultOpen
            executingId={executingId}
            onExecute={executeDownload}
          />

          {/* Tokens Section */}
          <DownloadSection
            title="Tokens"
            icon="🎭"
            items={tokenDownloads}
            collapsible
            defaultOpen
            executingId={executingId}
            onExecute={executeDownload}
          />

          {/* Scripts Section */}
          <DownloadSection
            title="Scripts"
            icon="📜"
            items={scriptDownloads}
            collapsible
            defaultOpen
            executingId={executingId}
            onExecute={executeDownload}
          />

          {/* Character Selection Section */}
          <DownloadSection
            title="Character Selection"
            icon="👤"
            items={[]}
            collapsible
            defaultOpen={false}
            executingId={executingId}
            onExecute={executeDownload}
          >
            {characters.length > 0 ? (
              <>
                <div className={styles.characterSelectionSummary}>
                  {characterSelectionSummary.enabled} of {characterSelectionSummary.total} included
                  {characterSelectionSummary.disabled > 0 && (
                    <span className={styles.characterSelectionBadge}>
                      {characterSelectionSummary.disabled} excluded
                    </span>
                  )}
                </div>
                <div className={styles.characterSelectionHeaderRow}>
                  <div className={styles.listSettingsContainer}>
                    <button
                      type="button"
                      className={styles.listSettingsButton}
                      onClick={() => setShowListSettings(!showListSettings)}
                      title="Configure list columns"
                      aria-expanded={showListSettings}
                    >
                      ⚙️
                    </button>
                    {showListSettings && (
                      <div className={styles.listSettingsPopover}>
                        <div className={styles.listSettingsHeader}>
                          <span>Columns</span>
                          <button
                            type="button"
                            className={styles.listSettingsClose}
                            onClick={() => setShowListSettings(false)}
                          >
                            ✕
                          </button>
                        </div>
                        <label className={styles.listSettingsOption}>
                          <input
                            type="checkbox"
                            checked={listViewSettings.showAbility}
                            onChange={(e) =>
                              setListViewSettings((prev) => ({
                                ...prev,
                                showAbility: e.target.checked,
                              }))
                            }
                          />
                          <span>Ability Text</span>
                        </label>
                        <label className={styles.listSettingsOption}>
                          <input
                            type="checkbox"
                            checked={listViewSettings.showFirstNightReminder}
                            onChange={(e) =>
                              setListViewSettings((prev) => ({
                                ...prev,
                                showFirstNightReminder: e.target.checked,
                              }))
                            }
                          />
                          <span>First Night Reminder</span>
                        </label>
                        <label className={styles.listSettingsOption}>
                          <input
                            type="checkbox"
                            checked={listViewSettings.showOtherNightReminder}
                            onChange={(e) =>
                              setListViewSettings((prev) => ({
                                ...prev,
                                showOtherNightReminder: e.target.checked,
                              }))
                            }
                          />
                          <span>Other Night Reminder</span>
                        </label>
                        <label className={styles.listSettingsOption}>
                          <input
                            type="checkbox"
                            checked={listViewSettings.showReminders}
                            onChange={(e) =>
                              setListViewSettings((prev) => ({
                                ...prev,
                                showReminders: e.target.checked,
                              }))
                            }
                          />
                          <span>Reminders</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.characterSelectionContent}>
                  <CharacterListView
                    characters={characters}
                    showAbility={listViewSettings.showAbility}
                    showFirstNightReminder={listViewSettings.showFirstNightReminder}
                    showOtherNightReminder={listViewSettings.showOtherNightReminder}
                    showReminders={listViewSettings.showReminders}
                    showSelection={true}
                    characterMetadata={characterMetadata}
                    onToggleCharacter={handleCharacterToggle}
                    onToggleAll={handleToggleAllCharacters}
                  />
                </div>
              </>
            ) : (
              <div className={styles.characterSelectionSummary}>
                No characters loaded
              </div>
            )}
          </DownloadSection>
        </div>
      </ViewLayout.Panel>
    </ViewLayout>
  );
}
