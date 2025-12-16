/**
 * BackgroundStyleSelector Component
 *
 * A comprehensive two-panel settings selector for token backgrounds.
 * Left panel: Base color/gradient settings + visual effects
 * Right panel: Texture overlay selection
 *
 * Supports solid colors, gradients (linear/radial/conic), procedural textures,
 * and visual effects (vignette, inner glow, hue shift).
 *
 * @module components/Shared/BackgroundStyleSelector
 */

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import drawerStyles from '../../../styles/components/shared/BackgroundDrawer.module.css';
import styles from '../../../styles/components/shared/BackgroundStyleSelector.module.css';
import { createBackgroundGradient } from '../../../ts/canvas/gradientUtils';
import { getBuiltInAssetPath, isBuiltInAsset } from '../../../ts/constants/builtInAssets';
import { extractAssetId, isAssetReference } from '../../../ts/services/upload/assetResolver';
import { assetStorageService } from '../../../ts/services/upload/index';
import type { TextureBlendMode } from '../../../ts/types/backgroundEffects';
import {
  BLEND_MODE_OPTIONS,
  DEFAULT_BACKGROUND_STYLE,
  DEFAULT_EFFECTS_CONFIG,
  DEFAULT_GRADIENT_CONFIG,
  DEFAULT_LIGHT_CONFIG,
  DEFAULT_TEXTURE_CONFIG,
  GRADIENT_TYPE_OPTIONS,
  TEXTURE_OPTIONS,
} from '../../../ts/types/backgroundEffects';
import type {
  BackgroundBaseMode,
  BackgroundSourceType,
  BackgroundStyle,
  EffectsConfig,
  GenerationOptions,
  GradientConfig,
  GradientType,
  LightConfig,
  TextureConfig,
} from '../../../ts/types/index';
import { AssetManagerModal } from '../../Modals/AssetManagerModal';
import { BackgroundDrawer } from '../Drawer';
import { InfoSection, PreviewBox, SettingsSelectorBase } from './SettingsSelectorBase';

// ============================================================================
// Types
// ============================================================================

export interface BackgroundStyleSelectorProps {
  /** Current background style value */
  value: BackgroundStyle;
  /** Called when style changes are applied */
  onChange: (value: BackgroundStyle) => void;
  /** Called on every change for live preview (optional) */
  onPreviewChange?: (value: BackgroundStyle) => void;
  /** Token type for context-specific labels */
  tokenType: 'character' | 'reminder' | 'meta';
  /** Component size variant */
  size?: 'small' | 'medium' | 'large';
  /** Disabled state */
  disabled?: boolean;
  /** Aria label for accessibility */
  ariaLabel?: string;
  /** Project ID for scoping assets in the asset manager modal */
  projectId?: string;
  /** Generation options for live preview in asset manager */
  generationOptions?: GenerationOptions;
}

// ============================================================================
// Preview Component
// ============================================================================

/**
 * Compact preview showing the combined background style
 * Uses image caching to prevent flashing on re-renders
 */
const BackgroundPreview = memo(function BackgroundPreview({
  style,
  resolvedImageUrl,
  size = 52,
}: {
  style: BackgroundStyle;
  resolvedImageUrl?: string | null;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Cache the loaded image to prevent reloading on every render
  const loadedImageRef = useRef<HTMLImageElement | null>(null);
  const loadedImageUrlRef = useRef<string | null>(null);
  // State to trigger re-render when image loads
  const [_imageLoaded, setImageLoaded] = useState(false);

  // Load image when URL changes (separate from canvas drawing)
  useEffect(() => {
    // If URL hasn't changed and we already have a loaded image, skip
    if (resolvedImageUrl === loadedImageUrlRef.current && loadedImageRef.current) {
      return;
    }

    // Clear previous image if URL changed
    if (resolvedImageUrl !== loadedImageUrlRef.current) {
      loadedImageRef.current = null;
      loadedImageUrlRef.current = null;
      setImageLoaded(false);
    }

    // If no URL or not image mode, nothing to load
    if (!resolvedImageUrl || style.sourceType !== 'image') {
      return;
    }

    // Load the new image
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      loadedImageRef.current = img;
      loadedImageUrlRef.current = resolvedImageUrl;
      setImageLoaded(true);
    };

    img.onerror = () => {
      loadedImageRef.current = null;
      loadedImageUrlRef.current = resolvedImageUrl; // Mark as attempted
      setImageLoaded(true); // Still trigger draw (will use fallback)
    };

    img.src = resolvedImageUrl;
  }, [resolvedImageUrl, style.sourceType]);

  // Draw to canvas (runs when image loads or style changes)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const diameter = size * 2; // Higher res for quality
    canvas.width = diameter;
    canvas.height = diameter;

    // Clear
    ctx.clearRect(0, 0, diameter, diameter);

    // Create circular clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(diameter / 2, diameter / 2, diameter / 2, 0, Math.PI * 2);
    ctx.clip();

    // Draw base depending on source type
    if (style.sourceType === 'image') {
      const img = loadedImageRef.current;
      if (img?.complete && img.naturalWidth > 0) {
        // Draw cached image
        const imgAspect = img.width / img.height;
        let drawWidth = diameter;
        let drawHeight = diameter;
        let offsetX = 0;
        let offsetY = 0;

        if (imgAspect > 1) {
          drawWidth = diameter * imgAspect;
          offsetX = (diameter - drawWidth) / 2;
        } else {
          drawHeight = diameter / imgAspect;
          offsetY = (diameter - drawHeight) / 2;
        }

        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      } else {
        // Fallback: show placeholder or solid color while loading
        ctx.fillStyle = style.solidColor || '#333333';
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    // Draw base (solid or gradient) for styled mode
    if (style.mode === 'solid') {
      ctx.fillStyle = style.solidColor;
    } else {
      ctx.fillStyle = createBackgroundGradient(ctx, style.gradient, diameter);
    }
    ctx.fill();

    // Apply vignette if enabled (simplified for preview)
    if (style.effects.vignetteEnabled) {
      const intensity = style.effects.vignetteIntensity / 100;
      const gradient = ctx.createRadialGradient(
        diameter / 2,
        diameter / 2,
        diameter * 0.3,
        diameter / 2,
        diameter / 2,
        diameter / 2
      );
      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(0.7, 'transparent');
      gradient.addColorStop(1, `rgba(0, 0, 0, ${intensity})`);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // Apply inner glow if enabled
    if (style.effects.innerGlowEnabled) {
      const glowRadius = (diameter / 2) * (style.effects.innerGlowRadius / 100);
      const intensity = style.effects.innerGlowIntensity / 100;
      const color = style.effects.innerGlowColor;
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);

      const gradient = ctx.createRadialGradient(
        diameter / 2,
        diameter / 2,
        diameter / 2 - glowRadius,
        diameter / 2,
        diameter / 2,
        diameter / 2
      );
      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${intensity})`);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    ctx.restore();
  }, [style.sourceType, style.mode, style.solidColor, style.gradient, style.effects, size]);

  return (
    <div className={styles.previewContainer}>
      <canvas
        ref={canvasRef}
        className={styles.previewCanvas}
        style={{ width: size, height: size }}
      />
      {style.texture.type !== 'none' && (
        <div className={styles.textureIndicator} title={`Texture: ${style.texture.type}`}>
          ✦
        </div>
      )}
    </div>
  );
});

// ============================================================================
// Editable Slider Value Component
// ============================================================================

/**
 * Editable slider value that looks like a span but allows direct text input
 */
const EditableSliderValue = memo(function EditableSliderValue({
  value,
  onChange,
  min = 0,
  max = 100,
  suffix = '%',
  disabled = false,
  step = 1,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
  disabled?: boolean;
  step?: number;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFocus = useCallback(() => {
    setIsEditing(true);
    // Show just the number without suffix for editing
    setEditValue(String(step < 1 ? value.toFixed(1) : Math.round(value)));
  }, [value, step]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    const parsed = parseFloat(editValue);
    if (!Number.isNaN(parsed)) {
      const clamped = Math.min(max, Math.max(min, parsed));
      onChange(clamped);
    }
  }, [editValue, min, max, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        inputRef.current?.blur();
      } else if (e.key === 'Escape') {
        setEditValue(String(step < 1 ? value.toFixed(1) : Math.round(value)));
        inputRef.current?.blur();
      }
    },
    [value, step]
  );

  const displayValue = step < 1 ? value.toFixed(1) : Math.round(value);

  return (
    <input
      ref={inputRef}
      type="text"
      className={drawerStyles.sliderValueInput}
      value={isEditing ? editValue : `${displayValue}${suffix}`}
      onChange={(e) => setEditValue(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      title={`Click to edit (${min}-${max})`}
    />
  );
});

// ============================================================================
// Main Component
// ============================================================================

export const BackgroundStyleSelector = memo(function BackgroundStyleSelector({
  value,
  onChange,
  onPreviewChange,
  tokenType,
  size = 'medium',
  disabled = false,
  ariaLabel,
  projectId,
  generationOptions,
}: BackgroundStyleSelectorProps) {
  // State for image selection modal
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [resolvedImageUrl, setResolvedImageUrl] = useState<string | null>(null);
  // Separate state for pending image URL (updates immediately when user selects image)
  const [pendingResolvedImageUrl, setPendingResolvedImageUrl] = useState<string | null>(null);

  // Ensure value has all required fields with defaults
  const currentStyle: BackgroundStyle = {
    ...DEFAULT_BACKGROUND_STYLE,
    ...value,
    gradient: { ...DEFAULT_GRADIENT_CONFIG, ...value?.gradient },
    texture: { ...DEFAULT_TEXTURE_CONFIG, ...value?.texture },
    effects: { ...DEFAULT_EFFECTS_CONFIG, ...value?.effects },
    light: { ...DEFAULT_LIGHT_CONFIG, ...value?.light },
  };

  // Resolve image URL when imageUrl changes (for left panel preview)
  useEffect(() => {
    let cancelled = false;

    async function resolveImage() {
      const imageUrl = currentStyle.imageUrl;
      if (!imageUrl) {
        setResolvedImageUrl(null);
        return;
      }

      // If it's an asset reference (asset:uuid format), resolve it
      if (isAssetReference(imageUrl)) {
        const assetId = extractAssetId(imageUrl);
        if (assetId) {
          try {
            const asset = await assetStorageService.getByIdWithUrl(assetId);
            if (!cancelled && asset) {
              setResolvedImageUrl(asset.url ?? null);
            }
          } catch {
            if (!cancelled) {
              setResolvedImageUrl(null);
            }
          }
        }
      } else if (isBuiltInAsset(imageUrl, 'token-background')) {
        // Built-in asset ID (like character_background_1)
        const path = getBuiltInAssetPath(imageUrl, 'token-background');
        if (!cancelled) {
          setResolvedImageUrl(path);
        }
      } else {
        // Direct URL or data URL
        setResolvedImageUrl(imageUrl);
      }
    }

    resolveImage();
    return () => {
      cancelled = true;
    };
  }, [currentStyle.imageUrl]);

  // Drawer state management (replacing useExpandablePanel)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [pendingValue, setPendingValue] = useState<BackgroundStyle>(currentStyle);

  // Sync pendingValue when drawer opens
  useEffect(() => {
    if (isDrawerOpen) {
      setPendingValue(currentStyle);
    }
  }, [isDrawerOpen, currentStyle]);

  // Resolve pending image URL when pendingValue.imageUrl changes (for drawer thumbnail preview)
  useEffect(() => {
    let cancelled = false;

    async function resolvePendingImage() {
      const imageUrl = pendingValue?.imageUrl;
      if (!imageUrl) {
        setPendingResolvedImageUrl(null);
        return;
      }

      // If it's an asset reference (asset:uuid format), resolve it
      if (isAssetReference(imageUrl)) {
        const assetId = extractAssetId(imageUrl);
        if (assetId) {
          try {
            const asset = await assetStorageService.getByIdWithUrl(assetId);
            if (!cancelled && asset) {
              setPendingResolvedImageUrl(asset.url ?? null);
            }
          } catch {
            if (!cancelled) {
              setPendingResolvedImageUrl(null);
            }
          }
        }
      } else if (isBuiltInAsset(imageUrl, 'token-background')) {
        // Built-in asset ID (like character_background_1)
        const path = getBuiltInAssetPath(imageUrl, 'token-background');
        if (!cancelled) {
          setPendingResolvedImageUrl(path);
        }
      } else {
        // Direct URL or data URL
        setPendingResolvedImageUrl(imageUrl);
      }
    }

    resolvePendingImage();
    return () => {
      cancelled = true;
    };
  }, [pendingValue?.imageUrl]);

  // Update pending value and trigger preview
  const updatePending = useCallback(
    (newValue: BackgroundStyle) => {
      setPendingValue(newValue);
      onPreviewChange?.(newValue);
    },
    [onPreviewChange]
  );

  // Apply changes
  const handleApply = useCallback(() => {
    onChange(pendingValue);
    setIsDrawerOpen(false);
  }, [onChange, pendingValue]);

  // Cancel changes (revert to original)
  const handleCancel = useCallback(() => {
    // Revert preview to original value
    onPreviewChange?.(currentStyle);
    setIsDrawerOpen(false);
  }, [currentStyle, onPreviewChange]);

  // Toggle drawer
  const handleToggle = useCallback(() => {
    if (disabled) return;
    setIsDrawerOpen((prev) => !prev);
  }, [disabled]);

  // Update handlers that modify pending value
  const handleSourceTypeChange = useCallback(
    (sourceType: BackgroundSourceType) => {
      updatePending({ ...pendingValue, sourceType });
    },
    [updatePending, pendingValue]
  );

  const _handleModeChange = useCallback(
    (mode: BackgroundBaseMode) => {
      updatePending({ ...pendingValue, mode });
    },
    [updatePending, pendingValue]
  );

  // Combined handler for switching to styled mode (solid/gradient)
  // This avoids stale closure issues when both sourceType and mode need to change
  const handleStyledModeChange = useCallback(
    (mode: BackgroundBaseMode) => {
      updatePending({ ...pendingValue, sourceType: 'styled', mode });
    },
    [updatePending, pendingValue]
  );

  const handleSolidColorChange = useCallback(
    (solidColor: string) => {
      updatePending({ ...pendingValue, solidColor });
    },
    [updatePending, pendingValue]
  );

  const handleGradientChange = useCallback(
    (gradient: GradientConfig) => {
      updatePending({ ...pendingValue, gradient });
    },
    [updatePending, pendingValue]
  );

  const handleTextureChange = useCallback(
    (texture: TextureConfig) => {
      updatePending({ ...pendingValue, texture });
    },
    [updatePending, pendingValue]
  );

  const handleEffectsChange = useCallback(
    (effects: EffectsConfig) => {
      updatePending({ ...pendingValue, effects });
    },
    [updatePending, pendingValue]
  );

  const handleLightChange = useCallback(
    (light: LightConfig) => {
      updatePending({ ...pendingValue, light });
    },
    [updatePending, pendingValue]
  );

  const handleReset = useCallback(() => {
    updatePending(DEFAULT_BACKGROUND_STYLE);
  }, [updatePending]);

  const _handlePresetSelect = useCallback(
    (style: BackgroundStyle) => {
      updatePending(style);
    },
    [updatePending]
  );

  // Handle opening image selection modal
  const handleOpenImageModal = useCallback(() => {
    setIsImageModalOpen(true);
  }, []);

  // Handle image selection from modal
  const handleImageSelect = useCallback(
    (assetId: string) => {
      // Store the asset reference (asset:uuid format) as imageUrl
      // Also set sourceType to 'image' so the Image tab becomes active
      updatePending({ ...pendingValue, sourceType: 'image', imageUrl: assetId });
      setIsImageModalOpen(false);
    },
    [updatePending, pendingValue]
  );

  // Generate summary text
  const getSummary = () => {
    const parts: string[] = [];

    // Source/Base mode
    if (currentStyle.sourceType === 'image') {
      parts.push('Image');
    } else if (currentStyle.mode === 'solid') {
      parts.push(`Solid ${currentStyle.solidColor.toUpperCase()}`);
    } else {
      parts.push(
        `${currentStyle.gradient.type.charAt(0).toUpperCase() + currentStyle.gradient.type.slice(1)} gradient`
      );
    }

    // Texture (available for all modes now)
    if (currentStyle.texture.type !== 'none') {
      const textureOpt = TEXTURE_OPTIONS.find((t) => t.value === currentStyle.texture.type);
      parts.push(textureOpt?.label || currentStyle.texture.type);
    }

    // Effects count
    const effectCount = [
      currentStyle.effects.vignetteEnabled,
      currentStyle.effects.innerGlowEnabled,
    ].filter(Boolean).length;
    if (effectCount > 0) {
      parts.push(`${effectCount} effect${effectCount > 1 ? 's' : ''}`);
    }

    // Light adjustments
    const hasLightAdjustments =
      currentStyle.light &&
      (currentStyle.light.brightness !== 100 ||
        currentStyle.light.contrast !== 100 ||
        currentStyle.light.saturation !== 100 ||
        currentStyle.light.vibrance !== 100);
    if (hasLightAdjustments) {
      parts.push('Adjusted');
    }

    return parts.join(' • ');
  };

  // Token type label
  const tokenLabel = tokenType.charAt(0).toUpperCase() + tokenType.slice(1);

  // Render the drawer with all settings in 3-column layout (no scrolling)
  const renderDrawer = () => (
    <BackgroundDrawer
      isOpen={isDrawerOpen}
      onClose={handleCancel}
      onApply={handleApply}
      onReset={handleReset}
      tokenType={tokenType}
      title="Background Settings"
    >
      {/* Column 1: Background (Solid/Gradient/Image) */}
      <div className={drawerStyles.column}>
        <div className={drawerStyles.sectionHeader}>Background</div>

        {/* Mode tabs */}
        <div className={drawerStyles.modeTabs}>
          <button
            type="button"
            className={`${drawerStyles.modeTab} ${pendingValue.sourceType !== 'image' && pendingValue.mode === 'solid' ? drawerStyles.modeTabActive : ''}`}
            onClick={() => handleStyledModeChange('solid')}
          >
            Solid
          </button>
          <button
            type="button"
            className={`${drawerStyles.modeTab} ${pendingValue.sourceType !== 'image' && pendingValue.mode === 'gradient' ? drawerStyles.modeTabActive : ''}`}
            onClick={() => handleStyledModeChange('gradient')}
          >
            Gradient
          </button>
          <button
            type="button"
            className={`${drawerStyles.modeTab} ${pendingValue.sourceType === 'image' ? drawerStyles.modeTabActive : ''}`}
            onClick={() => handleSourceTypeChange('image')}
          >
            Image
          </button>
        </div>

        {/* Solid color */}
        {pendingValue.sourceType !== 'image' && pendingValue.mode === 'solid' && (
          <div className={drawerStyles.colorRow}>
            <span className={drawerStyles.controlLabel}>Color</span>
            <input
              type="color"
              value={pendingValue.solidColor}
              onChange={(e) => handleSolidColorChange(e.target.value)}
              className={drawerStyles.colorInput}
            />
            <button
              type="button"
              className={drawerStyles.randomizeButton}
              onClick={() =>
                handleSolidColorChange(
                  `#${Math.floor(Math.random() * 16777215)
                    .toString(16)
                    .padStart(6, '0')}`
                )
              }
              title="Randomize color"
            >
              🎲
            </button>
          </div>
        )}

        {/* Gradient controls */}
        {pendingValue.sourceType !== 'image' && pendingValue.mode === 'gradient' && (
          <>
            <div className={drawerStyles.colorRow}>
              <span className={drawerStyles.controlLabel}>Color</span>
              <input
                type="color"
                value={pendingValue.gradient.colorStart}
                onChange={(e) =>
                  handleGradientChange({ ...pendingValue.gradient, colorStart: e.target.value })
                }
                className={drawerStyles.colorInput}
                title="Start color"
              />
              <button
                type="button"
                className={drawerStyles.randomizeButton}
                onClick={() =>
                  handleGradientChange({
                    ...pendingValue.gradient,
                    colorStart: `#${Math.floor(Math.random() * 16777215)
                      .toString(16)
                      .padStart(6, '0')}`,
                  })
                }
                title="Randomize start color"
              >
                🎲
              </button>
              <span className={drawerStyles.colorArrow}>→</span>
              <input
                type="color"
                value={pendingValue.gradient.colorEnd}
                onChange={(e) =>
                  handleGradientChange({ ...pendingValue.gradient, colorEnd: e.target.value })
                }
                className={drawerStyles.colorInput}
                title="End color"
              />
              <button
                type="button"
                className={drawerStyles.randomizeButton}
                onClick={() =>
                  handleGradientChange({
                    ...pendingValue.gradient,
                    colorEnd: `#${Math.floor(Math.random() * 16777215)
                      .toString(16)
                      .padStart(6, '0')}`,
                  })
                }
                title="Randomize end color"
              >
                🎲
              </button>
            </div>
            <div className={drawerStyles.controlRow}>
              <span className={drawerStyles.controlLabel}>Type</span>
              <select
                value={pendingValue.gradient.type}
                onChange={(e) =>
                  handleGradientChange({
                    ...pendingValue.gradient,
                    type: e.target.value as GradientType,
                  })
                }
                className={drawerStyles.typeSelect}
              >
                {GRADIENT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {(pendingValue.gradient.type === 'linear' ||
              pendingValue.gradient.type === 'conic') && (
              <div className={drawerStyles.controlRow}>
                <span className={drawerStyles.controlLabel}>Angle</span>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="15"
                  value={pendingValue.gradient.rotation}
                  onChange={(e) =>
                    handleGradientChange({
                      ...pendingValue.gradient,
                      rotation: Number(e.target.value),
                    })
                  }
                  className={drawerStyles.slider}
                />
                <EditableSliderValue
                  value={pendingValue.gradient.rotation}
                  onChange={(v) => handleGradientChange({ ...pendingValue.gradient, rotation: v })}
                  min={0}
                  max={360}
                  suffix="°"
                />
              </div>
            )}
          </>
        )}

        {/* Image selection */}
        {pendingValue.sourceType === 'image' && (
          <div className={drawerStyles.imageSelectRow}>
            <div
              className={drawerStyles.imageThumbnail}
              style={
                pendingResolvedImageUrl
                  ? { backgroundImage: `url(${pendingResolvedImageUrl})` }
                  : undefined
              }
            />
            <button
              type="button"
              className={drawerStyles.selectImageButton}
              onClick={handleOpenImageModal}
            >
              Choose...
            </button>
          </div>
        )}
      </div>

      {/* Column 2: Light & Effects */}
      <div className={drawerStyles.column}>
        <div className={drawerStyles.sectionHeader}>Light & Color</div>
        <div className={drawerStyles.controlRow}>
          <button
            type="button"
            className={drawerStyles.resettableLabel}
            onClick={() =>
              handleLightChange({
                ...(pendingValue.light || DEFAULT_LIGHT_CONFIG),
                brightness: 100,
              })
            }
            title="Click to reset to 100%"
            data-label="Bright"
          >
            <span className={drawerStyles.labelText}>Bright</span>
            <span className={drawerStyles.resetText}>Reset</span>
          </button>
          <input
            type="range"
            min="0"
            max="200"
            value={pendingValue.light?.brightness ?? 100}
            onChange={(e) =>
              handleLightChange({
                ...(pendingValue.light || DEFAULT_LIGHT_CONFIG),
                brightness: Number(e.target.value),
              })
            }
            className={drawerStyles.slider}
          />
          <EditableSliderValue
            value={pendingValue.light?.brightness ?? 100}
            onChange={(v) =>
              handleLightChange({ ...(pendingValue.light || DEFAULT_LIGHT_CONFIG), brightness: v })
            }
            min={0}
            max={200}
          />
        </div>
        <div className={drawerStyles.controlRow}>
          <button
            type="button"
            className={drawerStyles.resettableLabel}
            onClick={() =>
              handleLightChange({ ...(pendingValue.light || DEFAULT_LIGHT_CONFIG), contrast: 100 })
            }
            title="Click to reset to 100%"
            data-label="Contrast"
          >
            <span className={drawerStyles.labelText}>Contrast</span>
            <span className={drawerStyles.resetText}>Reset</span>
          </button>
          <input
            type="range"
            min="0"
            max="200"
            value={pendingValue.light?.contrast ?? 100}
            onChange={(e) =>
              handleLightChange({
                ...(pendingValue.light || DEFAULT_LIGHT_CONFIG),
                contrast: Number(e.target.value),
              })
            }
            className={drawerStyles.slider}
          />
          <EditableSliderValue
            value={pendingValue.light?.contrast ?? 100}
            onChange={(v) =>
              handleLightChange({ ...(pendingValue.light || DEFAULT_LIGHT_CONFIG), contrast: v })
            }
            min={0}
            max={200}
          />
        </div>
        <div className={drawerStyles.controlRow}>
          <button
            type="button"
            className={drawerStyles.resettableLabel}
            onClick={() =>
              handleLightChange({
                ...(pendingValue.light || DEFAULT_LIGHT_CONFIG),
                saturation: 100,
              })
            }
            title="Click to reset to 100%"
            data-label="Satur."
          >
            <span className={drawerStyles.labelText}>Satur.</span>
            <span className={drawerStyles.resetText}>Reset</span>
          </button>
          <input
            type="range"
            min="0"
            max="200"
            value={pendingValue.light?.saturation ?? 100}
            onChange={(e) =>
              handleLightChange({
                ...(pendingValue.light || DEFAULT_LIGHT_CONFIG),
                saturation: Number(e.target.value),
              })
            }
            className={drawerStyles.slider}
          />
          <EditableSliderValue
            value={pendingValue.light?.saturation ?? 100}
            onChange={(v) =>
              handleLightChange({ ...(pendingValue.light || DEFAULT_LIGHT_CONFIG), saturation: v })
            }
            min={0}
            max={200}
          />
        </div>
        <div className={drawerStyles.controlRow}>
          <button
            type="button"
            className={drawerStyles.resettableLabel}
            onClick={() =>
              handleLightChange({ ...(pendingValue.light || DEFAULT_LIGHT_CONFIG), vibrance: 100 })
            }
            title="Click to reset to 100%"
            data-label="Vibrance"
          >
            <span className={drawerStyles.labelText}>Vibrance</span>
            <span className={drawerStyles.resetText}>Reset</span>
          </button>
          <input
            type="range"
            min="0"
            max="200"
            value={pendingValue.light?.vibrance ?? 100}
            onChange={(e) =>
              handleLightChange({
                ...(pendingValue.light || DEFAULT_LIGHT_CONFIG),
                vibrance: Number(e.target.value),
              })
            }
            className={drawerStyles.slider}
          />
          <EditableSliderValue
            value={pendingValue.light?.vibrance ?? 100}
            onChange={(v) =>
              handleLightChange({ ...(pendingValue.light || DEFAULT_LIGHT_CONFIG), vibrance: v })
            }
            min={0}
            max={200}
          />
        </div>

        <div className={drawerStyles.sectionHeader}>Effects</div>
        <div className={drawerStyles.controlRow}>
          <label className={drawerStyles.effectCheckbox}>
            <input
              type="checkbox"
              checked={pendingValue.effects.vignetteEnabled}
              onChange={(e) =>
                handleEffectsChange({ ...pendingValue.effects, vignetteEnabled: e.target.checked })
              }
            />
            Vignette
          </label>
          <input
            type="color"
            value={pendingValue.effects.vignetteColor || '#000000'}
            onChange={(e) =>
              handleEffectsChange({ ...pendingValue.effects, vignetteColor: e.target.value })
            }
            className={drawerStyles.colorInput}
            disabled={!pendingValue.effects.vignetteEnabled}
            title="Vignette color"
          />
          <input
            type="range"
            min="0"
            max="100"
            value={pendingValue.effects.vignetteIntensity}
            onChange={(e) =>
              handleEffectsChange({
                ...pendingValue.effects,
                vignetteIntensity: Number(e.target.value),
              })
            }
            className={drawerStyles.slider}
            disabled={!pendingValue.effects.vignetteEnabled}
          />
          <EditableSliderValue
            value={pendingValue.effects.vignetteIntensity}
            onChange={(v) => handleEffectsChange({ ...pendingValue.effects, vignetteIntensity: v })}
            min={0}
            max={100}
            disabled={!pendingValue.effects.vignetteEnabled}
          />
        </div>
        <div className={drawerStyles.controlRow}>
          <label className={drawerStyles.effectCheckbox}>
            <input
              type="checkbox"
              checked={pendingValue.effects.innerGlowEnabled}
              onChange={(e) =>
                handleEffectsChange({ ...pendingValue.effects, innerGlowEnabled: e.target.checked })
              }
            />
            Glow
          </label>
          <input
            type="color"
            value={pendingValue.effects.innerGlowColor}
            onChange={(e) =>
              handleEffectsChange({ ...pendingValue.effects, innerGlowColor: e.target.value })
            }
            className={drawerStyles.colorInput}
            disabled={!pendingValue.effects.innerGlowEnabled}
            title="Glow color"
          />
          <input
            type="range"
            min="0"
            max="50"
            value={pendingValue.effects.innerGlowRadius}
            onChange={(e) =>
              handleEffectsChange({
                ...pendingValue.effects,
                innerGlowRadius: Number(e.target.value),
              })
            }
            className={drawerStyles.slider}
            disabled={!pendingValue.effects.innerGlowEnabled}
            title="Glow radius"
          />
          <EditableSliderValue
            value={pendingValue.effects.innerGlowRadius}
            onChange={(v) => handleEffectsChange({ ...pendingValue.effects, innerGlowRadius: v })}
            min={0}
            max={50}
            suffix=""
            disabled={!pendingValue.effects.innerGlowEnabled}
          />
          <input
            type="range"
            min="0"
            max="100"
            value={pendingValue.effects.innerGlowIntensity}
            onChange={(e) =>
              handleEffectsChange({
                ...pendingValue.effects,
                innerGlowIntensity: Number(e.target.value),
              })
            }
            className={drawerStyles.slider}
            disabled={!pendingValue.effects.innerGlowEnabled}
            title="Glow intensity"
          />
          <EditableSliderValue
            value={pendingValue.effects.innerGlowIntensity}
            onChange={(v) =>
              handleEffectsChange({ ...pendingValue.effects, innerGlowIntensity: v })
            }
            min={0}
            max={100}
            disabled={!pendingValue.effects.innerGlowEnabled}
          />
        </div>
      </div>

      {/* Column 3: Texture */}
      <div className={drawerStyles.column}>
        <div className={drawerStyles.sectionHeader}>Texture</div>
        <div className={drawerStyles.textureGrid}>
          {TEXTURE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`${drawerStyles.textureOption} ${pendingValue.texture.type === option.value ? drawerStyles.textureOptionActive : ''}`}
              onClick={() => handleTextureChange({ ...pendingValue.texture, type: option.value })}
              title={option.description}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className={drawerStyles.controlRow}>
          <span className={drawerStyles.controlLabel}>Intensity</span>
          <input
            type="range"
            min="0"
            max="100"
            value={pendingValue.texture.intensity}
            onChange={(e) =>
              handleTextureChange({ ...pendingValue.texture, intensity: Number(e.target.value) })
            }
            className={drawerStyles.slider}
            disabled={pendingValue.texture.type === 'none'}
          />
          <EditableSliderValue
            value={pendingValue.texture.intensity}
            onChange={(v) => handleTextureChange({ ...pendingValue.texture, intensity: v })}
            min={0}
            max={100}
            disabled={pendingValue.texture.type === 'none'}
          />
        </div>
        <div className={drawerStyles.controlRow}>
          <span className={drawerStyles.controlLabel}>Scale</span>
          <input
            type="range"
            min="50"
            max="200"
            value={pendingValue.texture.scale * 100}
            onChange={(e) =>
              handleTextureChange({ ...pendingValue.texture, scale: Number(e.target.value) / 100 })
            }
            className={drawerStyles.slider}
            disabled={pendingValue.texture.type === 'none'}
          />
          <EditableSliderValue
            value={pendingValue.texture.scale}
            onChange={(v) => handleTextureChange({ ...pendingValue.texture, scale: v })}
            min={0.5}
            max={2}
            step={0.1}
            suffix="x"
            disabled={pendingValue.texture.type === 'none'}
          />
        </div>
        <div className={drawerStyles.controlRow}>
          <span className={drawerStyles.controlLabel}>Blend</span>
          <select
            value={pendingValue.texture.blendMode ?? 'overlay'}
            onChange={(e) =>
              handleTextureChange({
                ...pendingValue.texture,
                blendMode: e.target.value as TextureBlendMode,
              })
            }
            className={drawerStyles.typeSelect}
            disabled={pendingValue.texture.type === 'none'}
          >
            {BLEND_MODE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className={drawerStyles.controlRow}>
          <span className={drawerStyles.controlLabel}>Seed</span>
          <input
            type="number"
            min="0"
            max="99999"
            value={pendingValue.texture.seed ?? 12345}
            onChange={(e) =>
              handleTextureChange({ ...pendingValue.texture, seed: Number(e.target.value) })
            }
            className={drawerStyles.seedInput}
            disabled={
              pendingValue.texture.type === 'none' || pendingValue.texture.randomizeSeedPerToken
            }
          />
          <button
            type="button"
            className={drawerStyles.randomizeButton}
            onClick={() =>
              handleTextureChange({
                ...pendingValue.texture,
                seed: Math.floor(Math.random() * 100000),
              })
            }
            disabled={
              pendingValue.texture.type === 'none' || pendingValue.texture.randomizeSeedPerToken
            }
          >
            🎲
          </button>
          <label
            className={drawerStyles.effectCheckbox}
            title="When enabled, each token gets a unique texture pattern"
          >
            <input
              type="checkbox"
              checked={pendingValue.texture.randomizeSeedPerToken ?? false}
              onChange={(e) =>
                handleTextureChange({
                  ...pendingValue.texture,
                  randomizeSeedPerToken: e.target.checked,
                })
              }
              disabled={pendingValue.texture.type === 'none'}
            />
            Unique
          </label>
        </div>
      </div>
    </BackgroundDrawer>
  );

  return (
    <>
      <SettingsSelectorBase
        preview={
          <PreviewBox shape="circle" size={size}>
            <BackgroundPreview
              style={currentStyle}
              resolvedImageUrl={resolvedImageUrl}
              size={size === 'small' ? 40 : size === 'large' ? 64 : 52}
            />
          </PreviewBox>
        }
        info={<InfoSection label={`${tokenLabel} Background`} summary={getSummary()} />}
        onAction={handleToggle}
        actionLabel={isDrawerOpen ? 'Close' : 'Customize'}
        isExpanded={isDrawerOpen}
        disabled={disabled}
        size={size}
        ariaLabel={ariaLabel || `${tokenLabel} background style`}
      />

      {/* Drawer with all background settings */}
      {renderDrawer()}

      {/* Asset Manager Modal for image selection */}
      <AssetManagerModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        projectId={projectId}
        initialAssetType="token-background"
        selectionMode={true}
        onSelectAsset={handleImageSelect}
        includeBuiltIn={true}
        showNoneOption={false}
        generationOptions={generationOptions}
        previewTokenType={tokenType}
      />
    </>
  );
});

export default BackgroundStyleSelector;
