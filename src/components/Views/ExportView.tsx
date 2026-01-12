import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ViewLayout } from '@/components/Layout/ViewLayout';
import { ErrorBoundary, UnifiedErrorDisplay } from '@/components/Shared';
import { MeasurementSlider } from '@/components/Shared/Controls/MeasurementSlider';
import {
  InfoSection,
  PreviewBox,
  SettingsSelectorBase,
} from '@/components/Shared/Selectors/SettingsSelectorBase';
import {
  CharacterSelectionCard,
  DownloadSection,
  FeaturedDownloads,
} from '@/components/ViewComponents/ExportComponents';
import { CharacterListView } from '@/components/ViewComponents/ProjectsComponents/CharacterListView';
import { useToast } from '@/contexts/ToastContext';
import { useTokenContext } from '@/contexts/TokenContext';
import { useExpandablePanel, useExportDownloads } from '@/hooks';
import { useResizableSidebar } from '@/hooks/ui';
import downloadStyles from '@/styles/components/export/DownloadComponents.module.css';
import layoutStyles from '@/styles/components/layout/ViewLayout.module.css';
import baseStyles from '@/styles/components/shared/SettingsSelectorBase.module.css';
import exportStyles from '@/styles/components/views/ExportView.module.css';
import styles from '@/styles/components/views/Views.module.css';
import { BLEED_CONFIG, PDF_OFFSET_CONFIG } from '@/ts/utils/measurementUtils';

interface PdfSettings {
  xOffset: number;
  yOffset: number;
  bleed: number;
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

  // Resizable sidebar
  const { width: sidebarWidth, isDragging, handleProps } = useResizableSidebar();

  // List view column visibility settings
  const [listViewSettings, setListViewSettings] = useState({
    showAbility: true,
    showFirstNightReminder: false,
    showOtherNightReminder: false,
    showReminders: false,
  });
  const [showListSettings, setShowListSettings] = useState(false);

  // Character toggle handlers
  const handleCharacterToggle = (uuid: string, enabled: boolean) => {
    setCharacterEnabled(uuid, enabled);
  };

  const handleToggleAllCharacters = (enabled: boolean) => {
    setAllCharactersEnabled(enabled);
    addToast(enabled ? 'All characters enabled' : 'All characters disabled', 'success');
  };

  // Current PDF settings from context
  const currentPdfSettings: PdfSettings = {
    xOffset: generationOptions.pdfXOffset ?? 0,
    yOffset: generationOptions.pdfYOffset ?? 0,
    bleed: generationOptions.pdfBleed ?? 0.125,
  };

  // PDF panel handler
  const handlePdfChange = (settings: PdfSettings) => {
    updateGenerationOptions({
      pdfXOffset: settings.xOffset,
      pdfYOffset: settings.yOffset,
      pdfBleed: settings.bleed,
    });
  };

  // Use expandable panel hook for PDF settings
  const pdfPanel = useExpandablePanel<PdfSettings>({
    value: currentPdfSettings,
    onChange: handlePdfChange,
    onPreviewChange: handlePdfChange,
    panelHeight: 200,
    minPanelWidth: 320,
  });

  // Render Token Print Sheet Panel
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
        <div className={exportStyles.singleColumnLayout}>
          <div className={exportStyles.settingsSection}>
            <MeasurementSlider
              label="X Offset"
              value={pdfPanel.pendingValue.xOffset}
              onChange={(value) => pdfPanel.updatePendingField('xOffset', value)}
              config={PDF_OFFSET_CONFIG}
              displayUnit={generationOptions.measurementUnit || 'inches'}
              ariaLabel="PDF X Offset value"
            />
            <MeasurementSlider
              label="Y Offset"
              value={pdfPanel.pendingValue.yOffset}
              onChange={(value) => pdfPanel.updatePendingField('yOffset', value)}
              config={PDF_OFFSET_CONFIG}
              displayUnit={generationOptions.measurementUnit || 'inches'}
              ariaLabel="PDF Y Offset value"
            />
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

        <div className={baseStyles.panelFooter}>
          <button
            type="button"
            className={baseStyles.resetLink}
            onClick={() => pdfPanel.reset({ xOffset: 0, yOffset: 0, bleed: 0.125 })}
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
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <UnifiedErrorDisplay context="Export" error={error} onRetry={resetErrorBoundary} />
      )}
    >
      <ViewLayout variant="2-panel">
        {/* Left Sidebar - Export Settings (Resizable) */}
        <ViewLayout.Panel
          position="left"
          resizable
          resizableWidth={sidebarWidth}
          isResizing={isDragging}
          onWidthChange={handleProps.onMouseDown}
          scrollable
        >
          <div className={layoutStyles.panelContent}>
            {/* Token Print Sheet */}
            <SettingsSelectorBase
              ref={pdfPanel.containerRef}
              preview={
                <PreviewBox shape="square" size="medium">
                  <span style={{ fontSize: '1.5rem' }}>PDF</span>
                </PreviewBox>
              }
              info={<InfoSection label="Token Print Sheet" />}
              actionLabel="Customize"
              onAction={pdfPanel.toggle}
              isExpanded={pdfPanel.isExpanded}
              ariaLabel="Token print sheet settings"
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

            {/* Character Selection Card (Purple) */}
            <CharacterSelectionCard
              enabledCount={characterSelectionSummary.enabled}
              totalCount={characterSelectionSummary.total}
              disabledCount={characterSelectionSummary.disabled}
              defaultOpen={false}
            >
              {characters.length > 0 ? (
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
                  headerActions={
                    <div className={styles.listSettingsContainer}>
                      <button
                        type="button"
                        className={`${styles.listSettingsButton} ${showListSettings ? styles.listSettingsButtonActive : ''}`}
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
                  }
                />
              ) : (
                <div className={styles.emptyCharacterMessage}>
                  No characters loaded. Import a script to select characters.
                </div>
              )}
            </CharacterSelectionCard>

            {/* Divider between character selection and download sections */}
            <div className={downloadStyles.sectionDivider} />

            {/* JSON Section */}
            <DownloadSection
              title="JSON"
              icon="📋"
              items={jsonDownloads}
              collapsible
              defaultOpen={false}
              executingId={executingId}
              onExecute={executeDownload}
            />

            {/* Tokens Section */}
            <DownloadSection
              title="Tokens"
              icon="🎭"
              items={tokenDownloads}
              collapsible
              defaultOpen={false}
              executingId={executingId}
              onExecute={executeDownload}
            />

            {/* Scripts Section */}
            <DownloadSection
              title="Scripts"
              icon="📜"
              items={scriptDownloads}
              collapsible
              defaultOpen={false}
              executingId={executingId}
              onExecute={executeDownload}
            />
          </div>
        </ViewLayout.Panel>
      </ViewLayout>
    </ErrorBoundary>
  );
}
