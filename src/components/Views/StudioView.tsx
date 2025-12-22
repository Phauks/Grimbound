/**
 * Studio View - Simple Asset Editor
 *
 * A simplified image editor for editing assets in the asset manager.
 * Features: background removal, team color application, save/export.
 *
 * Uses standard 2-panel ViewLayout matching other views.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ViewLayout } from '@/components/Layout/ViewLayout';
import { AssetManagerModal } from '@/components/Modals/AssetManagerModal';
import { ErrorBoundary, ViewErrorFallback } from '@/components/Shared';
import {
  BorderSettings,
  SaveModal,
  TeamColorSettings,
} from '@/components/ViewComponents/StudioComponents';
import { useAssetStorageService } from '@/contexts/ServiceContext';
import { useTokenContext } from '@/contexts/TokenContext';
import { useAssetEditor } from '@/hooks/studio/useAssetEditor';
import layoutStyles from '@/styles/components/layout/ViewLayout.module.css';
import styles from '@/styles/components/studio/Studio.module.css';
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

  // UI state
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [saveModalState, setSaveModalState] = useState<{ open: boolean; asNew: boolean }>({
    open: false,
    asNew: false,
  });
  const [borderWidth, setBorderWidth] = useState(3);
  const [borderColor, setBorderColor] = useState('#FFFFFF');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync border UI state with current border options
  useEffect(() => {
    if (borderOptions) {
      setBorderWidth(borderOptions.width);
      setBorderColor(borderOptions.color);
    }
  }, [borderOptions]);

  // Derived state
  const hasImage = currentCanvas !== null;
  const isTeamColorEnabled = selectedPreset !== null || customColor !== null;
  const isBorderEnabled = borderOptions !== null;

  // Generate preview URL from canvas
  const previewUrl = useMemo(() => {
    if (!currentCanvas) return null;
    return currentCanvas.toDataURL('image/png');
  }, [currentCanvas]);

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
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!isProcessing) setIsDragging(true);
    },
    [isProcessing]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (isProcessing) return;

      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith('image/')) {
        await loadFromFile(file);
      }
    },
    [isProcessing, loadFromFile]
  );

  // File input handler
  const handleFileInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        await loadFromFile(file);
        e.target.value = '';
      }
    },
    [loadFromFile]
  );

  const openFileDialog = useCallback(() => fileInputRef.current?.click(), []);

  // Handle asset selection from modal
  const handleAssetSelect = useCallback(
    async (assetIdOrRef: string) => {
      setShowAssetModal(false);
      if (assetIdOrRef === 'none') return;

      try {
        const assetId = isAssetReference(assetIdOrRef)
          ? extractAssetId(assetIdOrRef)
          : assetIdOrRef;
        const asset = await assetStorageService.getById(assetId);
        const assetName = asset?.metadata?.filename || 'Asset';
        await loadFromAsset(assetId, assetName);
      } catch (err) {
        logger.error('StudioView', 'Failed to load selected asset', err);
      }
    },
    [assetStorageService, loadFromAsset]
  );

  // Team color handlers
  const handleTeamColorToggle = useCallback(
    (enabled: boolean) => {
      if (!enabled) applyTeamColor(null);
    },
    [applyTeamColor]
  );

  // Border handlers
  const handleBorderToggle = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        applyBorder({ width: borderWidth, color: borderColor });
      } else {
        removeBorder();
      }
    },
    [borderWidth, borderColor, applyBorder, removeBorder]
  );

  const handleBorderWidthChange = useCallback(
    (newWidth: number) => {
      setBorderWidth(newWidth);
      if (borderOptions) applyBorder({ width: newWidth, color: borderColor }, true);
    },
    [borderOptions, borderColor, applyBorder]
  );

  const handleBorderColorChange = useCallback(
    (newColor: string) => {
      setBorderColor(newColor);
      if (borderOptions) applyBorder({ width: borderWidth, color: newColor }, true);
    },
    [borderOptions, borderWidth, applyBorder]
  );

  // Save handlers
  const handleSaveClick = useCallback((asNew: boolean) => {
    setSaveModalState({ open: true, asNew });
  }, []);

  const handleSaveConfirm = useCallback(
    async (name: string) => {
      try {
        await save(name, !saveModalState.asNew);
        setSaveModalState({ open: false, asNew: false });
      } catch {
        // Error is handled in the hook
      }
    },
    [save, saveModalState.asNew]
  );

  const handleSaveCancel = useCallback(() => {
    setSaveModalState({ open: false, asNew: false });
  }, []);

  const initialSaveName = useMemo(() => {
    if (!loadedAssetName) return '';
    return saveModalState.asNew ? `${loadedAssetName}_edited` : loadedAssetName;
  }, [loadedAssetName, saveModalState.asNew]);

  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <ViewErrorFallback view="Studio" error={error} onRetry={resetErrorBoundary} />
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
        {/* Left Sidebar - Tools */}
        <ViewLayout.Panel position="left" width="left" scrollable>
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
          initialAssetType="character-icon"
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
