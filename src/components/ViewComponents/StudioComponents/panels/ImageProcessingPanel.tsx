/**
 * Image Processing Panel
 *
 * Panel with sliders and controls for applying filters and adjustments to the active layer
 */

import { useCallback, useEffect, useState } from 'react';
import { useStudio } from '../../../../contexts/StudioContext';
import styles from '../../../../styles/components/studio/Studio.module.css';
import {
  addPadding,
  adjustBrightness,
  adjustContrast,
  adjustHue,
  adjustSaturation,
  applyAntiAliasing,
  applyBlur,
  applySharpen,
  cropToContent,
  detectEdges,
  getImageData,
  invertColors,
  putImageData,
} from '../../../../ts/studio/index';
import { logger } from '../../../../ts/utils/logger.js';

export function ImageProcessingPanel() {
  const { activeLayer, updateLayer, pushHistory } = useStudio();

  // Filter state
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [hue, setHue] = useState(0);
  const [isInverted, setIsInverted] = useState(false);
  const [blurRadius, setBlurRadius] = useState(0);
  const [sharpenAmount, setSharpenAmount] = useState(0);
  const [cropThreshold, setCropThreshold] = useState(10);
  const [paddingSize, setPaddingSize] = useState(0);
  const [paddingColor, setPaddingColor] = useState('#ffffff');

  // Track if we're currently applying filters (to prevent loops)
  const [isApplying, setIsApplying] = useState(false);

  // Store original image data for non-destructive editing
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);

  // Initialize original image data when active layer changes
  useEffect(() => {
    if (activeLayer && activeLayer.type === 'image') {
      try {
        const imageData = getImageData(activeLayer.canvas);
        setOriginalImageData(imageData);

        // Reset all filters
        setBrightness(0);
        setContrast(0);
        setSaturation(0);
        setHue(0);
        setIsInverted(false);
        setBlurRadius(0);
        setSharpenAmount(0);
      } catch (error) {
        logger.error('ImageProcessingPanel', 'Failed to get image data', error);
      }
    } else {
      setOriginalImageData(null);
    }
  }, [activeLayer?.id, activeLayer.canvas, activeLayer]); // Only reset when layer ID changes

  // Apply all filters
  const applyAllFilters = useCallback(() => {
    if (!(activeLayer && originalImageData) || isApplying) return;

    setIsApplying(true);

    try {
      let imageData = new ImageData(
        new Uint8ClampedArray(originalImageData.data),
        originalImageData.width,
        originalImageData.height
      );

      // Apply filters in sequence
      if (brightness !== 0) {
        imageData = adjustBrightness(imageData, brightness);
      }

      if (contrast !== 0) {
        imageData = adjustContrast(imageData, contrast);
      }

      if (saturation !== 0) {
        imageData = adjustSaturation(imageData, saturation);
      }

      if (hue !== 0) {
        imageData = adjustHue(imageData, hue);
      }

      if (isInverted) {
        imageData = invertColors(imageData);
      }

      if (blurRadius > 0) {
        imageData = applyBlur(imageData, Math.round(blurRadius));
      }

      if (sharpenAmount > 0) {
        imageData = applySharpen(imageData, sharpenAmount);
      }

      // Update layer canvas
      putImageData(activeLayer.canvas, imageData);

      // Trigger re-render
      updateLayer(activeLayer.id, { canvas: activeLayer.canvas });
    } catch (error) {
      logger.error('ImageProcessingPanel', 'Failed to apply filters', error);
    } finally {
      setIsApplying(false);
    }
  }, [
    activeLayer,
    originalImageData,
    brightness,
    contrast,
    saturation,
    hue,
    isInverted,
    blurRadius,
    sharpenAmount,
    isApplying,
    updateLayer,
  ]);

  // Debounced filter application
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      applyAllFilters();
    }, 100); // 100ms debounce

    return () => clearTimeout(timeoutId);
  }, [applyAllFilters]);

  // Apply crop to content
  const handleCropToContent = () => {
    if (!(activeLayer && originalImageData)) return;

    try {
      const cropped = cropToContent(originalImageData, cropThreshold);

      // Update original image data to cropped version
      setOriginalImageData(cropped);

      // Update canvas size
      activeLayer.canvas.width = cropped.width;
      activeLayer.canvas.height = cropped.height;
      putImageData(activeLayer.canvas, cropped);

      updateLayer(activeLayer.id, { canvas: activeLayer.canvas });
      pushHistory('Crop to Content');
    } catch (error) {
      logger.error('ImageProcessingPanel', 'Failed to crop', error);
    }
  };

  // Apply padding
  const handleAddPadding = () => {
    if (!(activeLayer && originalImageData) || paddingSize === 0) return;

    try {
      const padded = addPadding(originalImageData, paddingSize, paddingColor);

      // Update original image data to padded version
      setOriginalImageData(padded);

      // Update canvas size
      activeLayer.canvas.width = padded.width;
      activeLayer.canvas.height = padded.height;
      putImageData(activeLayer.canvas, padded);

      updateLayer(activeLayer.id, { canvas: activeLayer.canvas });
      pushHistory('Add Padding');

      // Reset padding
      setPaddingSize(0);
    } catch (error) {
      logger.error('ImageProcessingPanel', 'Failed to add padding', error);
    }
  };

  // Apply edge detection
  const handleDetectEdges = () => {
    if (!(activeLayer && originalImageData)) return;

    try {
      const edges = detectEdges(originalImageData);
      setOriginalImageData(edges);
      putImageData(activeLayer.canvas, edges);
      updateLayer(activeLayer.id, { canvas: activeLayer.canvas });
      pushHistory('Detect Edges');
    } catch (error) {
      logger.error('ImageProcessingPanel', 'Failed to detect edges', error);
    }
  };

  // Apply anti-aliasing
  const handleAntiAlias = () => {
    if (!(activeLayer && originalImageData)) return;

    try {
      const smoothed = applyAntiAliasing(originalImageData);
      setOriginalImageData(smoothed);
      putImageData(activeLayer.canvas, smoothed);
      updateLayer(activeLayer.id, { canvas: activeLayer.canvas });
      pushHistory('Anti-Aliasing');
    } catch (error) {
      logger.error('ImageProcessingPanel', 'Failed to apply anti-aliasing', error);
    }
  };

  // Reset all filters
  const handleReset = () => {
    setBrightness(0);
    setContrast(0);
    setSaturation(0);
    setHue(0);
    setIsInverted(false);
    setBlurRadius(0);
    setSharpenAmount(0);
  };

  if (!activeLayer || activeLayer.type !== 'image') {
    return (
      <div className={styles.sidebarSection}>
        <h3 className={styles.sectionTitle}>Image Processing</h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          Select an image layer to apply filters and adjustments
        </p>
      </div>
    );
  }

  return (
    <div className={styles.sidebarSection}>
      <h3 className={styles.sectionTitle}>Image Processing</h3>

      {/* Color Adjustments */}
      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: 'var(--spacing-xs)' }}>
          Brightness: {brightness > 0 ? '+' : ''}
          {brightness}
        </label>
        <input
          type="range"
          min="-100"
          max="100"
          value={brightness}
          onChange={(e) => setBrightness(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: 'var(--spacing-xs)' }}>
          Contrast: {contrast > 0 ? '+' : ''}
          {contrast}
        </label>
        <input
          type="range"
          min="-100"
          max="100"
          value={contrast}
          onChange={(e) => setContrast(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: 'var(--spacing-xs)' }}>
          Saturation: {saturation > 0 ? '+' : ''}
          {saturation}
        </label>
        <input
          type="range"
          min="-100"
          max="100"
          value={saturation}
          onChange={(e) => setSaturation(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: 'var(--spacing-xs)' }}>
          Hue: {hue}°
        </label>
        <input
          type="range"
          min="0"
          max="360"
          value={hue}
          onChange={(e) => setHue(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {/* Effects */}
      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '0.875rem',
            gap: 'var(--spacing-xs)',
          }}
        >
          <input
            type="checkbox"
            checked={isInverted}
            onChange={(e) => setIsInverted(e.target.checked)}
          />
          Invert Colors
        </label>
      </div>

      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: 'var(--spacing-xs)' }}>
          Blur: {blurRadius}px
        </label>
        <input
          type="range"
          min="0"
          max="20"
          value={blurRadius}
          onChange={(e) => setBlurRadius(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: 'var(--spacing-xs)' }}>
          Sharpen: {sharpenAmount.toFixed(1)}
        </label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={sharpenAmount}
          onChange={(e) => setSharpenAmount(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {/* Action Buttons */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-xs)',
          marginTop: 'var(--spacing-md)',
        }}
      >
        <button type="button" className={styles.toolbarButton} onClick={handleDetectEdges}>
          🔍 Detect Edges
        </button>
        <button type="button" className={styles.toolbarButton} onClick={handleAntiAlias}>
          ✨ Anti-Alias
        </button>
        <button type="button" className={styles.toolbarButton} onClick={handleReset}>
          🔄 Reset Filters
        </button>
      </div>

      {/* Crop & Padding */}
      <div
        style={{
          marginTop: 'var(--spacing-lg)',
          paddingTop: 'var(--spacing-md)',
          borderTop: '1px solid var(--color-primary)',
        }}
      >
        <h4 style={{ fontSize: '0.875rem', marginBottom: 'var(--spacing-sm)' }}>Transform</h4>

        <div style={{ marginBottom: 'var(--spacing-md)' }}>
          <label
            style={{ display: 'block', fontSize: '0.75rem', marginBottom: 'var(--spacing-xs)' }}
          >
            Crop Threshold: {cropThreshold}
          </label>
          <input
            type="range"
            min="0"
            max="50"
            value={cropThreshold}
            onChange={(e) => setCropThreshold(Number(e.target.value))}
            style={{ width: '100%', marginBottom: 'var(--spacing-xs)' }}
          />
          <button
            className={styles.toolbarButton}
            onClick={handleCropToContent}
            style={{ width: '100%' }}
          >
            ✂️ Crop to Content
          </button>
        </div>

        <div>
          <label
            style={{ display: 'block', fontSize: '0.75rem', marginBottom: 'var(--spacing-xs)' }}
          >
            Padding: {paddingSize}px
          </label>
          <input
            type="range"
            min="0"
            max="50"
            value={paddingSize}
            onChange={(e) => setPaddingSize(Number(e.target.value))}
            style={{ width: '100%', marginBottom: 'var(--spacing-xs)' }}
          />
          <div
            style={{ display: 'flex', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-xs)' }}
          >
            <input
              type="color"
              value={paddingColor}
              onChange={(e) => setPaddingColor(e.target.value)}
              style={{ width: '40px', height: '32px' }}
            />
            <input
              type="text"
              value={paddingColor}
              onChange={(e) => setPaddingColor(e.target.value)}
              style={{ flex: 1, padding: 'var(--spacing-xs)', fontSize: '0.75rem' }}
            />
          </div>
          <button
            className={styles.toolbarButton}
            onClick={handleAddPadding}
            disabled={paddingSize === 0}
            style={{ width: '100%' }}
          >
            ➕ Add Padding
          </button>
        </div>
      </div>
    </div>
  );
}
