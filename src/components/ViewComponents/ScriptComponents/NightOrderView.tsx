/**
 * Night Order View Component
 *
 * Main container for the Night Order feature.
 * Uses sidebar layout with print preview showing realistic 8.5" x 11" pages.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { type DownloadItem, useDownloadsContext } from '@/contexts/DownloadsContext';
import { useNightOrder } from '@/contexts/NightOrderContext';
import { useTokenContext } from '@/contexts/TokenContext';
import { useExpandablePanel } from '@/hooks/useExpandablePanel';
import layoutStyles from '@/styles/components/layout/ViewLayout.module.css';
import styles from '@/styles/components/script/NightOrderView.module.css';
import baseStyles from '@/styles/components/shared/SettingsSelectorBase.module.css';
import {
  downloadNightOrderPdf,
  type ExportPhase,
} from '@/ts/nightOrder/nightOrderPdfLib.js';
import { logger } from '@/ts/utils/logger.js';
import { ViewLayout } from '@/components/Layout/ViewLayout';
import {
  SettingsSelectorBase,
  PreviewBox,
  InfoSection,
  EnableToggle,
} from '@/components/Shared/Selectors/SettingsSelectorBase';
import { NightSheet } from './NightSheet';
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
  const { characters, scriptMeta } = useTokenContext();
  const { setDownloads, clearDownloads } = useDownloadsContext();
  const {
    firstNight,
    otherNight,
    scriptMeta: nightOrderMeta,
    isLoading,
    error,
    initializeFromScript,
    moveEntry,
  } = useNightOrder();

  // Generation state
  const [generateNightOrder, setGenerateNightOrder] = useState(true);

  // Background customization state
  const [background, setBackground] = useState<NightSheetBackground>(DEFAULT_BACKGROUND);

  // Refs for PDF export (capture DOM elements)
  const firstNightRef = useRef<HTMLDivElement>(null);
  const otherNightRef = useRef<HTMLDivElement>(null);

  // Initialize night order when characters change and generation is enabled
  useEffect(() => {
    if (generateNightOrder && characters.length > 0) {
      const scriptData = scriptMeta ? [scriptMeta, ...characters] : characters;
      initializeFromScript(scriptData);
    }
  }, [generateNightOrder, characters, scriptMeta, initializeFromScript]);

  // Use night order's script meta if available
  const displayMeta = nightOrderMeta || scriptMeta;

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

      // Use new pdf-lib exporter (fast, native OTF support)
      await downloadNightOrderPdf(firstNight, otherNight, displayMeta || null, filename, {
        includeFirstNight: true,
        includeOtherNight: true,
        showScriptName: true,
        onProgress: (phase, current, total) => {
          setExportPhase(phase);
          setExportProgress({ current, total });
        },
        signal: abortControllerRef.current.signal,
      });
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
  }, [displayMeta, isExporting, firstNight, otherNight]);

  // Register downloads for this view
  useEffect(() => {
    const hasNoData = firstNight.entries.length === 0 && otherNight.entries.length === 0;

    const downloads: DownloadItem[] = [
      {
        id: 'night-order-pdf',
        icon: '📄',
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
    minPanelWidth: 300,
  });

  // Get display settings (pending when editing, current otherwise)
  const displayBackground = backgroundPanel.isExpanded
    ? backgroundPanel.pendingValue
    : background;

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
            <label className={styles.settingLabel} htmlFor="night-order-custom-color">
              Custom Color
            </label>
            <div className={styles.colorPickerRow}>
              <input
                id="night-order-custom-color"
                type="color"
                value={backgroundPanel.pendingValue.baseColor}
                onChange={(e) => backgroundPanel.updatePendingField('baseColor', e.target.value)}
                className={styles.colorPicker}
              />
              <input
                type="text"
                value={backgroundPanel.pendingValue.baseColor}
                onChange={(e) => backgroundPanel.updatePendingField('baseColor', e.target.value)}
                className={styles.colorInput}
                maxLength={7}
              />
            </div>
          </div>

          {/* Texture Toggle */}
          <div className={styles.settingGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={backgroundPanel.pendingValue.showTexture}
                onChange={(e) => backgroundPanel.updatePendingField('showTexture', e.target.checked)}
                className={styles.checkbox}
              />
              Show paper texture
            </label>
          </div>

          {/* Texture Opacity */}
          {backgroundPanel.pendingValue.showTexture && (
            <div className={styles.settingGroup}>
              <label className={styles.settingLabel} htmlFor="night-order-texture-opacity">
                Texture Intensity
              </label>
              <input
                id="night-order-texture-opacity"
                type="range"
                min="0.01"
                max="0.15"
                step="0.01"
                value={backgroundPanel.pendingValue.textureOpacity}
                onChange={(e) =>
                  backgroundPanel.updatePendingField('textureOpacity', parseFloat(e.target.value))
                }
                className={styles.rangeSlider}
              />
            </div>
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
          {/* Player Script (Coming Soon - Disabled) */}
          <SettingsSelectorBase
            preview={
              <PreviewBox shape="square" size="medium">
                <span style={{ fontSize: '1.5rem' }}>📜</span>
              </PreviewBox>
            }
            info={
              <InfoSection
                label="Player Script"
                summary="Coming Soon"
              />
            }
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
                summary={generateNightOrder ? `${displayBackground.baseColor}${displayBackground.showTexture ? ', Texture' : ''}` : 'Disabled'}
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
        </div>
      </ViewLayout.Panel>

      {/* Print Preview Area */}
      <ViewLayout.Panel position="right" width="flex" scrollable className={styles.previewArea}>
        {!generateNightOrder ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🌙</div>
            <h3>Night Order Generation Disabled</h3>
            <p>Enable "Generate Night Order" in the Options section to view night order sheets.</p>
          </div>
        ) : hasNoData ? (
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
            {/* First Night Page */}
            <div className={styles.pageWrapper}>
              <div className={styles.page}>
                <NightSheet
                  ref={firstNightRef}
                  type="first"
                  entries={firstNight.entries}
                  scriptMeta={displayMeta}
                  enableDragDrop={enableDragDrop}
                  onMoveEntry={handleMoveFirstNight}
                  background={displayBackground}
                  onEditCharacter={onEditCharacter}
                />
              </div>
            </div>

            {/* Other Nights Page */}
            <div className={styles.pageWrapper}>
              <div className={styles.page}>
                <NightSheet
                  ref={otherNightRef}
                  type="other"
                  entries={otherNight.entries}
                  scriptMeta={displayMeta}
                  enableDragDrop={enableDragDrop}
                  onMoveEntry={handleMoveOtherNight}
                  background={displayBackground}
                  onEditCharacter={onEditCharacter}
                />
              </div>
            </div>
          </div>
        )}
      </ViewLayout.Panel>
    </ViewLayout>
  );
}
