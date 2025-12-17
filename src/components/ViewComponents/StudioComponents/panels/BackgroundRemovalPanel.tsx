/**
 * Background Removal Panel
 *
 * Panel for AI-powered and manual background removal
 */

import { useState } from 'react';
import { useStudio } from '../../../../contexts/StudioContext';
import styles from '../../../../styles/components/studio/Studio.module.css';
import { backgroundRemovalService } from '../../../../ts/studio/backgroundRemoval';
import { getImageData, putImageData } from '../../../../ts/studio/canvasOperations';
import { logger } from '../../../../ts/utils/logger.js';

export function BackgroundRemovalPanel() {
  const { activeLayer, updateLayer, pushHistory } = useStudio();

  // State
  const [isProcessing, setIsProcessing] = useState(false);
  const [threshold, setThreshold] = useState(0.5);
  const [edgeSmoothing, setEdgeSmoothing] = useState(2);
  const [featherEdges, setFeatherEdges] = useState(true);
  const [showBefore, setShowBefore] = useState(false);
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto remove background using ML
  const handleAutoRemove = async () => {
    if (!activeLayer || activeLayer.type !== 'image') return;

    setIsProcessing(true);
    setError(null);

    try {
      // Get current image data
      const imageData = getImageData(activeLayer.canvas);

      // Store original for before/after comparison
      if (!originalImageData) {
        setOriginalImageData(
          new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height)
        );
      }

      // Run background removal
      const result = await backgroundRemovalService.removeBackground(imageData, {
        threshold,
        featherEdges,
        edgeRadius: edgeSmoothing,
        invertMask: false,
      });

      // Apply result to canvas
      putImageData(activeLayer.canvas, result);

      // Update layer
      updateLayer(activeLayer.id, { canvas: activeLayer.canvas });
      pushHistory('Remove Background');
    } catch (err) {
      logger.error('BackgroundRemovalPanel', 'Background removal failed', err);
      setError(
        'Failed to remove background. Make sure the MediaPipe package is installed: ' +
          'npm install @mediapipe/selfie_segmentation'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset to original image
  const handleReset = () => {
    if (!(activeLayer && originalImageData)) return;

    putImageData(activeLayer.canvas, originalImageData);
    updateLayer(activeLayer.id, { canvas: activeLayer.canvas });
    setOriginalImageData(null);
    setShowBefore(false);
    pushHistory('Reset Background Removal');
  };

  // Toggle before/after preview
  const handleTogglePreview = () => {
    if (!(activeLayer && originalImageData)) return;

    if (showBefore) {
      // Show current (after)
      const currentImageData = getImageData(activeLayer.canvas);
      putImageData(activeLayer.canvas, currentImageData);
    } else {
      // Show original (before)
      putImageData(activeLayer.canvas, originalImageData);
    }

    setShowBefore(!showBefore);
    updateLayer(activeLayer.id, { canvas: activeLayer.canvas });
  };

  // Check if model is available
  const isModelLoaded = backgroundRemovalService.isModelLoaded();
  const isModelLoading = backgroundRemovalService.isModelLoading();

  if (!activeLayer || activeLayer.type !== 'image') {
    return (
      <div className={styles.sidebarSection}>
        <h3 className={styles.sectionTitle}>Background Removal</h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          Select an image layer to remove background
        </p>
      </div>
    );
  }

  return (
    <div className={styles.sidebarSection}>
      <h3 className={styles.sectionTitle}>Background Removal</h3>

      {/* Error Message */}
      {error && (
        <div
          style={{
            padding: 'var(--spacing-sm)',
            marginBottom: 'var(--spacing-md)',
            background: 'rgba(220, 53, 69, 0.1)',
            border: '1px solid rgba(220, 53, 69, 0.3)',
            borderRadius: 'var(--border-radius-sm)',
            fontSize: '0.75rem',
            color: '#dc3545',
          }}
        >
          {error}
        </div>
      )}

      {/* Auto Remove Button */}
      <button
        type="button"
        className={styles.toolbarButton}
        onClick={handleAutoRemove}
        disabled={isProcessing || isModelLoading}
        style={{ width: '100%', marginBottom: 'var(--spacing-md)' }}
      >
        {isProcessing
          ? '🔄 Processing...'
          : isModelLoading
            ? '📥 Loading Model...'
            : '🤖 Auto Remove Background'}
      </button>

      {/* Threshold Slider */}
      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: 'var(--spacing-xs)' }}>
          Threshold: {(threshold * 100).toFixed(0)}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={threshold * 100}
          onChange={(e) => setThreshold(Number(e.target.value) / 100)}
          disabled={isProcessing}
          style={{ width: '100%' }}
        />
        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Higher = more aggressive removal
        </p>
      </div>

      {/* Edge Feathering Toggle */}
      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '0.75rem',
            gap: 'var(--spacing-xs)',
          }}
        >
          <input
            type="checkbox"
            checked={featherEdges}
            onChange={(e) => setFeatherEdges(e.target.checked)}
            disabled={isProcessing}
          />
          Feather Edges
        </label>
      </div>

      {/* Edge Smoothness Slider */}
      {featherEdges && (
        <div style={{ marginBottom: 'var(--spacing-md)' }}>
          <label
            style={{ display: 'block', fontSize: '0.75rem', marginBottom: 'var(--spacing-xs)' }}
          >
            Edge Smoothness: {edgeSmoothing}px
          </label>
          <input
            type="range"
            min="0"
            max="10"
            value={edgeSmoothing}
            onChange={(e) => setEdgeSmoothing(Number(e.target.value))}
            disabled={isProcessing}
            style={{ width: '100%' }}
          />
        </div>
      )}

      {/* Before/After Toggle */}
      {originalImageData && (
        <div
          style={{
            marginTop: 'var(--spacing-lg)',
            paddingTop: 'var(--spacing-md)',
            borderTop: '1px solid var(--color-primary)',
          }}
        >
          <h4 style={{ fontSize: '0.875rem', marginBottom: 'var(--spacing-sm)' }}>Preview</h4>

          <button
            type="button"
            className={styles.toolbarButton}
            onClick={handleTogglePreview}
            style={{ width: '100%', marginBottom: 'var(--spacing-xs)' }}
          >
            {showBefore ? '👁️ Show After' : '👁️ Show Before'}
          </button>

          <button
            type="button"
            className={styles.toolbarButton}
            onClick={handleReset}
            style={{ width: '100%' }}
          >
            🔄 Reset to Original
          </button>
        </div>
      )}

      {/* Model Status */}
      <div
        style={{
          marginTop: 'var(--spacing-md)',
          paddingTop: 'var(--spacing-md)',
          borderTop: '1px solid var(--color-primary)',
        }}
      >
        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
          <strong>Model Status:</strong>{' '}
          {isModelLoaded ? '✅ Loaded' : isModelLoading ? '⏳ Loading...' : '⏸️ Not Loaded'}
        </p>
        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Uses MediaPipe Selfie Segmentation (client-side, no API costs)
        </p>
      </div>

      {/* Manual Tools Section (Future Enhancement) */}
      <div
        style={{
          marginTop: 'var(--spacing-lg)',
          paddingTop: 'var(--spacing-md)',
          borderTop: '1px solid var(--color-primary)',
        }}
      >
        <h4 style={{ fontSize: '0.875rem', marginBottom: 'var(--spacing-sm)' }}>
          Manual Refinement
        </h4>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
          Manual mask painting tools coming soon...
        </p>
      </div>
    </div>
  );
}
