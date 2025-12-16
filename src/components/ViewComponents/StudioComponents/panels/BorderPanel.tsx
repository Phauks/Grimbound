/**
 * Border Panel
 *
 * Panel for configuring border properties on the active layer
 */

import { useState, useEffect } from 'react';
import { useStudio } from '../../../../contexts/StudioContext';
import { logger } from '../../../../ts/utils/logger.js';
import styles from '../../../../styles/components/studio/Studio.module.css';

export function BorderPanel() {
  const { activeLayer, updateLayer, pushHistory } = useStudio();

  // Border state
  const [enabled, setEnabled] = useState(false);
  const [width, setWidth] = useState(5);
  const [color, setColor] = useState('#000000');
  const [style, setStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');

  // Initialize from active layer
  useEffect(() => {
    if (activeLayer && activeLayer.type === 'image') {
      // Extract border settings from layer metadata if available
      const borderData = (activeLayer as any).borderData;
      if (borderData) {
        setEnabled(borderData.enabled ?? false);
        setWidth(borderData.width ?? 5);
        setColor(borderData.color ?? '#000000');
        setStyle(borderData.style ?? 'solid');
      } else {
        // Reset to defaults
        setEnabled(false);
        setWidth(5);
        setColor('#000000');
        setStyle('solid');
      }
    }
  }, [activeLayer?.id]);

  // Apply border to canvas
  const applyBorder = () => {
    if (!activeLayer || activeLayer.type !== 'image') return;

    const canvas = activeLayer.canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      if (enabled) {
        // Save current state
        ctx.save();

        // Set border style
        ctx.strokeStyle = color;
        ctx.lineWidth = width * 2; // Double because stroke is centered on path

        // Set line dash pattern based on style
        if (style === 'dashed') {
          ctx.setLineDash([width * 3, width * 2]); // Dash pattern
        } else if (style === 'dotted') {
          ctx.setLineDash([width, width]); // Dot pattern
        } else {
          ctx.setLineDash([]); // Solid
        }

        // Draw border around canvas edge
        ctx.strokeRect(
          width,
          width,
          canvas.width - width * 2,
          canvas.height - width * 2
        );

        // Restore state
        ctx.restore();
      }

      // Update layer with border metadata
      updateLayer(activeLayer.id, {
        canvas,
        ...(activeLayer as any),
        borderData: { enabled, width, color, style }
      });
    } catch (error) {
      logger.error('BorderPanel', 'Failed to apply border', error);
    }
  };

  // Apply border when settings change
  useEffect(() => {
    if (enabled) {
      const timeoutId = setTimeout(() => {
        applyBorder();
      }, 100); // Debounce
      return () => clearTimeout(timeoutId);
    }
  }, [enabled, width, color, style, activeLayer?.id]);

  // Apply border
  const handleApplyBorder = () => {
    applyBorder();
    pushHistory('Apply Border');
  };

  // Remove border
  const handleRemoveBorder = () => {
    setEnabled(false);
    if (activeLayer && activeLayer.type === 'image') {
      // Reload original image without border
      // This would require storing the pre-border canvas state
      pushHistory('Remove Border');
    }
  };

  if (!activeLayer || activeLayer.type !== 'image') {
    return (
      <div className={styles.sidebarSection}>
        <h3 className={styles.sectionTitle}>Border</h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          Select an image layer to add a border
        </p>
      </div>
    );
  }

  return (
    <div className={styles.sidebarSection}>
      <h3 className={styles.sectionTitle}>Border</h3>

      {/* Enable/Disable Toggle */}
      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.875rem', gap: 'var(--spacing-xs)' }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Enable Border
        </label>
      </div>

      {/* Border Width */}
      <div style={{ marginBottom: 'var(--spacing-md)', opacity: enabled ? 1 : 0.5 }}>
        <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: 'var(--spacing-xs)' }}>
          Width: {width}px
        </label>
        <input
          type="range"
          min="1"
          max="50"
          value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
          disabled={!enabled}
          style={{ width: '100%' }}
        />
      </div>

      {/* Border Color */}
      <div style={{ marginBottom: 'var(--spacing-md)', opacity: enabled ? 1 : 0.5 }}>
        <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: 'var(--spacing-xs)' }}>
          Color
        </label>
        <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            disabled={!enabled}
            style={{ width: '40px', height: '32px' }}
          />
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            disabled={!enabled}
            placeholder="#000000"
            style={{ flex: 1, padding: 'var(--spacing-xs)', fontSize: '0.75rem' }}
          />
        </div>
      </div>

      {/* Border Style */}
      <div style={{ marginBottom: 'var(--spacing-md)', opacity: enabled ? 1 : 0.5 }}>
        <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: 'var(--spacing-xs)' }}>
          Style
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--spacing-xs)' }}>
          <button
            className={`${styles.toolbarButton} ${style === 'solid' ? styles.active : ''}`}
            onClick={() => setStyle('solid')}
            disabled={!enabled}
            style={{ fontSize: '0.75rem' }}
          >
            Solid
          </button>
          <button
            className={`${styles.toolbarButton} ${style === 'dashed' ? styles.active : ''}`}
            onClick={() => setStyle('dashed')}
            disabled={!enabled}
            style={{ fontSize: '0.75rem' }}
          >
            Dashed
          </button>
          <button
            className={`${styles.toolbarButton} ${style === 'dotted' ? styles.active : ''}`}
            onClick={() => setStyle('dotted')}
            disabled={!enabled}
            style={{ fontSize: '0.75rem' }}
          >
            Dotted
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-md)' }}>
        <button
          className={styles.toolbarButton}
          onClick={handleApplyBorder}
          disabled={!enabled}
          style={{ width: '100%' }}
        >
          ✓ Apply Border
        </button>
        <button
          className={styles.toolbarButton}
          onClick={handleRemoveBorder}
          style={{ width: '100%' }}
        >
          ✗ Remove Border
        </button>
      </div>
    </div>
  );
}
