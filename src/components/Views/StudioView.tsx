/**
 * Studio View - Simple Asset Editor
 *
 * A simplified image editor for editing assets in the asset manager.
 * Features: background removal, team color application, save/export.
 *
 * Uses standard 2-panel ViewLayout matching other views.
 */

import { useEffect, useRef, useState } from 'react';
import { ViewLayout } from '@/components/Layout/ViewLayout';
import { AssetManagerModal } from '@/components/Modals/AssetManagerModal';
import { ErrorBoundary, UnifiedErrorDisplay } from '@/components/Shared';
import {
  BorderSettings,
  SaveModal,
  TeamColorSettings,
} from '@/components/ViewComponents/StudioComponents';
import { useAssetStorageService } from '@/contexts/ServiceContext';
import { useTokenContext } from '@/contexts/TokenContext';
import { useAssetEditor } from '@/hooks/studio/useAssetEditor';
import { useResizableSidebar } from '@/hooks/ui';
import layoutStyles from '@/styles/components/layout/ViewLayout.module.css';
import styles from '@/styles/components/studio/Studio.module.css';
import { STUDIO_DEFAULTS } from '@/ts/constants.js';
import { consumePendingStudioOperation } from '@/ts/studio/navigationHelpers.js';
import { extractAssetId, isAssetReference } from '@/ts/types/index.js';
import { cn } from '@/ts/utils/classNames.js';
import { logger } from '@/ts/utils/logger.js';

export function StudioView() {
  const assetStorageService = useAssetStorageService();
  const { generationOptions } = useTokenContext();

  const {
    currentCanvas,
    loadedAssetName,
    isLoading,
    isProcessing,
    processingMessage,
    hasChanges,
    selectedPreset,
    customColor,
    borderOptions,
    error,
    loadFromFile,
    loadFromAsset,
    applyTeamColor,
    applyCustomColor,
    applyBorder,
    removeBorder,
    invertColors,
    save,
    presets,
  } = useAssetEditor();

  // Resizable sidebar
  const { width: sidebarWidth, isDragging: isResizing, handleProps } = useResizableSidebar();

  // UI state
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [saveModalState, setSaveModalState] = useState<{ open: boolean; asNew: boolean }>({
    open: false,
    asNew: false,
  });
  const [borderWidth, setBorderWidth] = useState<number>(STUDIO_DEFAULTS.BORDER_WIDTH);
  const [borderColor, setBorderColor] = useState<string>(STUDIO_DEFAULTS.BORDER_COLOR);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track previous borderOptions for render-time comparison (React's recommended pattern)
  const [prevBorderOptionsJson, setPrevBorderOptionsJson] = useState(() =>
    JSON.stringify(borderOptions)
  );

  // Sync border UI state during render when borderOptions changes (faster than useEffect)
  const borderOptionsJson = JSON.stringify(borderOptions);
  if (borderOptionsJson !== prevBorderOptionsJson) {
    setPrevBorderOptionsJson(borderOptionsJson);
    if (borderOptions) {
      setBorderWidth(borderOptions.width);
      setBorderColor(borderOptions.color);
    }
  }

  // Derived state
  const hasImage = currentCanvas !== null;
  const isTeamColorEnabled = selectedPreset !== null || customColor !== null;
  const isBorderEnabled = borderOptions !== null;

  // Generate preview URL from canvas
  const previewUrl = currentCanvas ? currentCanvas.toDataURL('image/png') : null;

  // Check for pending navigation operations
  useEffect(() => {
    const pendingOp = consumePendingStudioOperation();
    if (!pendingOp) return;

    const loadPendingOperation = async () => {
      try {
        logger.info('StudioView', 'Loading pending operation:', pendingOp.type, pendingOp.metadata);

        if (pendingOp.type === 'loadFromBlob' && pendingOp.data instanceof Blob) {
          await loadFromFile(pendingOp.data);
        } else if (pendingOp.type === 'loadFromUrl' && typeof pendingOp.data === 'string') {
          const response = await fetch(pendingOp.data);
          const blob = await response.blob();
          await loadFromFile(blob);
        } else if (pendingOp.type === 'loadFromAsset' && typeof pendingOp.data === 'string') {
          await loadFromAsset(pendingOp.data, pendingOp.metadata?.characterName);
        }
      } catch (err) {
        logger.error('StudioView', 'Failed to load pending operation', err);
      }
    };

    loadPendingOperation();
  }, [loadFromFile, loadFromAsset]);

  // Paste handler
  useEffect(() => {
    if (isProcessing) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) await loadFromFile(blob);
          return;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [isProcessing, loadFromFile]);

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isProcessing) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isProcessing) return;

    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) {
      await loadFromFile(file);
    }
  };

  // File input handler
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await loadFromFile(file);
      e.target.value = '';
    }
  };

  const openFileDialog = () => fileInputRef.current?.click();

  // Handle asset selection from modal
  const handleAssetSelect = async (assetIdOrRef: string) => {
    setShowAssetModal(false);
    if (assetIdOrRef === 'none') return;

    try {
      const assetId = isAssetReference(assetIdOrRef) ? extractAssetId(assetIdOrRef) : assetIdOrRef;
      const asset = await assetStorageService.getById(assetId);
      const assetName = asset?.metadata?.filename || 'Asset';
      await loadFromAsset(assetId, assetName);
    } catch (err) {
      logger.error('StudioView', 'Failed to load selected asset', err);
    }
  };

  // Team color handlers
  const handleTeamColorToggle = (enabled: boolean) => {
    if (!enabled) applyTeamColor(null);
  };

  // Border handlers
  const handleBorderToggle = (enabled: boolean) => {
    if (enabled) {
      applyBorder({ width: borderWidth, color: borderColor });
    } else {
      removeBorder();
    }
  };

  const handleBorderWidthChange = (newWidth: number) => {
    setBorderWidth(newWidth);
    if (borderOptions) applyBorder({ width: newWidth, color: borderColor }, true);
  };

  const handleBorderColorChange = (newColor: string) => {
    setBorderColor(newColor);
    if (borderOptions) applyBorder({ width: borderWidth, color: newColor }, true);
  };

  // Save handlers
  const handleSaveClick = (asNew: boolean) => {
    setSaveModalState({ open: true, asNew });
  };

  const handleSaveConfirm = async (name: string) => {
    try {
      await save(name, !saveModalState.asNew);
      setSaveModalState({ open: false, asNew: false });
    } catch {
      // Error is handled in the hook
    }
  };

  const handleSaveCancel = () => {
    setSaveModalState({ open: false, asNew: false });
  };

  const initialSaveName = (() => {
    if (!loadedAssetName) return '';
    return saveModalState.asNew ? `${loadedAssetName}_edited` : loadedAssetName;
  })();

  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <UnifiedErrorDisplay context="Studio" error={error} onRetry={resetErrorBoundary} />
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />

      <ViewLayout variant="2-panel">
        {/* Left Sidebar - Tools (Resizable) */}
        <ViewLayout.Panel
          position="left"
          resizable
          resizableWidth={sidebarWidth}
          isResizing={isResizing}
          onWidthChange={handleProps.onMouseDown}
          scrollable
        >
          <div className={layoutStyles.panelContent}>
            {/* Image Section - Load/Save */}
            <div className={styles.imageSection}>
              <div className={styles.imageSectionRow}>
                <span className={styles.imageSectionLabel}>Load</span>
                <div className={styles.imageSectionButtons}>
                  <button
                    type="button"
                    className={styles.slimButton}
                    onClick={() => setShowAssetModal(true)}
                    disabled={isProcessing}
                  >
                    Assets
                  </button>
                  <button
                    type="button"
                    className={cn(styles.slimButton, styles.secondary)}
                    onClick={openFileDialog}
                    disabled={isProcessing}
                  >
                    File
                  </button>
                </div>
              </div>
              <div className={styles.imageSectionRow}>
                <span className={styles.imageSectionLabel}>Save</span>
                <div className={styles.imageSectionButtons}>
                  <button
                    type="button"
                    className={styles.slimButton}
                    onClick={() => handleSaveClick(false)}
                    disabled={!hasImage || isProcessing}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className={cn(styles.slimButton, styles.secondary)}
                    onClick={() => handleSaveClick(true)}
                    disabled={!hasImage || isProcessing}
                  >
                    Save As
                  </button>
                </div>
              </div>
            </div>

            <TeamColorSettings
              enabled={isTeamColorEnabled}
              selectedPreset={selectedPreset}
              customColor={customColor}
              presets={presets}
              onToggle={handleTeamColorToggle}
              onPresetSelect={applyTeamColor}
              onCustomColor={applyCustomColor}
              onInvert={invertColors}
              disabled={!hasImage || isProcessing}
            />

            <BorderSettings
              enabled={isBorderEnabled}
              borderWidth={borderWidth}
              borderColor={borderColor}
              onToggle={handleBorderToggle}
              onWidthChange={handleBorderWidthChange}
              onColorChange={handleBorderColorChange}
              disabled={!hasImage || isProcessing}
            />
          </div>
        </ViewLayout.Panel>

        {/* Right Content - Image Preview */}
        <ViewLayout.Panel position="right" width="flex" scrollable>
          <section
            className={styles.editorContent}
            aria-label="Image drop zone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              outline: isDragging ? '3px dashed var(--color-accent)' : 'none',
              outlineOffset: '-10px',
            }}
          >
            {error && <div className={styles.errorMessage}>{error}</div>}

            {!(hasImage || isLoading) && (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateIcon}>&#127912;</div>
                <h2 className={styles.emptyStateTitle}>Asset Editor</h2>
                <p className={styles.emptyStateText}>
                  Edit character icons with background removal and team color application.
                </p>
                <div className={styles.emptyStateActions}>
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={() => setShowAssetModal(true)}
                  >
                    Load from Assets
                  </button>
                  <button
                    type="button"
                    className={cn(styles.actionButton, styles.secondary)}
                    onClick={openFileDialog}
                  >
                    Load from File
                  </button>
                </div>
                <p className={styles.helpText} style={{ marginTop: 'var(--spacing-lg)' }}>
                  You can also drag &amp; drop an image or paste from clipboard (Ctrl+V)
                </p>
              </div>
            )}

            {hasImage && previewUrl && (
              <div className={styles.previewContainer}>
                <img src={previewUrl} alt="Preview" className={styles.imagePreview} />
                {currentCanvas && (
                  <div className={styles.imageDimensions}>
                    {loadedAssetName && <span className={styles.assetName}>{loadedAssetName}</span>}
                    <span>
                      {currentCanvas.width} x {currentCanvas.height} px
                    </span>
                    {hasChanges && (
                      <span className={styles.unsavedIndicator} title="Unsaved changes" />
                    )}
                  </div>
                )}
              </div>
            )}

            {(isLoading || isProcessing) && (
              <div className={styles.processingOverlay}>
                <div className={styles.processingContent}>
                  <div className={styles.processingSpinner} />
                  <div className={styles.processingText}>
                    {processingMessage || (isLoading ? 'Loading...' : 'Processing...')}
                  </div>
                </div>
              </div>
            )}
          </section>
        </ViewLayout.Panel>
      </ViewLayout>

      {showAssetModal && (
        <AssetManagerModal
          isOpen={showAssetModal}
          onClose={() => setShowAssetModal(false)}
          projectId={undefined}
          initialAssetType="icon"
          selectionMode={true}
          onSelectAsset={handleAssetSelect}
          generationOptions={generationOptions}
        />
      )}

      <SaveModal
        isOpen={saveModalState.open}
        saveAsNew={saveModalState.asNew}
        initialName={initialSaveName}
        onSave={handleSaveConfirm}
        onCancel={handleSaveCancel}
      />
    </ErrorBoundary>
  );
}
