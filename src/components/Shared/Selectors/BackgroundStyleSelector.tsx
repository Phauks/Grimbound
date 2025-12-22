/**
 * BackgroundStyleSelector Component
 *
 * A comprehensive four-column settings selector for token backgrounds.
 * Column 1: Background (solid color/gradient/image selection)
 * Column 2: Light & Color (brightness, contrast, saturation, vibrance)
 * Column 3: Effects (vignette, inner glow)
 * Column 4: Texture overlay selection
 *
 * Supports solid colors, gradients (linear/radial/conic), procedural textures,
 * and visual effects (vignette, inner glow, hue shift).
 *
 * @module components/Shared/BackgroundStyleSelector
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AssetManagerModal } from '@/components/Modals/AssetManagerModal';
import { EditableSlider } from '@/components/Shared/Controls/EditableSlider';
import { BackgroundDrawer } from '@/components/Shared/Drawer';
import { useBackgroundImageUrl, useDrawerState } from '@/hooks';
import drawerStyles from '@/styles/components/shared/BackgroundDrawer.module.css';
import styles from '@/styles/components/shared/BackgroundStyleSelector.module.css';
import { createBackgroundGradient } from '@/ts/canvas/gradientUtils';
import type { TextureBlendMode } from '@/ts/types/backgroundEffects';
import {
  BLEND_MODE_OPTIONS,
  DEFAULT_BACKGROUND_STYLE,
  DEFAULT_EFFECTS_CONFIG,
  DEFAULT_GRADIENT_CONFIG,
  DEFAULT_LIGHT_CONFIG,
  DEFAULT_TEXTURE_CONFIG,
  GRADIENT_TYPE_OPTIONS,
  TEXTURE_OPTIONS,
} from '@/ts/types/backgroundEffects';
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
  TextureType,
} from '@/ts/types/index';
import { randomHexColor } from '@/ts/utils/colorUtils.js';
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
 * Self-contained: resolves image URLs internally via useBackgroundImageUrl hook
 */
const BackgroundPreview = memo(function BackgroundPreview({
  style,
  size = 52,
}: {
  style: BackgroundStyle;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // State to hold the loaded image (using state instead of ref for proper reactivity)
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  // Track which URL the loaded image corresponds to
  const loadedUrlRef = useRef<string | null>(null);

  // Resolve image URL internally (only when sourceType is 'image')
  const { resolvedUrl } = useBackgroundImageUrl({
    imageUrl: style.sourceType === 'image' ? style.imageUrl : undefined,
  });

  // Load image when resolved URL changes
  useEffect(() => {
    // If no URL or not image mode, clear image
    if (!resolvedUrl || style.sourceType !== 'image') {
      setLoadedImage(null);
      loadedUrlRef.current = null;
      return;
    }

    // If URL hasn't changed and we already have a loaded image, skip
    if (resolvedUrl === loadedUrlRef.current && loadedImage) {
      return;
    }

    // Clear previous image and load new one
    setLoadedImage(null);
    loadedUrlRef.current = null;

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      setLoadedImage(img);
      loadedUrlRef.current = resolvedUrl;
    };

    img.onerror = () => {
      setLoadedImage(null);
      loadedUrlRef.current = resolvedUrl; // Mark as attempted
    };

    img.src = resolvedUrl;
  }, [resolvedUrl, style.sourceType, loadedImage]);

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
      // Draw checkerboard background to indicate "paper" areas
      const checkerSize = Math.max(4, Math.floor(diameter / 20));
      const checkerColors = ['#E0E0E0', '#F5F5F5'];
      for (let y = 0; y < diameter; y += checkerSize) {
        for (let x = 0; x < diameter; x += checkerSize) {
          const colorIndex = (Math.floor(x / checkerSize) + Math.floor(y / checkerSize)) % 2;
          ctx.fillStyle = checkerColors[colorIndex];
          ctx.fillRect(x, y, checkerSize, checkerSize);
        }
      }

      if (loadedImage?.complete && loadedImage.naturalWidth > 0) {
        // Draw loaded image
        const imgAspect = loadedImage.width / loadedImage.height;
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

        // Apply zoom (1.0 = cover fit, >1 = zoom in, <1 = zoom out)
        const zoom = style.imageZoom ?? 1;
        if (zoom !== 1) {
          const prevWidth = drawWidth;
          const prevHeight = drawHeight;
          drawWidth *= zoom;
          drawHeight *= zoom;
          offsetX -= (drawWidth - prevWidth) / 2;
          offsetY -= (drawHeight - prevHeight) / 2;
        }

        // Apply manual offset (Y is inverted so positive = up)
        offsetX += (style.imageOffsetX ?? 0) * diameter;
        offsetY -= (style.imageOffsetY ?? 0) * diameter;

        // Apply rotation if set (for preview, show fixed rotation value)
        const rotation = style.imageRotation ?? 0;
        if (rotation !== 0) {
          ctx.save();
          ctx.translate(diameter / 2, diameter / 2);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.translate(-diameter / 2, -diameter / 2);
        }

        ctx.drawImage(loadedImage, offsetX, offsetY, drawWidth, drawHeight);

        if (rotation !== 0) {
          ctx.restore();
        }
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
  }, [
    style.sourceType,
    style.mode,
    style.solidColor,
    style.gradient,
    style.effects,
    style.imageRotation,
    style.imageZoom,
    style.imageOffsetX,
    style.imageOffsetY,
    size,
    loadedImage,
  ]);

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
// Drawer Image Thumbnail Component
// ============================================================================

/**
 * Self-contained thumbnail for image selection in the drawer
 * Resolves image URLs internally via useBackgroundImageUrl hook
 */
const DrawerImageThumbnail = memo(function DrawerImageThumbnail({
  imageUrl,
}: {
  imageUrl: string | undefined;
}) {
  const { resolvedUrl } = useBackgroundImageUrl({ imageUrl });

  return (
    <div
      className={drawerStyles.imageThumbnail}
      style={resolvedUrl ? { backgroundImage: `url(${resolvedUrl})` } : undefined}
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

  // Track last selected texture for re-enabling
  const lastTextureRef = useRef<TextureType>('marble');

  // Ensure value has all required fields with defaults
  const currentStyle: BackgroundStyle = useMemo(
    () => ({
      ...DEFAULT_BACKGROUND_STYLE,
      ...value,
      gradient: { ...DEFAULT_GRADIENT_CONFIG, ...value?.gradient },
      texture: { ...DEFAULT_TEXTURE_CONFIG, ...value?.texture },
      effects: { ...DEFAULT_EFFECTS_CONFIG, ...value?.effects },
      light: { ...DEFAULT_LIGHT_CONFIG, ...value?.light },
    }),
    [value]
  );

  // Get token type display name for accessibility labels
  const tokenLabel = tokenType.charAt(0).toUpperCase() + tokenType.slice(1);

  // Use drawer state hook for centralized state management
  const drawer = useDrawerState<BackgroundStyle>({
    value: currentStyle,
    onChange,
    onPreviewChange,
    disabled,
    defaultValue: DEFAULT_BACKGROUND_STYLE,
  });

  // Update handlers that modify pending value
  const handleSourceTypeChange = useCallback(
    (sourceType: BackgroundSourceType) => {
      drawer.updatePending({ ...drawer.pendingValue, sourceType });
    },
    [drawer]
  );

  const _handleModeChange = useCallback(
    (mode: BackgroundBaseMode) => {
      drawer.updatePending({ ...drawer.pendingValue, mode });
    },
    [drawer]
  );

  const handleSolidColorChange = useCallback(
    (solidColor: string) => {
      drawer.updatePending({ ...drawer.pendingValue, solidColor });
    },
    [drawer]
  );

  const handleGradientChange = useCallback(
    (gradient: GradientConfig) => {
      drawer.updatePending({ ...drawer.pendingValue, gradient });
    },
    [drawer]
  );

  const handleTextureChange = useCallback(
    (texture: TextureConfig) => {
      drawer.updatePending({ ...drawer.pendingValue, texture });
    },
    [drawer]
  );

  const handleEffectsChange = useCallback(
    (effects: EffectsConfig) => {
      drawer.updatePending({ ...drawer.pendingValue, effects });
    },
    [drawer]
  );

  const handleLightChange = useCallback(
    (light: LightConfig) => {
      drawer.updatePending({ ...drawer.pendingValue, light });
    },
    [drawer]
  );

  const _handlePresetSelect = useCallback(
    (style: BackgroundStyle) => {
      drawer.updatePending(style);
    },
    [drawer]
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
      drawer.updatePending({ ...drawer.pendingValue, sourceType: 'image', imageUrl: assetId });
      setIsImageModalOpen(false);
    },
    [drawer]
  );

  // Render the drawer with all settings in 3-column layout (no scrolling)
  const renderDrawer = () => (
    <BackgroundDrawer
      isOpen={drawer.isOpen}
      onClose={drawer.cancel}
      onApply={drawer.apply}
      onReset={drawer.reset}
      tokenType={tokenType}
      title="Background Settings"
    >
      {/* Column 1: Background (Color/Image) */}
      <div className={drawerStyles.column}>
        <div className={drawerStyles.sectionHeader}>Background</div>

        {/* Mode tabs: Color | Image */}
        <div className={drawerStyles.modeTabs}>
          <button
            type="button"
            className={`${drawerStyles.modeTab} ${drawer.pendingValue.sourceType !== 'image' ? drawerStyles.modeTabActive : ''}`}
            onClick={() => handleSourceTypeChange('styled')}
          >
            Color
          </button>
          <button
            type="button"
            className={`${drawerStyles.modeTab} ${drawer.pendingValue.sourceType === 'image' ? drawerStyles.modeTabActive : ''}`}
            onClick={() => handleSourceTypeChange('image')}
          >
            Image
          </button>
        </div>

        {/* Color tab content */}
        {drawer.pendingValue.sourceType !== 'image' && (
          <>
            {/* Gradient toggle */}
            <div className={drawerStyles.controlRow}>
              <label className={drawerStyles.effectCheckbox}>
                <input
                  type="checkbox"
                  checked={drawer.pendingValue.mode === 'gradient'}
                  onChange={(e) =>
                    drawer.updatePending({
                      ...drawer.pendingValue,
                      mode: e.target.checked ? 'gradient' : 'solid',
                    })
                  }
                />
                Gradient
              </label>
            </div>

            {/* Primary color picker (solid color / gradient start) */}
            <div className={drawerStyles.colorRow}>
              <span className={drawerStyles.controlLabel}>Color</span>
              <input
                type="color"
                value={
                  drawer.pendingValue.mode === 'gradient'
                    ? drawer.pendingValue.gradient.colorStart
                    : drawer.pendingValue.solidColor
                }
                onChange={(e) => {
                  if (drawer.pendingValue.mode === 'gradient') {
                    handleGradientChange({
                      ...drawer.pendingValue.gradient,
                      colorStart: e.target.value,
                    });
                  } else {
                    handleSolidColorChange(e.target.value);
                  }
                }}
                className={drawerStyles.colorInput}
                title={drawer.pendingValue.mode === 'gradient' ? 'Start color' : 'Background color'}
              />
              <button
                type="button"
                className={drawerStyles.randomizeButton}
                onClick={() => {
                  if (drawer.pendingValue.mode === 'gradient') {
                    handleGradientChange({
                      ...drawer.pendingValue.gradient,
                      colorStart: randomHexColor(),
                    });
                  } else {
                    handleSolidColorChange(randomHexColor());
                  }
                }}
                title="Randomize color"
              >
                🎲
              </button>
            </div>

            {/* Gradient-specific controls (when gradient is enabled) */}
            {drawer.pendingValue.mode === 'gradient' && (
              <>
                {/* End color picker */}
                <div className={drawerStyles.colorRow}>
                  <span className={drawerStyles.controlLabel}>End</span>
                  <input
                    type="color"
                    value={drawer.pendingValue.gradient.colorEnd}
                    onChange={(e) =>
                      handleGradientChange({
                        ...drawer.pendingValue.gradient,
                        colorEnd: e.target.value,
                      })
                    }
                    className={drawerStyles.colorInput}
                    title="End color"
                  />
                  <button
                    type="button"
                    className={drawerStyles.randomizeButton}
                    onClick={() =>
                      handleGradientChange({
                        ...drawer.pendingValue.gradient,
                        colorEnd: randomHexColor(),
                      })
                    }
                    title="Randomize end color"
                  >
                    🎲
                  </button>
                </div>

                {/* Gradient type */}
                <div className={drawerStyles.controlRow}>
                  <span className={drawerStyles.controlLabel}>Type</span>
                  <select
                    value={drawer.pendingValue.gradient.type}
                    onChange={(e) =>
                      handleGradientChange({
                        ...drawer.pendingValue.gradient,
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

                {/* Gradient angle (for linear/conic) */}
                {(drawer.pendingValue.gradient.type === 'linear' ||
                  drawer.pendingValue.gradient.type === 'conic') && (
                  <EditableSlider
                    label="Angle"
                    value={drawer.pendingValue.gradient.rotation}
                    onChange={(v) =>
                      handleGradientChange({ ...drawer.pendingValue.gradient, rotation: v })
                    }
                    min={0}
                    max={360}
                    step={15}
                    suffix="°"
                    defaultValue={DEFAULT_GRADIENT_CONFIG.rotation}
                    ariaLabel="Gradient angle"
                  />
                )}
              </>
            )}
          </>
        )}

        {/* Image tab content */}
        {drawer.pendingValue.sourceType === 'image' && (
          <>
            <div className={drawerStyles.imageSelectRow}>
              <DrawerImageThumbnail imageUrl={drawer.pendingValue.imageUrl} />
              <button
                type="button"
                className={drawerStyles.selectImageButton}
                onClick={handleOpenImageModal}
              >
                Choose...
              </button>
            </div>

            {/* Rotation slider */}
            <EditableSlider
              label="Rotation"
              value={drawer.pendingValue.imageRotation ?? 0}
              onChange={(v) =>
                drawer.updatePending({
                  ...drawer.pendingValue,
                  imageRotation: v,
                })
              }
              min={0}
              max={360}
              step={15}
              suffix="°"
              defaultValue={0}
              ariaLabel="Image rotation"
            />

            {/* Random rotation checkbox */}
            <div className={drawerStyles.controlRow}>
              <label className={drawerStyles.effectCheckbox}>
                <input
                  type="checkbox"
                  checked={drawer.pendingValue.randomizeRotation ?? false}
                  onChange={(e) =>
                    drawer.updatePending({
                      ...drawer.pendingValue,
                      randomizeRotation: e.target.checked,
                    })
                  }
                />
                Random rotation
              </label>
            </div>

            {/* Random crop checkbox */}
            <div className={drawerStyles.controlRow}>
              <label className={drawerStyles.effectCheckbox}>
                <input
                  type="checkbox"
                  checked={drawer.pendingValue.randomCrop ?? false}
                  onChange={(e) =>
                    drawer.updatePending({
                      ...drawer.pendingValue,
                      randomCrop: e.target.checked,
                    })
                  }
                />
                Random crop
              </label>
            </div>

            {/* Zoom slider */}
            <EditableSlider
              label="Zoom"
              value={(drawer.pendingValue.imageZoom ?? 1) * 100}
              onChange={(v) =>
                drawer.updatePending({
                  ...drawer.pendingValue,
                  imageZoom: v / 100,
                })
              }
              min={50}
              max={200}
              step={5}
              suffix="%"
              defaultValue={100}
              ariaLabel="Image zoom"
            />

            {/* X offset slider */}
            <EditableSlider
              label="X Offset"
              value={(drawer.pendingValue.imageOffsetX ?? 0) * 100}
              onChange={(v) =>
                drawer.updatePending({
                  ...drawer.pendingValue,
                  imageOffsetX: v / 100,
                })
              }
              min={-100}
              max={100}
              step={5}
              suffix="%"
              defaultValue={0}
              ariaLabel="Image X offset"
            />

            {/* Y offset slider */}
            <EditableSlider
              label="Y Offset"
              value={(drawer.pendingValue.imageOffsetY ?? 0) * 100}
              onChange={(v) =>
                drawer.updatePending({
                  ...drawer.pendingValue,
                  imageOffsetY: v / 100,
                })
              }
              min={-100}
              max={100}
              step={5}
              suffix="%"
              defaultValue={0}
              ariaLabel="Image Y offset"
            />
          </>
        )}
      </div>

      {/* Column 2: Light & Color */}
      <div className={drawerStyles.column}>
        <div className={drawerStyles.sectionHeader}>Light & Color</div>
        <EditableSlider
          label="Brightness"
          value={drawer.pendingValue.light?.brightness ?? 100}
          onChange={(v) =>
            handleLightChange({
              ...(drawer.pendingValue.light || DEFAULT_LIGHT_CONFIG),
              brightness: v,
            })
          }
          min={0}
          max={200}
          defaultValue={DEFAULT_LIGHT_CONFIG.brightness}
          ariaLabel="Brightness"
        />
        <EditableSlider
          label="Contrast"
          value={drawer.pendingValue.light?.contrast ?? 100}
          onChange={(v) =>
            handleLightChange({
              ...(drawer.pendingValue.light || DEFAULT_LIGHT_CONFIG),
              contrast: v,
            })
          }
          min={0}
          max={200}
          defaultValue={DEFAULT_LIGHT_CONFIG.contrast}
          ariaLabel="Contrast"
        />
        <EditableSlider
          label="Saturation"
          value={drawer.pendingValue.light?.saturation ?? 100}
          onChange={(v) =>
            handleLightChange({
              ...(drawer.pendingValue.light || DEFAULT_LIGHT_CONFIG),
              saturation: v,
            })
          }
          min={0}
          max={200}
          defaultValue={DEFAULT_LIGHT_CONFIG.saturation}
          ariaLabel="Saturation"
        />
        <EditableSlider
          label="Vibrance"
          value={drawer.pendingValue.light?.vibrance ?? 100}
          onChange={(v) =>
            handleLightChange({
              ...(drawer.pendingValue.light || DEFAULT_LIGHT_CONFIG),
              vibrance: v,
            })
          }
          min={0}
          max={200}
          defaultValue={DEFAULT_LIGHT_CONFIG.vibrance}
          ariaLabel="Vibrance"
        />
      </div>

      {/* Column 3: Effects */}
      <div className={drawerStyles.column}>
        <div className={drawerStyles.sectionHeader}>Effects</div>
        <div className={drawerStyles.controlRow}>
          <label className={drawerStyles.effectCheckbox}>
            <input
              type="checkbox"
              checked={drawer.pendingValue.effects.vignetteEnabled}
              onChange={(e) =>
                handleEffectsChange({
                  ...drawer.pendingValue.effects,
                  vignetteEnabled: e.target.checked,
                })
              }
            />
            Vignette
          </label>
          <input
            type="color"
            value={drawer.pendingValue.effects.vignetteColor || '#000000'}
            onChange={(e) =>
              handleEffectsChange({ ...drawer.pendingValue.effects, vignetteColor: e.target.value })
            }
            className={drawerStyles.colorInput}
            disabled={!drawer.pendingValue.effects.vignetteEnabled}
            title="Vignette color"
          />
          <button
            type="button"
            className={drawerStyles.randomizeButton}
            onClick={() =>
              handleEffectsChange({
                ...drawer.pendingValue.effects,
                vignetteColor: randomHexColor(),
              })
            }
            disabled={!drawer.pendingValue.effects.vignetteEnabled}
            title="Randomize vignette color"
          >
            🎲
          </button>
        </div>
        <EditableSlider
          label="Intensity"
          value={drawer.pendingValue.effects.vignetteIntensity}
          onChange={(v) =>
            handleEffectsChange({ ...drawer.pendingValue.effects, vignetteIntensity: v })
          }
          min={0}
          max={100}
          defaultValue={DEFAULT_EFFECTS_CONFIG.vignetteIntensity}
          disabled={!drawer.pendingValue.effects.vignetteEnabled}
          className={drawerStyles.subOptionIndent}
          ariaLabel="Vignette intensity"
        />
        <div className={drawerStyles.controlRow}>
          <label className={drawerStyles.effectCheckbox}>
            <input
              type="checkbox"
              checked={drawer.pendingValue.effects.innerGlowEnabled}
              onChange={(e) =>
                handleEffectsChange({
                  ...drawer.pendingValue.effects,
                  innerGlowEnabled: e.target.checked,
                })
              }
            />
            Glow
          </label>
          <input
            type="color"
            value={drawer.pendingValue.effects.innerGlowColor}
            onChange={(e) =>
              handleEffectsChange({
                ...drawer.pendingValue.effects,
                innerGlowColor: e.target.value,
              })
            }
            className={drawerStyles.colorInput}
            disabled={!drawer.pendingValue.effects.innerGlowEnabled}
            title="Glow color"
          />
          <button
            type="button"
            className={drawerStyles.randomizeButton}
            onClick={() =>
              handleEffectsChange({
                ...drawer.pendingValue.effects,
                innerGlowColor: randomHexColor(),
              })
            }
            disabled={!drawer.pendingValue.effects.innerGlowEnabled}
            title="Randomize glow color"
          >
            🎲
          </button>
        </div>
        <EditableSlider
          label="Radius"
          value={drawer.pendingValue.effects.innerGlowRadius}
          onChange={(v) =>
            handleEffectsChange({ ...drawer.pendingValue.effects, innerGlowRadius: v })
          }
          min={0}
          max={50}
          suffix=""
          defaultValue={DEFAULT_EFFECTS_CONFIG.innerGlowRadius}
          disabled={!drawer.pendingValue.effects.innerGlowEnabled}
          className={drawerStyles.subOptionIndent}
          ariaLabel="Glow radius"
        />
        <EditableSlider
          label="Intensity"
          value={drawer.pendingValue.effects.innerGlowIntensity}
          onChange={(v) =>
            handleEffectsChange({ ...drawer.pendingValue.effects, innerGlowIntensity: v })
          }
          min={0}
          max={100}
          defaultValue={DEFAULT_EFFECTS_CONFIG.innerGlowIntensity}
          disabled={!drawer.pendingValue.effects.innerGlowEnabled}
          className={drawerStyles.subOptionIndent}
          ariaLabel="Glow intensity"
        />
      </div>

      {/* Column 4: Texture */}
      <div className={drawerStyles.column}>
        <div className={drawerStyles.sectionHeader}>Texture</div>
        <div className={drawerStyles.controlRow}>
          <label className={drawerStyles.effectCheckbox}>
            <input
              type="checkbox"
              checked={drawer.pendingValue.texture.type !== 'none'}
              onChange={(e) => {
                if (e.target.checked) {
                  // Re-enable with last selected texture
                  handleTextureChange({
                    ...drawer.pendingValue.texture,
                    type: lastTextureRef.current,
                  });
                } else {
                  // Store current texture before disabling
                  if (drawer.pendingValue.texture.type !== 'none') {
                    lastTextureRef.current = drawer.pendingValue.texture.type;
                  }
                  handleTextureChange({ ...drawer.pendingValue.texture, type: 'none' });
                }
              }}
            />
            Enabled
          </label>
          <select
            value={
              drawer.pendingValue.texture.type === 'none'
                ? lastTextureRef.current
                : drawer.pendingValue.texture.type
            }
            onChange={(e) => {
              const newType = e.target.value as TextureType;
              lastTextureRef.current = newType;
              handleTextureChange({ ...drawer.pendingValue.texture, type: newType });
            }}
            className={drawerStyles.typeSelect}
            disabled={drawer.pendingValue.texture.type === 'none'}
          >
            {TEXTURE_OPTIONS.filter((opt) => opt.value !== 'none').map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <EditableSlider
          label="Intensity"
          value={drawer.pendingValue.texture.intensity}
          onChange={(v) => handleTextureChange({ ...drawer.pendingValue.texture, intensity: v })}
          min={0}
          max={100}
          defaultValue={DEFAULT_TEXTURE_CONFIG.intensity}
          disabled={drawer.pendingValue.texture.type === 'none'}
          ariaLabel="Texture intensity"
        />
        <EditableSlider
          label="Scale"
          value={drawer.pendingValue.texture.scale}
          onChange={(v) => handleTextureChange({ ...drawer.pendingValue.texture, scale: v })}
          min={0.5}
          max={2}
          step={0.1}
          suffix="x"
          defaultValue={DEFAULT_TEXTURE_CONFIG.scale}
          disabled={drawer.pendingValue.texture.type === 'none'}
          ariaLabel="Texture scale"
        />
        <div className={drawerStyles.controlRow}>
          <span className={drawerStyles.controlLabel}>Blend</span>
          <select
            value={drawer.pendingValue.texture.blendMode ?? 'overlay'}
            onChange={(e) =>
              handleTextureChange({
                ...drawer.pendingValue.texture,
                blendMode: e.target.value as TextureBlendMode,
              })
            }
            className={drawerStyles.typeSelect}
            disabled={drawer.pendingValue.texture.type === 'none'}
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
            value={drawer.pendingValue.texture.seed ?? 12345}
            onChange={(e) =>
              handleTextureChange({ ...drawer.pendingValue.texture, seed: Number(e.target.value) })
            }
            className={drawerStyles.seedInput}
            disabled={
              drawer.pendingValue.texture.type === 'none' ||
              drawer.pendingValue.texture.randomizeSeedPerToken
            }
          />
          <button
            type="button"
            className={drawerStyles.randomizeButton}
            onClick={() =>
              handleTextureChange({
                ...drawer.pendingValue.texture,
                seed: Math.floor(Math.random() * 100000),
              })
            }
            disabled={
              drawer.pendingValue.texture.type === 'none' ||
              drawer.pendingValue.texture.randomizeSeedPerToken
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
              checked={drawer.pendingValue.texture.randomizeSeedPerToken ?? false}
              onChange={(e) =>
                handleTextureChange({
                  ...drawer.pendingValue.texture,
                  randomizeSeedPerToken: e.target.checked,
                })
              }
              disabled={drawer.pendingValue.texture.type === 'none'}
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
              style={drawer.isOpen ? drawer.pendingValue : currentStyle}
              size={size === 'small' ? 40 : size === 'large' ? 64 : 52}
            />
          </PreviewBox>
        }
        info={<InfoSection label="Background" />}
        onAction={drawer.toggle}
        actionLabel={drawer.isOpen ? 'Close' : 'Customize'}
        isExpanded={drawer.isOpen}
        disabled={disabled}
        size={size}
        ariaLabel={ariaLabel || `${tokenLabel} background style`}
      />

      {/* Drawer with all background settings */}
      {renderDrawer()}

      {/* Asset Manager Modal for image selection - only mount when open */}
      {isImageModalOpen && (
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
      )}
    </>
  );
});

export default BackgroundStyleSelector;
