/**
 * Night Order View Component
 *
 * Main container for the Night Order feature.
 * Uses sidebar layout with print preview showing realistic 8.5" x 11" pages.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ViewLayout } from '@/components/Layout/ViewLayout';
import { ScriptPdfDrawer } from '@/components/Shared/Drawer/ScriptPdfDrawer';
import {
  EnableToggle,
  InfoSection,
  PreviewBox,
  SettingsSelectorBase,
} from '@/components/Shared/Selectors/SettingsSelectorBase';
import { Button } from '@/components/Shared/UI/Button';
import { type DownloadItem, useDownloadsContext } from '@/contexts/DownloadsContext';
import { useNightOrder } from '@/contexts/NightOrderContext';
import { useScriptPdf } from '@/contexts/ScriptPdfContext';
import { useTokenContext } from '@/contexts/TokenContext';
import { usePlayerScriptExport } from '@/hooks/scripts/usePlayerScriptExport.js';
import { useScriptPdfDrawer } from '@/hooks/scripts/useScriptPdfDrawer.js';
import { useResizableSidebar } from '@/hooks/ui';
import layoutStyles from '@/styles/components/layout/ViewLayout.module.css';
import styles from '@/styles/components/script/NightOrderView.module.css';
import { paginateEntries } from '@/ts/nightOrder/nightOrderLayout.js';
import { downloadNightOrderPdf, type ExportPhase } from '@/ts/nightOrder/nightOrderPdfExporter.js';
import {
  syncNightOrderToJson,
  updateCharacterNightNumbers,
} from '@/ts/nightOrder/nightOrderSync.js';
import {
  extractActiveJinxes,
  extractNightOrderIcons,
  toPlayerScriptCharacters,
} from '@/ts/scriptPdf/utils.js';
import { logger } from '@/ts/utils/logger.js';
import {
  formatCharacterForOfficialTool,
  getOfficialScriptToolUrl,
} from '@/ts/utils/scriptEncoder.js';
import { NightSheet } from './NightSheet';
import { PlayerScriptPreview } from './PlayerScriptPreview';
import { ScaledPage } from './ScaledPage';
import type { ScriptSubTab } from './ScriptTabNavigation';

// NightSheetBackground type removed - now uses BackgroundStyle from settings

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
  const { width: sidebarWidth, isDragging, handleProps } = useResizableSidebar();
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

  // ScriptPDF settings drawer
  const { settings } = useScriptPdf();
  const drawer = useScriptPdfDrawer();

  // Generation state
  const [generateNightOrder, setGenerateNightOrder] = useState(true);
  const [generatePlayerScript, setGeneratePlayerScript] = useState(true);

  // Get background directly from ScriptPdfContext settings
  const background = settings.nightOrder.background;

  // Derive icon scale from ScriptPdfContext settings (night order specific)
  const nightOrderIconScale = settings.nightOrder.iconScale;

  // Night order margins
  const nightOrderMargins = settings.nightOrder.margins;

  // Player script data (derived from characters and night order)
  const playerScriptCharacters = toPlayerScriptCharacters(characters);
  const playerScriptFabled = playerScriptCharacters.filter((c) => c.team === 'fabled');
  const playerScriptMain = playerScriptCharacters.filter(
    (c) => c.team !== 'fabled' && c.team !== 'traveller'
  );
  const playerScriptJinxes = extractActiveJinxes(characters);
  const playerScriptFirstNight = extractNightOrderIcons(characters, 'first');
  const playerScriptOtherNight = extractNightOrderIcons(characters, 'other');

  // Player script export hook
  const playerScriptExport = usePlayerScriptExport({
    scriptMeta,
    characters: playerScriptMain,
    fabled: playerScriptFabled,
    jinxes: playerScriptJinxes,
    firstNight: playerScriptFirstNight,
    otherNight: playerScriptOtherNight,
  });

  // Build image URL map for PlayerScriptPreview (uses character image directly for now)
  const playerScriptImageUrls = (() => {
    const urls = new Map<string, string>();
    for (const char of playerScriptCharacters) {
      urls.set(char.id, char.image);
    }
    return urls;
  })();

  // Refs for PDF export (capture DOM elements)
  const firstNightRef = useRef<HTMLDivElement>(null);
  const otherNightRef = useRef<HTMLDivElement>(null);

  // Refs for handleExportPDF to avoid object dependencies in useCallback
  // This prevents the callback from recreating when these objects change reference
  const exportDataRef = useRef({
    displayMeta: null as typeof scriptMeta,
    background,
    firstNight,
    otherNight,
  });
  // Update refs on each render
  exportDataRef.current = {
    displayMeta: nightOrderMeta || scriptMeta,
    background,
    firstNight,
    otherNight,
  };

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
  const handleMoveFirstNight = (entryId: string, newIndex: number) => {
    moveEntry('first', entryId, newIndex);
  };

  const handleMoveOtherNight = (entryId: string, newIndex: number) => {
    moveEntry('other', entryId, newIndex);
  };

  /**
   * Convert a character from official to custom.
   * Updates the character's source in TokenContext, which is the single source of truth.
   * The UI will automatically reflect this change via the characters array.
   */
  const handleConvertToCustom = (characterId: string) => {
    const updatedCharacters = characters.map((char) =>
      char.id.toLowerCase() === characterId.toLowerCase()
        ? { ...char, source: 'custom' as const }
        : char
    );
    setCharacters(updatedCharacters);
    logger.info('NightOrderView', `Converted character ${characterId} to custom`);
  };

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

  const _handleCancelExport = () => {
    abortControllerRef.current?.abort();
  };

  // useCallback required: used as useEffect dependency for downloads registration
  // Uses exportDataRef to avoid object dependencies that would cause recreation
  const handleExportPDF = useCallback(async () => {
    if (isExporting) return;

    setIsExporting(true);
    setExportPhase('initializing');
    setExportProgress({ current: 0, total: 0 });

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    // Read current values from ref (avoids stale closure issues)
    const {
      displayMeta: meta,
      background: bg,
      firstNight: first,
      otherNight: other,
    } = exportDataRef.current;

    try {
      const filename = meta?.name
        ? `${meta.name.replace(/[^a-zA-Z0-9]/g, '_')}_night_order.pdf`
        : 'night_order.pdf';

      const exportOptions = {
        includeFirstNight: true,
        includeOtherNight: true,
        showScriptName: true,
        background: bg,
        onProgress: (phase: ExportPhase, current: number, total: number) => {
          setExportPhase(phase);
          setExportProgress({ current, total });
        },
        signal: abortControllerRef.current.signal,
      };

      await downloadNightOrderPdf(first, other, meta || null, filename, exportOptions);
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
  }, [isExporting]);

  // Handler to open script in official BOTC Script Tool
  const handleOpenInOfficialTool = () => {
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
  };

  // Register downloads for this view
  useEffect(() => {
    const hasNoData = firstNight.entries.length === 0 && otherNight.entries.length === 0;
    const hasNoCharacters = playerScriptMain.length === 0;

    const downloads: DownloadItem[] = [
      {
        id: 'player-script-pdf',
        icon: '📜',
        label: 'Player Script PDF',
        description: displayMeta?.name ? `${displayMeta.name} script` : 'Character abilities',
        action: playerScriptExport.exportPdf,
        disabled: hasNoCharacters || !generatePlayerScript || playerScriptExport.isExporting,
        disabledReason: playerScriptExport.isExporting
          ? 'Export in progress...'
          : hasNoCharacters
            ? 'Load a script first'
            : 'Enable player script generation',
        category: 'script',
        sourceView: 'script',
      },
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
    displayMeta?.name,
    generateNightOrder,
    generatePlayerScript,
    isExporting,
    handleExportPDF,
    playerScriptExport.exportPdf,
    playerScriptExport.isExporting,
    playerScriptMain.length,
    setDownloads,
    clearDownloads,
  ]);

  // Paginate entries for UI preview (multi-page instead of scaling)
  const firstNightPages = paginateEntries(firstNight.entries);
  const otherNightPages = paginateEntries(otherNight.entries);

  // Loading state
  if (isLoading) {
    return (
      <ViewLayout variant="2-panel">
        <ViewLayout.Panel
          position="left"
          resizable
          resizableWidth={sidebarWidth}
          isResizing={isDragging}
          onWidthChange={handleProps.onMouseDown}
          scrollable
        >
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
        <ViewLayout.Panel
          position="left"
          resizable
          resizableWidth={sidebarWidth}
          isResizing={isDragging}
          onWidthChange={handleProps.onMouseDown}
          scrollable
        >
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

  return (
    <ViewLayout variant="2-panel">
      {/* Sidebar */}
      <ViewLayout.Panel
        position="left"
        resizable
        resizableWidth={sidebarWidth}
        isResizing={isDragging}
        onWidthChange={handleProps.onMouseDown}
        scrollable
      >
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

          {/* Player Script Toggle */}
          <SettingsSelectorBase
            preview={
              <PreviewBox shape="square" size="medium">
                <span style={{ fontSize: '1.5rem' }}>📜</span>
              </PreviewBox>
            }
            info={<InfoSection label="Player Script" />}
            headerSlot={
              <EnableToggle enabled={generatePlayerScript} onChange={setGeneratePlayerScript} />
            }
            actionLabel={generatePlayerScript ? 'Customize' : undefined}
            onAction={generatePlayerScript ? () => drawer.open('playerScript') : undefined}
            ariaLabel="Player script generation settings"
          />

          {/* Backing Sheet Toggle */}
          <SettingsSelectorBase
            preview={
              <PreviewBox shape="square" size="medium">
                <span style={{ fontSize: '1.5rem' }}>📋</span>
              </PreviewBox>
            }
            info={<InfoSection label="Backing Sheet" />}
            headerSlot={
              <EnableToggle
                enabled={settings.backingSheet.enabled}
                onChange={(enabled) => {
                  // Update backingSheet.enabled in context
                  drawer.updatePending({ backingSheet: { enabled } });
                  drawer.apply();
                }}
              />
            }
            actionLabel={settings.backingSheet.enabled ? 'Customize' : undefined}
            onAction={settings.backingSheet.enabled ? () => drawer.open('backingSheet') : undefined}
            ariaLabel="Backing sheet generation settings"
          />

          {/* Night Order Toggle */}
          <SettingsSelectorBase
            preview={
              <PreviewBox shape="square" size="medium">
                <span style={{ fontSize: '1.5rem' }}>🌙</span>
              </PreviewBox>
            }
            info={<InfoSection label="Night Order" />}
            headerSlot={
              <EnableToggle enabled={generateNightOrder} onChange={setGenerateNightOrder} />
            }
            actionLabel={generateNightOrder ? 'Customize' : undefined}
            onAction={generateNightOrder ? () => drawer.open('nightOrder') : undefined}
            ariaLabel="Night order generation settings"
          />
        </div>
      </ViewLayout.Panel>

      {/* Print Preview Area */}
      <ViewLayout.Panel position="right" width="flex" scrollable className={styles.previewArea}>
        {/* Empty state when nothing is enabled */}
        {!(generatePlayerScript || generateNightOrder) && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📄</div>
            <h3>No Preview Available</h3>
            <p>Enable Player Script or Night Order in the sidebar to view the preview.</p>
          </div>
        )}

        {/* Empty state when both enabled but no data */}
        {(generatePlayerScript || generateNightOrder) &&
          playerScriptCharacters.length === 0 &&
          hasNoData && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📄</div>
              <h3>No Script Loaded</h3>
              <p>Load a script in the Editor tab to view the preview.</p>
              <p className={styles.hint}>
                The preview will show player script and night order sheets.
              </p>
            </div>
          )}

        {/* Combined sheets container when we have content */}
        {((generatePlayerScript && playerScriptCharacters.length > 0) ||
          (generateNightOrder && !hasNoData)) && (
          <div className={styles.sheetsContainer}>
            {/* Player Script (first) */}
            {generatePlayerScript && playerScriptCharacters.length > 0 && (
              <PlayerScriptPreview
                characters={playerScriptCharacters}
                scriptMeta={displayMeta}
                imageUrls={playerScriptImageUrls}
                logoUrl={displayMeta?.logo}
                enableReordering={enableDragDrop}
                firstNightIcons={playerScriptFirstNight}
                otherNightIcons={playerScriptOtherNight}
              />
            )}

            {/* Night Order (second) */}
            {generateNightOrder && !hasNoData && (
              <>
                {/* First Night Pages */}
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
                        background={background}
                        onEditCharacter={onEditCharacter}
                        pageNumber={pageIndex + 1}
                        totalPages={firstNightPages.pageCount}
                        iconScale={nightOrderIconScale}
                        margins={nightOrderMargins}
                      />
                    </ScaledPage>
                  </div>
                ))}

                {/* Other Nights Pages */}
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
                        background={background}
                        onEditCharacter={onEditCharacter}
                        pageNumber={pageIndex + 1}
                        totalPages={otherNightPages.pageCount}
                        iconScale={nightOrderIconScale}
                        margins={nightOrderMargins}
                      />
                    </ScaledPage>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </ViewLayout.Panel>

      {/* Settings Drawer */}
      <ScriptPdfDrawer
        isOpen={drawer.isOpen}
        onClose={drawer.close}
        onApply={drawer.apply}
        onReset={drawer.reset}
        activeTab={drawer.activeTab}
        onTabChange={drawer.setActiveTab}
        pendingSettings={drawer.pendingSettings}
        updatePending={drawer.updatePending}
      />
    </ViewLayout>
  );
}
