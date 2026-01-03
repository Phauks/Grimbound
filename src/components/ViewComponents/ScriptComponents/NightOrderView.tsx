/**
 * Night Order View Component
 *
 * Main container for the Night Order feature.
 * Uses sidebar layout with print preview showing realistic 8.5" x 11" pages.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ViewLayout } from '@/components/Layout/ViewLayout';
import { EditableSlider } from '@/components/Shared/Controls/EditableSlider';
import { ColorPreviewSelector } from '@/components/Shared/Selectors/ColorPreviewSelector';
import {
  EnableToggle,
  InfoSection,
  PreviewBox,
  SettingsSelectorBase,
} from '@/components/Shared/Selectors/SettingsSelectorBase';
import { Button } from '@/components/Shared/UI/Button';
import { type DownloadItem, useDownloadsContext } from '@/contexts/DownloadsContext';
import { useNightOrder } from '@/contexts/NightOrderContext';
import { useTokenContext } from '@/contexts/TokenContext';
import { useExpandablePanel } from '@/hooks';
import layoutStyles from '@/styles/components/layout/ViewLayout.module.css';
import styles from '@/styles/components/script/NightOrderView.module.css';
import baseStyles from '@/styles/components/shared/SettingsSelectorBase.module.css';
import { UI_DIMENSIONS } from '@/ts/constants.js';
import { downloadNightOrderPdfHybrid } from '@/ts/nightOrder/hybridPdfExporter.js';
import { paginateEntries } from '@/ts/nightOrder/nightOrderLayout.js';
import { downloadNightOrderPdf, type ExportPhase } from '@/ts/nightOrder/nightOrderPdfExporter.js';
import {
  syncNightOrderToJson,
  updateCharacterNightNumbers,
} from '@/ts/nightOrder/nightOrderSync.js';
import { warmDefaultNightSheetFonts } from '@/ts/nightOrder/nightSheetRenderer.js';
import { logger } from '@/ts/utils/logger.js';
import {
  formatCharacterForOfficialTool,
  getOfficialScriptToolUrl,
} from '@/ts/utils/scriptEncoder.js';
import { NightSheet } from './NightSheet';
import { ScaledPage } from './ScaledPage';
import type { ScriptSubTab } from './ScriptTabNavigation';

/**
 * Background customization options
 */
export interface NightSheetBackground {
  /** Base parchment color (hex) */
  baseColor: string;
  /** Whether to show paper texture */
  showTexture: boolean;
  /** Texture opacity (0-1) */
  textureOpacity: number;
}

/** Default background settings */
const DEFAULT_BACKGROUND: NightSheetBackground = {
  baseColor: '#ffffff',
  showTexture: true,
  textureOpacity: 0.06,
};

/** Preset background options */
const BACKGROUND_PRESETS = [
  { name: 'Parchment', color: '#f4edd9' },
  { name: 'Cream', color: '#fffef5' },
  { name: 'Antique', color: '#ebe4d4' },
  { name: 'White', color: '#ffffff' },
  { name: 'Sepia', color: '#f5e6c8' },
] as const;

interface NightOrderViewProps {
  /** Enable drag-and-drop reordering */
  enableDragDrop?: boolean;
  /** Active sub-tab */
  activeTab: ScriptSubTab;
  /** Callback when tab changes */
  onTabChange: (tab: ScriptSubTab) => void;
  /** Callback when "Edit Character" is selected from context menu */
  onEditCharacter?: (characterId: string) => void;
}

export function NightOrderView({ enableDragDrop = true, onEditCharacter }: NightOrderViewProps) {
  const { characters, scriptMeta, jsonInput, setJsonInput, setCharacters } = useTokenContext();
  const { setDownloads, clearDownloads } = useDownloadsContext();
  const {
    firstNight,
    otherNight,
    scriptMeta: nightOrderMeta,
    isLoading,
    error,
    isDirty,
    initializeFromScript,
    moveEntry,
  } = useNightOrder();

  // Generation state
  const [generateNightOrder, setGenerateNightOrder] = useState(true);

  // Export mode: 'hybrid' (fast, pdf-lib fonts) or 'legacy' (Snapdom font embedding)
  const [useHybridMode, setUseHybridMode] = useState(true);

  // Background customization state
  const [background, setBackground] = useState<NightSheetBackground>(DEFAULT_BACKGROUND);

  // Refs for PDF export (capture DOM elements)
  const firstNightRef = useRef<HTMLDivElement>(null);
  const otherNightRef = useRef<HTMLDivElement>(null);

  // Initialize night order when generation is toggled on
  // Note: NightOrderContext handles auto-init from TokenContext, so we only
  // need to respond to generateNightOrder toggle changes here.
  // IMPORTANT: Skip if isDirty to avoid overwriting user's drag-drop changes.
  useEffect(() => {
    if (generateNightOrder && characters.length > 0 && !isDirty) {
      const scriptData = scriptMeta ? [scriptMeta, ...characters] : characters;
      initializeFromScript(scriptData);
    }
  }, [generateNightOrder, characters, scriptMeta, initializeFromScript, isDirty]);

  // Warm fonts in background on mount (makes first PDF export fast)
  useEffect(() => {
    warmDefaultNightSheetFonts();
  }, []);

  // Use night order's script meta if available
  const displayMeta = nightOrderMeta || scriptMeta;

  // Track if we've initialized to avoid syncing on first load
  const hasInitializedRef = useRef(false);

  // Auto-sync night order to JSON when entries change
  // Skip initial render to avoid syncing the loaded state back
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      return;
    }

    if (!(jsonInput.trim() && isDirty)) return;

    // Sync to JSON meta arrays
    const updatedJson = syncNightOrderToJson(jsonInput, firstNight, otherNight);
    if (updatedJson !== jsonInput) {
      setJsonInput(updatedJson);
      logger.info('NightOrderView', 'Auto-synced night order to JSON');
    }

    // Update per-character night order numbers as fallback
    const updatedCharacters = updateCharacterNightNumbers(
      characters,
      firstNight.entries,
      otherNight.entries
    );

    // Only update if there are actual changes
    const hasChanges = updatedCharacters.some((char, i) => {
      const original = characters[i];
      return char.firstNight !== original.firstNight || char.otherNight !== original.otherNight;
    });

    if (hasChanges) {
      setCharacters(updatedCharacters);
      logger.debug('NightOrderView', 'Updated character night order numbers');
    }
  }, [
    firstNight.entries,
    otherNight.entries,
    jsonInput,
    isDirty,
    firstNight,
    otherNight,
    characters,
    setJsonInput,
    setCharacters,
  ]);

  // Move handlers
  const handleMoveFirstNight = useCallback(
    (entryId: string, newIndex: number) => {
      moveEntry('first', entryId, newIndex);
    },
    [moveEntry]
  );

  const handleMoveOtherNight = useCallback(
    (entryId: string, newIndex: number) => {
      moveEntry('other', entryId, newIndex);
    },
    [moveEntry]
  );

  /**
   * Convert a character from official to custom.
   * Updates the character's source in TokenContext, which is the single source of truth.
   * The UI will automatically reflect this change via the characters array.
   */
  const handleConvertToCustom = useCallback(
    (characterId: string) => {
      const updatedCharacters = characters.map((char) =>
        char.id.toLowerCase() === characterId.toLowerCase()
          ? { ...char, source: 'custom' as const }
          : char
      );
      setCharacters(updatedCharacters);
      logger.info('NightOrderView', `Converted character ${characterId} to custom`);
    },
    [characters, setCharacters]
  );

  // PDF export state
  const [isExporting, setIsExporting] = useState(false);
  const [_exportPhase, setExportPhase] = useState<ExportPhase | null>(null);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
  const abortControllerRef = useRef<AbortController | null>(null);

  // Get export phase display text
  const _getExportPhaseText = (phase: ExportPhase | null): string => {
    switch (phase) {
      case 'initializing':
        return 'Initializing...';
      case 'loading-fonts':
        return 'Loading fonts...';
      case 'loading-images':
        return `Loading images (${exportProgress.current}/${exportProgress.total})...`;
      case 'rendering-first':
        return 'Rendering First Night...';
      case 'rendering-other':
        return 'Rendering Other Nights...';
      case 'saving':
        return 'Saving PDF...';
      default:
        return 'Exporting...';
    }
  };

  const _handleCancelExport = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const handleExportPDF = useCallback(async () => {
    if (isExporting) return;

    setIsExporting(true);
    setExportPhase('initializing');
    setExportProgress({ current: 0, total: 0 });

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      const filename = displayMeta?.name
        ? `${displayMeta.name.replace(/[^a-zA-Z0-9]/g, '_')}_night_order.pdf`
        : 'night_order.pdf';

      const exportOptions = {
        includeFirstNight: true,
        includeOtherNight: true,
        showScriptName: true,
        background,
        onProgress: (phase: ExportPhase, current: number, total: number) => {
          setExportPhase(phase);
          setExportProgress({ current, total });
        },
        signal: abortControllerRef.current.signal,
      };

      // Use hybrid mode (fast, pdf-lib fonts) or legacy mode (Snapdom font embedding)
      if (useHybridMode) {
        logger.info('NightOrderView', 'Using hybrid PDF export mode');
        await downloadNightOrderPdfHybrid(
          firstNight,
          otherNight,
          displayMeta || null,
          filename,
          exportOptions
        );
      } else {
        logger.info('NightOrderView', 'Using legacy PDF export mode');
        await downloadNightOrderPdf(
          firstNight,
          otherNight,
          displayMeta || null,
          filename,
          exportOptions
        );
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        logger.info('NightOrderView', 'PDF export cancelled');
      } else {
        logger.error('NightOrderView', 'PDF export failed', err);
        alert('Failed to export PDF. Please try again.');
      }
    } finally {
      setIsExporting(false);
      setExportPhase(null);
      abortControllerRef.current = null;
    }
  }, [displayMeta, isExporting, firstNight, otherNight, background, useHybridMode]);

  // Handler to open script in official BOTC Script Tool
  const handleOpenInOfficialTool = useCallback(() => {
    // Build script data - always include meta
    const meta = scriptMeta || { id: '_meta', author: '', name: '' };

    // Format characters for official tool:
    // - Official characters: just send the ID string
    // - Custom characters: send full character object
    const formattedCharacters = characters.map((char) => formatCharacterForOfficialTool(char));

    const scriptData = [meta, ...formattedCharacters];
    const url = getOfficialScriptToolUrl(scriptData);

    logger.info('NightOrderView', 'Opening official BOTC Script Tool', {
      characterCount: characters.length,
      customCount: characters.filter((c) => c.source !== 'official').length,
      hasMeta: !!scriptMeta,
    });

    window.open(url, '_blank');
  }, [characters, scriptMeta]);

  // Register downloads for this view
  useEffect(() => {
    const hasNoData = firstNight.entries.length === 0 && otherNight.entries.length === 0;

    const downloads: DownloadItem[] = [
      {
        id: 'night-order-pdf',
        icon: '🌙',
        label: 'Night Order PDF',
        description: displayMeta?.name
          ? `${displayMeta.name} night sheets`
          : 'First & Other nights',
        action: handleExportPDF,
        disabled: hasNoData || !generateNightOrder || isExporting,
        disabledReason: isExporting
          ? 'Export in progress...'
          : hasNoData
            ? 'Load a script first'
            : 'Enable night order generation',
        category: 'script',
        sourceView: 'script',
      },
    ];

    setDownloads(downloads);
    return () => clearDownloads();
  }, [
    firstNight.entries.length,
    otherNight.entries.length,
    displayMeta,
    generateNightOrder,
    isExporting,
    handleExportPDF,
    setDownloads,
    clearDownloads,
  ]);

  // Background panel handler
  const handleBackgroundChange = useCallback((settings: NightSheetBackground) => {
    setBackground(settings);
  }, []);

  // Use expandable panel hook for background settings
  const backgroundPanel = useExpandablePanel<NightSheetBackground>({
    value: background,
    onChange: handleBackgroundChange,
    onPreviewChange: handleBackgroundChange,
    panelHeight: 280,
    minPanelWidth: UI_DIMENSIONS.MIN_PANEL_WIDTH,
  });

  // Get display settings (pending when editing, current otherwise)
  const displayBackground = backgroundPanel.isExpanded ? backgroundPanel.pendingValue : background;

  // Paginate entries for UI preview (multi-page instead of scaling)
  const firstNightPages = useMemo(() => paginateEntries(firstNight.entries), [firstNight.entries]);
  const otherNightPages = useMemo(() => paginateEntries(otherNight.entries), [otherNight.entries]);

  // Loading state
  if (isLoading) {
    return (
      <ViewLayout variant="2-panel">
        <ViewLayout.Panel position="left" width="left" scrollable>
          <div className={styles.sidebarContent}>
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <p>Building night order...</p>
            </div>
          </div>
        </ViewLayout.Panel>
        <ViewLayout.Panel position="right" width="flex" scrollable className={styles.previewArea} />
      </ViewLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <ViewLayout variant="2-panel">
        <ViewLayout.Panel position="left" width="left" scrollable>
          <div className={styles.sidebarContent}>
            <div className={styles.errorState}>
              <div className={styles.errorIcon}>⚠️</div>
              <p className={styles.errorMessage}>{error}</p>
            </div>
          </div>
        </ViewLayout.Panel>
        <ViewLayout.Panel position="right" width="flex" scrollable className={styles.previewArea} />
      </ViewLayout>
    );
  }

  const hasNoData = firstNight.entries.length === 0 && otherNight.entries.length === 0;

  // Render Background Settings Panel
  const renderBackgroundPanel = () => {
    if (!(backgroundPanel.isExpanded && backgroundPanel.panelPosition)) return null;

    const panelStyle: React.CSSProperties = {
      position: 'fixed',
      top: backgroundPanel.panelPosition.openUpward ? 'auto' : backgroundPanel.panelPosition.top,
      bottom: backgroundPanel.panelPosition.openUpward
        ? window.innerHeight - backgroundPanel.panelPosition.top
        : 'auto',
      left: backgroundPanel.panelPosition.left,
      width: backgroundPanel.panelPosition.width,
      zIndex: 10000,
    };

    return createPortal(
      <div
        ref={backgroundPanel.panelRef}
        className={`${baseStyles.panel} ${backgroundPanel.panelPosition.openUpward ? baseStyles.panelUpward : ''}`}
        style={panelStyle}
      >
        <div className={baseStyles.panelContent}>
          {/* Color Presets */}
          <div className={styles.settingGroup}>
            <fieldset
              className={styles.colorPresets}
              style={{ border: 0, padding: 0, margin: 0, minInlineSize: 0 }}
            >
              <legend className={styles.settingLabel}>Color Preset</legend>
              {BACKGROUND_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  className={`${styles.colorPreset} ${backgroundPanel.pendingValue.baseColor === preset.color ? styles.active : ''}`}
                  style={{ backgroundColor: preset.color }}
                  onClick={() => backgroundPanel.updatePendingField('baseColor', preset.color)}
                  title={preset.name}
                  type="button"
                />
              ))}
            </fieldset>
          </div>

          {/* Custom Color */}
          <div className={styles.settingGroup}>
            <ColorPreviewSelector
              label="Custom Color"
              value={backgroundPanel.pendingValue.baseColor}
              onChange={(color) => backgroundPanel.updatePendingField('baseColor', color)}
              onPreviewChange={(color) => backgroundPanel.updatePendingField('baseColor', color)}
              size="small"
            />
          </div>

          {/* Texture Toggle */}
          <div className={styles.settingGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={backgroundPanel.pendingValue.showTexture}
                onChange={(e) =>
                  backgroundPanel.updatePendingField('showTexture', e.target.checked)
                }
                className={styles.checkbox}
              />
              Show paper texture
            </label>
          </div>

          {/* Texture Opacity */}
          {backgroundPanel.pendingValue.showTexture && (
            <EditableSlider
              label="Texture Intensity"
              value={backgroundPanel.pendingValue.textureOpacity * 100}
              onChange={(value) =>
                backgroundPanel.updatePendingField('textureOpacity', value / 100)
              }
              min={1}
              max={15}
              step={1}
              defaultValue={6}
              suffix="%"
              ariaLabel="Texture intensity percentage"
            />
          )}
        </div>

        <div className={baseStyles.panelFooter}>
          <button
            type="button"
            className={baseStyles.resetLink}
            onClick={() => backgroundPanel.reset(DEFAULT_BACKGROUND)}
          >
            Reset
          </button>
          <div className={baseStyles.panelActions}>
            <button
              type="button"
              className={baseStyles.cancelButton}
              onClick={backgroundPanel.cancel}
            >
              Cancel
            </button>
            <button
              type="button"
              className={baseStyles.confirmButton}
              onClick={backgroundPanel.apply}
            >
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
      {/* Sidebar */}
      <ViewLayout.Panel position="left" width="left" scrollable>
        <div className={layoutStyles.panelContent}>
          {/* Open in Official Tool */}
          <div className={styles.headerRow}>
            <Button
              variant="primary"
              size="small"
              onClick={handleOpenInOfficialTool}
              title="Open in official Blood on the Clocktower Script Tool"
            >
              Open in Official Tool
            </Button>
          </div>

          {/* Player Script (Coming Soon - Disabled) */}
          <SettingsSelectorBase
            preview={
              <PreviewBox shape="square" size="medium">
                <span style={{ fontSize: '1.5rem' }}>📜</span>
              </PreviewBox>
            }
            info={<InfoSection label="Player Script" summary="Coming Soon" />}
            disabled
            ariaLabel="Player script generation settings (coming soon)"
          />

          {/* Night Order Toggle with Background Settings */}
          <SettingsSelectorBase
            ref={backgroundPanel.containerRef}
            preview={
              <PreviewBox shape="square" size="medium">
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: displayBackground.baseColor,
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: '1.5rem' }}>🌙</span>
                </div>
              </PreviewBox>
            }
            info={
              <InfoSection
                label="Night Order"
                summary={
                  generateNightOrder
                    ? `${displayBackground.baseColor}${displayBackground.showTexture ? ', Texture' : ''}`
                    : 'Disabled'
                }
              />
            }
            headerSlot={
              <EnableToggle enabled={generateNightOrder} onChange={setGenerateNightOrder} />
            }
            actionLabel={generateNightOrder ? 'Customize' : undefined}
            onAction={generateNightOrder ? backgroundPanel.toggle : undefined}
            isExpanded={backgroundPanel.isExpanded}
            ariaLabel="Night order generation settings"
            onKeyDown={backgroundPanel.handleKeyDown}
          >
            {renderBackgroundPanel()}
          </SettingsSelectorBase>

          {/* Export Mode Toggle */}
          {generateNightOrder && (
            <div className={styles.exportModeToggle}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={useHybridMode}
                  onChange={(e) => setUseHybridMode(e.target.checked)}
                  className={styles.checkbox}
                />
                <span>
                  Fast PDF export
                  <span className={styles.hint}> (experimental)</span>
                </span>
              </label>
              <p className={styles.exportModeHint}>
                {useHybridMode
                  ? 'Uses optimized font rendering for faster exports'
                  : 'Uses legacy mode with full font embedding (slower but more accurate)'}
              </p>
            </div>
          )}
        </div>
      </ViewLayout.Panel>

      {/* Print Preview Area */}
      <ViewLayout.Panel position="right" width="flex" scrollable className={styles.previewArea}>
        {generateNightOrder ? (
          hasNoData ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🌙</div>
              <h3>No Night Order Available</h3>
              <p>Load a script in the Editor tab to view the night order.</p>
              <p className={styles.hint}>
                The night order shows when each character wakes during the night phase.
              </p>
            </div>
          ) : (
            <div className={styles.sheetsContainer}>
              {/* First Night Pages (one or more) */}
              {firstNightPages.pages.map((pageEntries, pageIndex) => (
                <div
                  key={`first-${pageEntries[0]?.id || pageIndex}`}
                  className={styles.pageWrapper}
                >
                  <ScaledPage>
                    <NightSheet
                      ref={pageIndex === 0 ? firstNightRef : undefined}
                      type="first"
                      entries={pageEntries}
                      characters={characters}
                      scriptMeta={displayMeta}
                      enableDragDrop={enableDragDrop && firstNightPages.pageCount === 1}
                      onMoveEntry={handleMoveFirstNight}
                      onToggleLock={handleConvertToCustom}
                      background={displayBackground}
                      onEditCharacter={onEditCharacter}
                      pageNumber={pageIndex + 1}
                      totalPages={firstNightPages.pageCount}
                    />
                  </ScaledPage>
                </div>
              ))}

              {/* Other Nights Pages (one or more) */}
              {otherNightPages.pages.map((pageEntries, pageIndex) => (
                <div
                  key={`other-${pageEntries[0]?.id || pageIndex}`}
                  className={styles.pageWrapper}
                >
                  <ScaledPage>
                    <NightSheet
                      ref={pageIndex === 0 ? otherNightRef : undefined}
                      type="other"
                      entries={pageEntries}
                      characters={characters}
                      scriptMeta={displayMeta}
                      enableDragDrop={enableDragDrop && otherNightPages.pageCount === 1}
                      onMoveEntry={handleMoveOtherNight}
                      onToggleLock={handleConvertToCustom}
                      background={displayBackground}
                      onEditCharacter={onEditCharacter}
                      pageNumber={pageIndex + 1}
                      totalPages={otherNightPages.pageCount}
                    />
                  </ScaledPage>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🌙</div>
            <h3>Night Order Generation Disabled</h3>
            <p>Enable "Generate Night Order" in the Options section to view night order sheets.</p>
          </div>
        )}
      </ViewLayout.Panel>
    </ViewLayout>
  );
}
