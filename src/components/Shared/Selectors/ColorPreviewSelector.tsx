/**
 * ColorPreviewSelector Component
 *
 * A compact color selector with a clickable swatch that opens a full
 * color picker panel with HSV sliders, presets, and recent colors.
 *
 * Features:
 * - Clickable color swatch (no separate button)
 * - HSV sliders with canvas-based gradients
 * - Quick preset color swatches organized in a grid
 * - Recent colors tracking
 * - Apply/Cancel workflow for controlled changes
 * - Portal-based panel to avoid overflow clipping
 *
 * @module components/Shared/ColorPreviewSelector
 */

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { drawSliderToggle } from '@/components/Shared/Controls/CanvasSlider';
import { useExpandablePanel, useRecentColors } from '@/hooks';
import styles from '@/styles/components/shared/ColorPreviewSelector.module.css';
import baseStyles from '@/styles/components/shared/SettingsSelectorBase.module.css';
import {
  BASIC_COLORS,
  type ColorPreset,
  DEFAULT_COLOR_PRESETS,
} from '@/ts/constants/colorPresets.js';
import {
  hexToHsv,
  hsvToHex,
  isLightColor,
  parseHexColor,
  rgbToHex,
} from '@/ts/utils/colorUtils.js';

// Check if EyeDropper API is supported (Chrome/Edge only)
const isEyeDropperSupported = typeof window !== 'undefined' && 'EyeDropper' in window;

// ============================================================================
// Types
// ============================================================================

export interface ColorPreviewSelectorProps {
  /** Current color value (hex format) */
  value: string;
  /** Called when color is applied */
  onChange: (value: string) => void;
  /** Called on every change for live preview (optional) */
  onPreviewChange?: (value: string) => void;
  /** Display label (shown next to the swatch) */
  label?: string;
  /** Component size */
  size?: 'small' | 'medium' | 'large';
  /** Disabled state */
  disabled?: boolean;
}

// ============================================================================
// Color Preview Component
// ============================================================================

const ColorSwatch = memo(function ColorSwatch({
  color,
  size,
  onClick,
  disabled,
}: {
  color: string;
  size: 'small' | 'medium' | 'large';
  onClick: () => void;
  disabled: boolean;
}) {
  const isLight = isLightColor(color);

  const swatchClasses = [
    styles.clickableSwatch,
    styles[`swatch${size.charAt(0).toUpperCase()}${size.slice(1)}`],
    disabled && styles.swatchDisabled,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={swatchClasses}
      style={{ backgroundColor: color }}
      onClick={onClick}
      disabled={disabled}
      aria-label="Select color"
    >
      {isLight && <div className={styles.swatchBorder} />}
    </button>
  );
});

// ============================================================================
// Component
// ============================================================================

export const ColorPreviewSelector = memo(function ColorPreviewSelector({
  value,
  onChange,
  onPreviewChange,
  label,
  size = 'medium',
  disabled = false,
}: ColorPreviewSelectorProps) {
  const hueSliderRef = useRef<HTMLCanvasElement>(null);
  const satSliderRef = useRef<HTMLCanvasElement>(null);
  const valueSliderRef = useRef<HTMLCanvasElement>(null);

  // Use the recent colors hook
  const { colors: recentColors, addColor: addRecentColor } = useRecentColors();

  // Local state for color editing
  const [hexInput, setHexInput] = useState(value);
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [brightness, setBrightness] = useState(100);
  const [rgbInputs, setRgbInputs] = useState({ r: '255', g: '255', b: '255' });
  const [hsvInputs, setHsvInputs] = useState({ h: '0', s: '100', v: '100' });

  // Default color for reset
  const defaultColor = '#FFFFFF';

  // Wrap onChange to track recent colors
  const handleApply = useCallback(
    (color: string) => {
      addRecentColor(color);
      onChange(color);
    },
    [onChange, addRecentColor]
  );

  // Use the shared expandable panel hook
  const panel = useExpandablePanel<string>({
    value,
    onChange: handleApply,
    onPreviewChange,
    disabled,
    panelHeight: 400,
    minPanelWidth: 420,
  });

  // Sync hex input, hue, saturation, brightness, and RGB when panel opens
  useEffect(() => {
    if (panel.isExpanded) {
      setHexInput(panel.pendingValue);
      const hsv = hexToHsv(panel.pendingValue);
      setHue(hsv.h);
      setSaturation(hsv.s);
      setBrightness(hsv.v);
      setHsvInputs({
        h: String(Math.round(hsv.h)),
        s: String(Math.round(hsv.s)),
        v: String(Math.round(hsv.v)),
      });
      const rgb = parseHexColor(panel.pendingValue);
      setRgbInputs({ r: String(rgb.r), g: String(rgb.g), b: String(rgb.b) });
    }
  }, [panel.isExpanded, panel.pendingValue]);

  // Track which slider is being dragged
  const [draggingSlider, setDraggingSlider] = useState<'hue' | 'sat' | 'val' | null>(null);

  // Draw the Hue slider gradient with toggle (deferred to ensure portal is in DOM)
  useEffect(() => {
    if (!panel.isExpanded) return;

    const rafId = requestAnimationFrame(() => {
      const canvas = hueSliderRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // Draw rainbow gradient horizontally (full saturation, full value)
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      for (let i = 0; i <= 360; i += 60) {
        gradient.addColorStop(i / 360, hsvToHex(i, 100, 100));
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Draw toggle at current hue position
      const toggleX = (hue / 360) * width;
      drawSliderToggle(ctx, toggleX, height);
    });

    return () => cancelAnimationFrame(rafId);
  }, [panel.isExpanded, hue]);

  // Draw the Saturation slider gradient with toggle (deferred to ensure portal is in DOM)
  useEffect(() => {
    if (!panel.isExpanded) return;

    const rafId = requestAnimationFrame(() => {
      const canvas = satSliderRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // Gradient from white (0% sat) to full color (100% sat) at full value
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, hsvToHex(hue, 0, 100));
      gradient.addColorStop(1, hsvToHex(hue, 100, 100));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Draw toggle at current saturation position
      const toggleX = (saturation / 100) * width;
      drawSliderToggle(ctx, toggleX, height);
    });

    return () => cancelAnimationFrame(rafId);
  }, [panel.isExpanded, hue, saturation]);

  // Draw the Value (brightness) slider gradient with toggle (deferred to ensure portal is in DOM)
  useEffect(() => {
    if (!panel.isExpanded) return;

    const rafId = requestAnimationFrame(() => {
      const canvas = valueSliderRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // Gradient from black (0% value) to full color (100% value)
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, hsvToHex(hue, saturation, 0));
      gradient.addColorStop(1, hsvToHex(hue, saturation, 100));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Draw toggle at current brightness/value position
      const toggleX = (brightness / 100) * width;
      drawSliderToggle(ctx, toggleX, height);
    });

    return () => cancelAnimationFrame(rafId);
  }, [panel.isExpanded, hue, saturation, brightness]);

  // Handle global mouse events for slider dragging
  useEffect(() => {
    if (!draggingSlider) return;

    const handleMouseMove = (e: MouseEvent) => {
      let canvas: HTMLCanvasElement | null = null;
      if (draggingSlider === 'hue') canvas = hueSliderRef.current;
      else if (draggingSlider === 'sat') canvas = satSliderRef.current;
      else if (draggingSlider === 'val') canvas = valueSliderRef.current;

      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const ratio = x / rect.width;

      // During drag: only update local state, NOT panel.updatePending (to avoid triggering preview on every move)
      if (draggingSlider === 'hue') {
        const newHue = ratio * 360;
        setHue(newHue);
        setHsvInputs((prev) => ({ ...prev, h: String(Math.round(newHue)) }));
        const hex = hsvToHex(newHue, saturation, brightness);
        setHexInput(hex);
        const rgb = parseHexColor(hex);
        setRgbInputs({ r: String(rgb.r), g: String(rgb.g), b: String(rgb.b) });
      } else if (draggingSlider === 'sat') {
        const newSat = ratio * 100;
        setSaturation(newSat);
        setHsvInputs((prev) => ({ ...prev, s: String(Math.round(newSat)) }));
        const hex = hsvToHex(hue, newSat, brightness);
        setHexInput(hex);
        const rgb = parseHexColor(hex);
        setRgbInputs({ r: String(rgb.r), g: String(rgb.g), b: String(rgb.b) });
      } else if (draggingSlider === 'val') {
        const newVal = ratio * 100;
        setBrightness(newVal);
        setHsvInputs((prev) => ({ ...prev, v: String(Math.round(newVal)) }));
        const hex = hsvToHex(hue, saturation, newVal);
        setHexInput(hex);
        const rgb = parseHexColor(hex);
        setRgbInputs({ r: String(rgb.r), g: String(rgb.g), b: String(rgb.b) });
      }
    };

    const handleMouseUp = () => {
      // On release: update panel pending value and trigger preview
      const finalColor = hsvToHex(hue, saturation, brightness);
      panel.updatePending(finalColor);
      setDraggingSlider(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingSlider, hue, saturation, brightness, panel]);

  // Update all state from a hex color
  const updateFromHex = useCallback(
    (hex: string) => {
      panel.updatePending(hex);
      setHexInput(hex);
      const hsv = hexToHsv(hex);
      setHue(hsv.h);
      setSaturation(hsv.s);
      setBrightness(hsv.v);
      setHsvInputs({
        h: String(Math.round(hsv.h)),
        s: String(Math.round(hsv.s)),
        v: String(Math.round(hsv.v)),
      });
      const rgb = parseHexColor(hex);
      setRgbInputs({ r: String(rgb.r), g: String(rgb.g), b: String(rgb.b) });
    },
    [panel]
  );

  // Update color from HSV values
  const updateFromHsv = useCallback(
    (h: number, s: number, v: number) => {
      const hex = hsvToHex(h, s, v);
      panel.updatePending(hex);
      setHexInput(hex);
      setHue(h);
      setSaturation(s);
      setBrightness(v);
      setHsvInputs({
        h: String(Math.round(h)),
        s: String(Math.round(s)),
        v: String(Math.round(v)),
      });
      const rgb = parseHexColor(hex);
      setRgbInputs({ r: String(rgb.r), g: String(rgb.g), b: String(rgb.b) });
    },
    [panel]
  );

  // Handle mousedown on the Hue slider (starts drag)
  const handleHueSliderMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = hueSliderRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const newHue = (x / rect.width) * 360;
      updateFromHsv(newHue, saturation, brightness);
      setDraggingSlider('hue');
    },
    [saturation, brightness, updateFromHsv]
  );

  // Handle mousedown on the Saturation slider (starts drag)
  const handleSatSliderMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = satSliderRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const newSat = (x / rect.width) * 100;
      updateFromHsv(hue, newSat, brightness);
      setDraggingSlider('sat');
    },
    [hue, brightness, updateFromHsv]
  );

  // Handle mousedown on the Value slider (starts drag)
  const handleValueSliderMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = valueSliderRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const newValue = (x / rect.width) * 100;
      updateFromHsv(hue, saturation, newValue);
      setDraggingSlider('val');
    },
    [hue, saturation, updateFromHsv]
  );

  // Handle HSV input changes
  const handleHsvInputChange = useCallback(
    (channel: 'h' | 's' | 'v', val: string) => {
      const newHsv = { ...hsvInputs, [channel]: val };
      setHsvInputs(newHsv);

      const h = parseFloat(newHsv.h);
      const s = parseFloat(newHsv.s);
      const v = parseFloat(newHsv.v);

      if (!(Number.isNaN(h) || Number.isNaN(s) || Number.isNaN(v))) {
        const clampedH = Math.max(0, Math.min(360, h));
        const clampedS = Math.max(0, Math.min(100, s));
        const clampedV = Math.max(0, Math.min(100, v));

        const hex = hsvToHex(clampedH, clampedS, clampedV);
        panel.updatePending(hex);
        setHexInput(hex);
        setHue(clampedH);
        setSaturation(clampedS);
        setBrightness(clampedV);
        const rgb = parseHexColor(hex);
        setRgbInputs({ r: String(rgb.r), g: String(rgb.g), b: String(rgb.b) });
      }
    },
    [hsvInputs, panel]
  );

  // Handle hex input change
  const handleHexInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value.toUpperCase();
      if (val && !val.startsWith('#')) {
        val = `#${val}`;
      }
      setHexInput(val);

      if (/^#[0-9A-F]{6}$/i.test(val)) {
        updateFromHex(val);
      }
    },
    [updateFromHex]
  );

  // Handle RGB input changes
  const handleRgbChange = useCallback(
    (channel: 'r' | 'g' | 'b', val: string) => {
      const newRgb = { ...rgbInputs, [channel]: val };
      setRgbInputs(newRgb);

      const r = parseInt(newRgb.r, 10);
      const g = parseInt(newRgb.g, 10);
      const b = parseInt(newRgb.b, 10);

      if (!(Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b))) {
        if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
          const hex = rgbToHex(r, g, b);
          panel.updatePending(hex);
          setHexInput(hex);
          const hsv = hexToHsv(hex);
          setHue(hsv.h);
          setSaturation(hsv.s);
          setBrightness(hsv.v);
          setHsvInputs({
            h: String(Math.round(hsv.h)),
            s: String(Math.round(hsv.s)),
            v: String(Math.round(hsv.v)),
          });
        }
      }
    },
    [rgbInputs, panel]
  );

  const displayColor = panel.isExpanded ? panel.pendingValue : value;

  // Handle preset selection
  const handlePresetClick = useCallback(
    (presetValue: string) => {
      updateFromHex(presetValue);
    },
    [updateFromHex]
  );

  // Handle EyeDropper color picker
  const handleEyeDropper = useCallback(async () => {
    if (!isEyeDropperSupported) return;

    try {
      // @ts-expect-error - EyeDropper API not in TypeScript types yet
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      if (result?.sRGBHex) {
        updateFromHex(result.sRGBHex.toUpperCase());
      }
    } catch {
      // User cancelled or error - do nothing
    }
  }, [updateFromHex]);

  // Handle randomize color
  const handleRandomize = useCallback(() => {
    const randomHex = `#${Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, '0')
      .toUpperCase()}`;
    updateFromHex(randomHex);
  }, [updateFromHex]);

  // Use hexInput for display during dragging (it updates live), fall back to panel.pendingValue
  const displayPendingColor = hexInput || panel.pendingValue;
  const pendingIsLight = isLightColor(displayPendingColor);

  // Render expanded panel via portal
  const renderPanel = () => {
    if (!(panel.isExpanded && panel.panelPosition)) return null;

    const panelStyle: React.CSSProperties = {
      position: 'fixed',
      top: panel.panelPosition.openUpward ? 'auto' : panel.panelPosition.top,
      bottom: panel.panelPosition.openUpward
        ? window.innerHeight - panel.panelPosition.top
        : 'auto',
      left: panel.panelPosition.left,
      width: panel.panelPosition.width,
      zIndex: 10000,
    };

    return createPortal(
      <div
        ref={panel.panelRef}
        className={`${baseStyles.panel} ${panel.panelPosition.openUpward ? baseStyles.panelUpward : ''}`}
        style={panelStyle}
      >
        {/* Two-column layout */}
        <div className={styles.pickerContent}>
          {/* Left column: Basic colors + Recent */}
          <div className={styles.pickerLeft}>
            <span className={styles.pickerLabel}>Basic colors:</span>
            <div className={styles.basicGrid}>
              {BASIC_COLORS.map((color) => {
                const colorIsLight = isLightColor(color);
                const isSelected = color.toUpperCase() === panel.pendingValue.toUpperCase();
                return (
                  <button
                    key={color}
                    type="button"
                    className={`${styles.gridSwatch} ${colorIsLight ? styles.gridSwatchLight : ''} ${isSelected ? styles.gridSwatchSelected : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => handlePresetClick(color)}
                    title={color}
                  />
                );
              })}
            </div>

            {/* Recent colors */}
            <span className={styles.pickerLabel}>Recent:</span>
            <div className={styles.recentGrid}>
              {recentColors.length > 0 ? (
                recentColors.map((color) => {
                  const colorIsLight = isLightColor(color);
                  const isSelected = color.toUpperCase() === panel.pendingValue.toUpperCase();
                  return (
                    <button
                      key={`recent-${color}`}
                      type="button"
                      className={`${styles.gridSwatch} ${colorIsLight ? styles.gridSwatchLight : ''} ${isSelected ? styles.gridSwatchSelected : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => handlePresetClick(color)}
                      title={color}
                    />
                  );
                })
              ) : (
                <span className={styles.emptyRecent}>None yet</span>
              )}
            </div>
          </div>

          {/* Right column: Current color + HSV sliders + RGB inputs */}
          <div className={styles.pickerRight}>
            {/* Current color + Hex + eyedropper */}
            <div className={styles.currentRow}>
              <div
                className={`${styles.currentSwatch} ${pendingIsLight ? styles.gridSwatchLight : ''}`}
                style={{ backgroundColor: displayPendingColor }}
              />
              <input
                type="text"
                className={styles.hexInput}
                value={hexInput}
                onChange={handleHexInputChange}
                placeholder="#FFFFFF"
                maxLength={7}
              />
              {isEyeDropperSupported && (
                <button
                  type="button"
                  className={styles.eyedropperBtn}
                  onClick={handleEyeDropper}
                  title="Pick color from screen"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                  >
                    <path d="M13.354.646a1.207 1.207 0 0 0-1.708 0L8.5 3.793l-.646-.647a.5.5 0 1 0-.708.708L8.293 5l-7.147 7.146A.5.5 0 0 0 1 12.5v1.793l-.854.853a.5.5 0 1 0 .708.707L1.707 15H3.5a.5.5 0 0 0 .354-.146L11 7.707l1.146 1.147a.5.5 0 0 0 .708-.708l-.647-.646 3.147-3.146a1.207 1.207 0 0 0 0-1.708zM2 12.707l7-7L10.293 7l-7 7H2z" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                className={styles.eyedropperBtn}
                onClick={handleRandomize}
                title="Random color"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                >
                  <path d="M3 0a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V3a3 3 0 0 0-3-3zm2.5 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m8 8a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0M8 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3" />
                </svg>
              </button>
            </div>

            {/* HSV Sliders */}
            <div className={styles.hslSliders}>
              <div className={styles.sliderRow}>
                <span className={styles.sliderLabel}>H</span>
                <canvas
                  ref={hueSliderRef}
                  className={styles.sliderTrack}
                  width={120}
                  height={16}
                  onMouseDown={handleHueSliderMouseDown}
                  style={{ cursor: draggingSlider === 'hue' ? 'grabbing' : 'pointer' }}
                />
                <input
                  type="number"
                  className={styles.sliderInput}
                  value={hsvInputs.h}
                  onChange={(e) => handleHsvInputChange('h', e.target.value)}
                  min={0}
                  max={360}
                />
              </div>
              <div className={styles.sliderRow}>
                <span className={styles.sliderLabel}>S</span>
                <canvas
                  ref={satSliderRef}
                  className={styles.sliderTrack}
                  width={120}
                  height={16}
                  onMouseDown={handleSatSliderMouseDown}
                  style={{ cursor: draggingSlider === 'sat' ? 'grabbing' : 'pointer' }}
                />
                <input
                  type="number"
                  className={styles.sliderInput}
                  value={hsvInputs.s}
                  onChange={(e) => handleHsvInputChange('s', e.target.value)}
                  min={0}
                  max={100}
                />
              </div>
              <div className={styles.sliderRow}>
                <span className={styles.sliderLabel}>V</span>
                <canvas
                  ref={valueSliderRef}
                  className={styles.sliderTrack}
                  width={120}
                  height={16}
                  onMouseDown={handleValueSliderMouseDown}
                  style={{ cursor: draggingSlider === 'val' ? 'grabbing' : 'pointer' }}
                />
                <input
                  type="number"
                  className={styles.sliderInput}
                  value={hsvInputs.v}
                  onChange={(e) => handleHsvInputChange('v', e.target.value)}
                  min={0}
                  max={100}
                />
              </div>
            </div>

            {/* RGB inputs */}
            <div className={styles.rgbRow}>
              <label className={styles.rgbLabel}>
                R
                <input
                  type="number"
                  className={styles.rgbInput}
                  value={rgbInputs.r}
                  onChange={(e) => handleRgbChange('r', e.target.value)}
                  min={0}
                  max={255}
                />
              </label>
              <label className={styles.rgbLabel}>
                G
                <input
                  type="number"
                  className={styles.rgbInput}
                  value={rgbInputs.g}
                  onChange={(e) => handleRgbChange('g', e.target.value)}
                  min={0}
                  max={255}
                />
              </label>
              <label className={styles.rgbLabel}>
                B
                <input
                  type="number"
                  className={styles.rgbInput}
                  value={rgbInputs.b}
                  onChange={(e) => handleRgbChange('b', e.target.value)}
                  min={0}
                  max={255}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Panel Footer */}
        <div className={styles.pickerFooter}>
          <button
            type="button"
            className={baseStyles.resetLink}
            onClick={() => panel.reset(defaultColor)}
          >
            Reset
          </button>
          <div className={baseStyles.panelActions}>
            <button type="button" className={styles.pickerCancelBtn} onClick={panel.cancel}>
              Cancel
            </button>
            <button type="button" className={styles.pickerApplyBtn} onClick={panel.apply}>
              Apply
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div ref={panel.containerRef} className={styles.colorPickerContainer}>
      {label && <span className={styles.swatchLabel}>{label}</span>}
      <ColorSwatch color={displayColor} size={size} onClick={panel.toggle} disabled={disabled} />
      {renderPanel()}
    </div>
  );
});

// Re-export types and presets for backwards compatibility
export { DEFAULT_COLOR_PRESETS as DEFAULT_PRESETS };
export type { ColorPreset };

export default ColorPreviewSelector;
