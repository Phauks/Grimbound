/**
 * Font Selector Panel
 *
 * Advanced font customization panel for text layers in Studio
 */

import { useCallback } from 'react';
import { useStudio } from '../../../../contexts/StudioContext';
import styles from '../../../../styles/components/studio/Studio.module.css';
import type { TextLayerData } from '../../../../ts/types/index';

export function FontSelectorPanel() {
  const {
    layers,
    activeLayerId,
    updateLayer,
    toolSettings: _toolSettings,
    setToolSettings: _setToolSettings,
  } = useStudio();

  // Get active text layer
  const activeLayer = layers.find((l) => l.id === activeLayerId);
  const isTextLayer = activeLayer?.type === 'text';
  const textData = isTextLayer ? (activeLayer.data as TextLayerData) : null;

  // Available fonts (from the codebase)
  const AVAILABLE_FONTS = [
    { value: 'LHF Unlovable', label: 'Unlovable', category: 'Display' },
    { value: 'Dumbledor', label: 'Dumbledor', category: 'Display' },
    { value: 'TradeGothic', label: 'Trade Gothic', category: 'Sans-Serif' },
    { value: 'Georgia', label: 'Georgia', category: 'Serif' },
    { value: 'Arial', label: 'Arial', category: 'Sans-Serif' },
    { value: 'Times New Roman', label: 'Times New Roman', category: 'Serif' },
    { value: 'Courier New', label: 'Courier New', category: 'Monospace' },
  ];

  const handleFontChange = useCallback(
    (font: string) => {
      if (!(activeLayerId && isTextLayer && activeLayer)) return;

      updateLayer(activeLayerId, {
        data: {
          ...(activeLayer.data as TextLayerData),
          font,
        },
      });
    },
    [activeLayerId, isTextLayer, activeLayer, updateLayer]
  );

  const handleFontSizeChange = useCallback(
    (fontSize: number) => {
      if (!(activeLayerId && isTextLayer && activeLayer)) return;

      updateLayer(activeLayerId, {
        data: {
          ...(activeLayer.data as TextLayerData),
          fontSize,
        },
      });
    },
    [activeLayerId, isTextLayer, activeLayer, updateLayer]
  );

  const handleLetterSpacingChange = useCallback(
    (letterSpacing: number) => {
      if (!(activeLayerId && isTextLayer && activeLayer)) return;

      updateLayer(activeLayerId, {
        data: {
          ...(activeLayer.data as TextLayerData),
          letterSpacing,
        },
      });
    },
    [activeLayerId, isTextLayer, activeLayer, updateLayer]
  );

  const handleAlignmentChange = useCallback(
    (alignment: 'left' | 'center' | 'right') => {
      if (!(activeLayerId && isTextLayer && activeLayer)) return;

      updateLayer(activeLayerId, {
        data: {
          ...(activeLayer.data as TextLayerData),
          alignment,
        },
      });
    },
    [activeLayerId, isTextLayer, activeLayer, updateLayer]
  );

  const handleColorChange = useCallback(
    (color: string) => {
      if (!(activeLayerId && isTextLayer && activeLayer)) return;

      updateLayer(activeLayerId, {
        data: {
          ...(activeLayer.data as TextLayerData),
          color,
        },
      });
    },
    [activeLayerId, isTextLayer, activeLayer, updateLayer]
  );

  if (!(isTextLayer && textData)) {
    return (
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <h3>Font Settings</h3>
        </div>
        <div className={styles.panelBody}>
          <div
            style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-secondary)' }}
          >
            Select a text layer to edit font settings
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h3>Font Settings</h3>
      </div>
      <div className={styles.panelBody}>
        {/* Font Family */}
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>Font Family</label>
          <select
            value={textData.font}
            onChange={(e) => handleFontChange(e.target.value)}
            className={styles.select}
          >
            <optgroup label="Display Fonts">
              {AVAILABLE_FONTS.filter((f) => f.category === 'Display').map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Sans-Serif">
              {AVAILABLE_FONTS.filter((f) => f.category === 'Sans-Serif').map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Serif">
              {AVAILABLE_FONTS.filter((f) => f.category === 'Serif').map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Monospace">
              {AVAILABLE_FONTS.filter((f) => f.category === 'Monospace').map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Font Size */}
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>Font Size: {textData.fontSize}pt</label>
          <input
            type="range"
            min="8"
            max="200"
            step="1"
            value={textData.fontSize}
            onChange={(e) => handleFontSizeChange(Number(e.target.value))}
            className={styles.slider}
          />
          <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
            <button
              type="button"
              className={styles.smallButton}
              onClick={() => handleFontSizeChange(textData.fontSize - 1)}
              disabled={textData.fontSize <= 8}
            >
              -
            </button>
            <input
              type="number"
              min="8"
              max="200"
              value={textData.fontSize}
              onChange={(e) => handleFontSizeChange(Number(e.target.value))}
              className={styles.input}
              style={{ flex: 1, textAlign: 'center' }}
            />
            <button
              type="button"
              className={styles.smallButton}
              onClick={() => handleFontSizeChange(textData.fontSize + 1)}
              disabled={textData.fontSize >= 200}
            >
              +
            </button>
          </div>
        </div>

        {/* Letter Spacing */}
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>
            Letter Spacing: {textData.letterSpacing || 0}px
          </label>
          <input
            type="range"
            min="-10"
            max="50"
            step="0.5"
            value={textData.letterSpacing || 0}
            onChange={(e) => handleLetterSpacingChange(Number(e.target.value))}
            className={styles.slider}
          />
        </div>

        {/* Text Alignment */}
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>Alignment</label>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              className={textData.alignment === 'left' ? styles.activeButton : styles.button}
              onClick={() => handleAlignmentChange('left')}
              style={{ flex: 1 }}
            >
              ⬅ Left
            </button>
            <button
              type="button"
              className={textData.alignment === 'center' ? styles.activeButton : styles.button}
              onClick={() => handleAlignmentChange('center')}
              style={{ flex: 1 }}
            >
              ⬌ Center
            </button>
            <button
              type="button"
              className={textData.alignment === 'right' ? styles.activeButton : styles.button}
              onClick={() => handleAlignmentChange('right')}
              style={{ flex: 1 }}
            >
              ➡ Right
            </button>
          </div>
        </div>

        {/* Text Color */}
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>Text Color</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="color"
              value={textData.color}
              onChange={(e) => handleColorChange(e.target.value)}
              style={{
                width: '60px',
                height: '40px',
                border: 'none',
                borderRadius: 'var(--border-radius-sm)',
                cursor: 'pointer',
              }}
            />
            <input
              type="text"
              value={textData.color}
              onChange={(e) => handleColorChange(e.target.value)}
              className={styles.input}
              style={{ flex: 1 }}
              placeholder="#FFFFFF"
            />
          </div>
        </div>

        {/* Preview */}
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>Preview</label>
          <div
            style={{
              padding: '24px',
              backgroundColor: 'var(--color-background-secondary)',
              borderRadius: 'var(--border-radius-md)',
              textAlign: textData.alignment,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                fontFamily: textData.font,
                fontSize: `${Math.min(textData.fontSize, 48)}px`,
                color: textData.color,
                letterSpacing: `${textData.letterSpacing || 0}px`,
              }}
            >
              {textData.text || 'Sample Text'}
            </div>
          </div>
        </div>

        {/* Quick Presets */}
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>Quick Presets</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            <button
              type="button"
              className={styles.button}
              onClick={() => {
                handleFontChange('LHF Unlovable');
                handleFontSizeChange(72);
              }}
            >
              Title
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => {
                handleFontChange('Georgia');
                handleFontSizeChange(32);
              }}
            >
              Subtitle
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => {
                handleFontChange('TradeGothic');
                handleFontSizeChange(16);
              }}
            >
              Body
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => {
                handleFontChange('Courier New');
                handleFontSizeChange(14);
              }}
            >
              Code
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
