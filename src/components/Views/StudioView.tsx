/**
 * Studio View
 *
 * Main container for the Studio image editor.
 * Uses ViewLayout 3-panel system: left sidebar (tools), center (canvas), right (layers).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useStudio } from '../../contexts/StudioContext';
import layoutStyles from '../../styles/components/layout/ViewLayout.module.css';
import styles from '../../styles/components/studio/Studio.module.css';
import { assetStorageService } from '../../ts/services/upload/AssetStorageService';
import { composeLayers, consumePendingStudioOperation } from '../../ts/studio/index';
import { extractAssetId, isAssetReference } from '../../ts/types/index';
import { applyCorsProxy } from '../../ts/utils/imageUtils';
import { logger } from '../../ts/utils/logger.js';
import { ViewLayout } from '../Layout/ViewLayout';
import { StudioCanvas } from '../ViewComponents/StudioComponents/StudioCanvas';
import { StudioLayersPanel } from '../ViewComponents/StudioComponents/StudioLayersPanel';
import { StudioSidebar } from '../ViewComponents/StudioComponents/StudioSidebar';

export function StudioView() {
  const {
    layers,
    canvasSize,
    zoom: _zoom,
    backgroundColor: _backgroundColor,
    isDirty,
    isProcessing,
    loadFromImage,
    newProject,
  } = useStudio();

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check for pending navigation operations (e.g., "Edit in Studio" from Gallery)
  useEffect(() => {
    const pendingOp = consumePendingStudioOperation();
    if (!pendingOp) return;

    const loadPendingOperation = async () => {
      try {
        logger.info(
          'StudioView',
          'Loading pending operation:',
          pendingOp.type,
          pendingOp.metadata,
          'editMode:',
          pendingOp.editMode
        );

        // Use editMode from pending operation (defaults to 'full' if not specified)
        const mode = pendingOp.editMode || 'full';

        if (pendingOp.type === 'loadFromBlob' && pendingOp.data instanceof Blob) {
          await loadFromImage(pendingOp.data, mode);
        } else if (pendingOp.type === 'loadFromUrl' && typeof pendingOp.data === 'string') {
          const url = pendingOp.data;
          let blob: Blob;

          // Check if this is an AssetReference (asset:uuid)
          if (isAssetReference(url)) {
            logger.info('StudioView', 'Loading from AssetReference:', url);
            const assetId = extractAssetId(url);
            const assetUrl = await assetStorageService.getAssetUrl(assetId);
            if (!assetUrl) {
              throw new Error(`Asset not found: ${assetId}`);
            }
            // Fetch the asset blob from the object URL
            const response = await fetch(assetUrl);
            blob = await response.blob();
          } else {
            // External URL or data URL - apply CORS proxy if needed
            const proxiedUrl = applyCorsProxy(url);
            logger.info('StudioView', 'Fetching from URL:', `${proxiedUrl.substring(0, 50)}...`);
            const response = await fetch(proxiedUrl);
            if (!response.ok) {
              throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
            }
            blob = await response.blob();
          }

          await loadFromImage(blob, mode);
        } else if (pendingOp.type === 'loadFromAsset' && typeof pendingOp.data === 'string') {
          // Direct asset ID (not URL format)
          logger.info('StudioView', 'Loading asset by ID:', pendingOp.data);
          const assetUrl = await assetStorageService.getAssetUrl(pendingOp.data);
          if (!assetUrl) {
            throw new Error(`Asset not found: ${pendingOp.data}`);
          }
          // Fetch the asset blob from the object URL
          const response = await fetch(assetUrl);
          const blob = await response.blob();
          await loadFromImage(blob, mode);
        }
      } catch (error) {
        logger.error('StudioView', 'Failed to load pending operation', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        alert(
          `Failed to load image in Studio:\n${errorMessage}\n\nPlease check the browser console for details.`
        );
      }
    };

    loadPendingOperation();
  }, [loadFromImage]);

  // Composite canvas for rendering all layers
  const compositeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Optimized layer composition with RAF batching
  const rafComposeIdRef = useRef<number | null>(null);
  const needsComposeRef = useRef(true);

  // Force composition on mount to handle navigation back to Studio
  useEffect(() => {
    needsComposeRef.current = true;
  }, []);

  // Mark as needing compose when layers or canvas size changes
  useEffect(() => {
    needsComposeRef.current = true;
  }, []);

  // Update composite canvas with RAF batching
  useEffect(() => {
    const canvas = compositeCanvasRef.current;
    if (!canvas) return;

    const doCompose = () => {
      if (!needsComposeRef.current) {
        rafComposeIdRef.current = null;
        return;
      }

      // Skip if no layers
      if (layers.length === 0) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        needsComposeRef.current = false;
        rafComposeIdRef.current = null;
        return;
      }

      // Update canvas size if needed
      if (canvas.width !== canvasSize.width || canvas.height !== canvasSize.height) {
        canvas.width = canvasSize.width;
        canvas.height = canvasSize.height;
      }

      // Filter to only visible layers for better performance
      const visibleLayers = layers.filter((layer) => layer.visible);

      // Composite visible layers
      composeLayers(visibleLayers, canvas);

      needsComposeRef.current = false;
      rafComposeIdRef.current = null;
    };

    // Schedule composition if not already scheduled
    if (!rafComposeIdRef.current) {
      rafComposeIdRef.current = requestAnimationFrame(doCompose);
    }

    return () => {
      if (rafComposeIdRef.current) {
        cancelAnimationFrame(rafComposeIdRef.current);
        rafComposeIdRef.current = null;
      }
    };
  }, [layers, canvasSize]);

  // Handle file import
  const handleFileImport = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      try {
        await loadFromImage(file);
      } catch (error) {
        logger.error('StudioView', 'Failed to load image', error);
        alert('Failed to load image');
      }
    },
    [loadFromImage]
  );

  // Handle file input change
  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        handleFileImport(file);
      }
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [handleFileImport]
  );

  // Handle drag and drop
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragging(false);

      const file = event.dataTransfer.files[0];
      if (file) {
        handleFileImport(file);
      }
    },
    [handleFileImport]
  );

  // Handle paste from clipboard
  useEffect(() => {
    const handlePaste = async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            try {
              await loadFromImage(blob);
            } catch (error) {
              logger.error('StudioView', 'Failed to paste image', error);
            }
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [loadFromImage]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + O - Open file
      if ((event.ctrlKey || event.metaKey) && event.key === 'o') {
        event.preventDefault();
        fileInputRef.current?.click();
      }

      // Ctrl/Cmd + N - New project
      if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault();
        const confirmed = isDirty ? confirm('You have unsaved changes. Create new project?') : true;

        if (confirmed) {
          newProject(512, 512);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, newProject]);

  const hasLayers = layers.length > 0;

  return (
    <>
      {/* Hidden file input for importing images */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />

      <ViewLayout variant="3-panel">
        {/* Left Sidebar - Tools & Settings */}
        <ViewLayout.Panel
          position="left"
          width="left"
          scrollable
          className={layoutStyles.hiddenScrollbar}
          aria-label="Studio tools sidebar"
        >
          <StudioSidebar onImportClick={() => fileInputRef.current?.click()} />
        </ViewLayout.Panel>

        {/* Center - Canvas Area */}
        <ViewLayout.Panel position="center" width="flex">
          <div
            className={styles.canvasArea}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              outline: isDragging ? '3px dashed var(--color-accent)' : 'none',
              outlineOffset: '-10px',
            }}
          >
            {hasLayers ? (
              <StudioCanvas compositeCanvasRef={compositeCanvasRef} />
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateIcon}>🎨</div>
                <h2 className={styles.emptyStateTitle}>Welcome to Studio</h2>
                <p className={styles.emptyStateText}>
                  Create custom character icons and script logos with a professional image editor.
                  Get started by importing an image or creating a new project.
                </p>
                <div className={styles.emptyStateActions}>
                  <button
                    type="button"
                    className={styles.toolbarButton}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    📁 Import Image
                  </button>
                  <button
                    type="button"
                    className={styles.toolbarButton}
                    onClick={() => newProject(512, 512)}
                  >
                    ✨ New Project
                  </button>
                </div>
                <p
                  className={styles.emptyStateText}
                  style={{ marginTop: 'var(--spacing-lg)', fontSize: '0.75rem' }}
                >
                  Tip: You can also drag and drop an image or paste from clipboard (Ctrl+V)
                </p>
              </div>
            )}

            {/* Processing Overlay */}
            {isProcessing && (
              <div className={styles.processingOverlay}>
                <div className={styles.processingContent}>
                  <div className={styles.processingSpinner} />
                  <div className={styles.processingText}>Processing...</div>
                </div>
              </div>
            )}
          </div>
        </ViewLayout.Panel>

        {/* Right Sidebar - Layer Controls */}
        <ViewLayout.Panel
          position="right"
          width="right-studio"
          scrollable
          className={layoutStyles.hiddenScrollbar}
          aria-label="Layer controls panel"
        >
          <StudioLayersPanel />
        </ViewLayout.Panel>
      </ViewLayout>

      {/* Hidden composite canvas for rendering */}
      <canvas
        ref={compositeCanvasRef}
        style={{ display: 'none' }}
        width={canvasSize.width}
        height={canvasSize.height}
      />
    </>
  );
}
