/**
 * Preset Panel
 *
 * Panel for applying character alignment color presets
 */

import { useState } from 'react';
import { useStudio } from '../../../../contexts/StudioContext';
import styles from '../../../../styles/components/studio/Studio.module.css';
import { getImageData, putImageData } from '../../../../ts/studio/canvasOperations';
import { applyCharacterPreset, CHARACTER_PRESETS } from '../../../../ts/studio/characterPresets';
import { logger } from '../../../../ts/utils/logger.js';

export function PresetPanel() {
  const { activeLayer, updateLayer, pushHistory } = useStudio();

  // State
  const [intensity, setIntensity] = useState(1.0);
  const [isApplying, setIsApplying] = useState(false);
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);
  const [lastPresetId, setLastPresetId] = useState<string | null>(null);

  // Apply preset to active layer
  const handleApplyPreset = async (presetId: string) => {
    if (!activeLayer || activeLayer.type !== 'image') return;

    setIsApplying(true);

    try {
      // Get current image data
      const imageData = getImageData(activeLayer.canvas);

      // Store original for reset if this is the first preset application
      if (!originalImageData) {
        setOriginalImageData(
          new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height)
        );
      }

      // Find preset
      const preset = CHARACTER_PRESETS.find((p) => p.id === presetId);
      if (!preset) {
        logger.error('PresetPanel', 'Preset not found:', presetId);
        return;
      }

      // Apply preset
      const recolored = applyCharacterPreset(originalImageData || imageData, preset, intensity);

      // Apply result to canvas
      putImageData(activeLayer.canvas, recolored);

      // Update layer
      updateLayer(activeLayer.id, { canvas: activeLayer.canvas });
      pushHistory(`Apply ${preset.displayName} Preset`);

      // Track last preset for re-application when intensity changes
      setLastPresetId(presetId);
    } catch (err) {
      logger.error('PresetPanel', 'Failed to apply preset', err);
    } finally {
      setIsApplying(false);
    }
  };

  // Reset to original image
  const handleReset = () => {
    if (!(activeLayer && originalImageData)) return;

    putImageData(activeLayer.canvas, originalImageData);
    updateLayer(activeLayer.id, { canvas: activeLayer.canvas });
    setOriginalImageData(null);
    setLastPresetId(null);
    pushHistory('Reset Color Preset');
  };

  // Re-apply last preset when intensity changes
  const handleIntensityChange = (newIntensity: number) => {
    setIntensity(newIntensity);

    // Re-apply last preset with new intensity
    if (lastPresetId && originalImageData && activeLayer) {
      const preset = CHARACTER_PRESETS.find((p) => p.id === lastPresetId);
      if (!preset) return;

      const recolored = applyCharacterPreset(originalImageData, preset, newIntensity);
      putImageData(activeLayer.canvas, recolored);
      updateLayer(activeLayer.id, { canvas: activeLayer.canvas });
    }
  };

  if (!activeLayer || activeLayer.type !== 'image') {
    return (
      <div className={styles.sidebarSection}>
        <h3 className={styles.sectionTitle}>Character Presets</h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          Select an image layer to apply presets
        </p>
      </div>
    );
  }

  return (
    <div className={styles.sidebarSection}>
      <h3 className={styles.sectionTitle}>Character Presets</h3>

      <p
        style={{
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          marginBottom: 'var(--spacing-md)',
        }}
      >
        Apply character alignment colors to your image
      </p>

      {/* Intensity Slider */}
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: 'var(--spacing-xs)' }}>
          Intensity: {(intensity * 100).toFixed(0)}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={intensity * 100}
          onChange={(e) => handleIntensityChange(Number(e.target.value) / 100)}
          disabled={isApplying}
          style={{ width: '100%' }}
        />
        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Lower = more subtle effect
        </p>
      </div>

      {/* Preset Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 'var(--spacing-sm)',
          marginBottom: 'var(--spacing-lg)',
        }}
      >
        {CHARACTER_PRESETS.map((preset) => (
          <button
            type="button"
            key={preset.id}
            className={styles.toolbarButton}
            onClick={() => handleApplyPreset(preset.id)}
            disabled={isApplying}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--spacing-xs)',
              padding: 'var(--spacing-sm)',
              fontSize: '0.75rem',
              opacity: lastPresetId === preset.id ? 1 : 0.8,
              borderColor: lastPresetId === preset.id ? 'var(--color-primary)' : 'transparent',
              borderWidth: '2px',
              borderStyle: 'solid',
            }}
          >
            {/* Color Indicator */}
            <div
              style={{
                width: '100%',
                height: '32px',
                borderRadius: 'var(--border-radius-sm)',
                background: preset.colors.secondary
                  ? `linear-gradient(to bottom, ${preset.colors.primary}, ${preset.colors.secondary})`
                  : preset.colors.primary,
                border: '1px solid var(--color-primary)',
              }}
            />

            {/* Preset Name */}
            <span style={{ fontWeight: lastPresetId === preset.id ? 'bold' : 'normal' }}>
              {preset.displayName}
            </span>
          </button>
        ))}
      </div>

      {/* Reset Button */}
      {originalImageData && (
        <div
          style={{ paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-primary)' }}
        >
          <button
            type="button"
            className={styles.toolbarButton}
            onClick={handleReset}
            style={{ width: '100%' }}
          >
            🔄 Reset to Original Colors
          </button>
        </div>
      )}

      {/* Info */}
      <div
        style={{
          marginTop: 'var(--spacing-md)',
          paddingTop: 'var(--spacing-md)',
          borderTop: '1px solid var(--color-primary)',
        }}
      >
        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
          <strong>How it works:</strong> Converts image to grayscale, then applies character
          alignment colors as an overlay.
        </p>
        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Presets with two colors use a gradient effect from top to bottom.
        </p>
      </div>
    </div>
  );
}
