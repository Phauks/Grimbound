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
} from '@/ts/types/index';
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
  // Cache the loaded image to prevent reloading on every render
  const loadedImageRef = useRef<HTMLImageElement | null>(null);
  const loadedImageUrlRef = useRef<string | null>(null);
  // State to trigger re-draw when image loads
  const [_imageLoaded, setImageLoaded] = useState(false);

  // Resolve image URL internally (only when sourceType is 'image')
  const { resolvedUrl } = useBackgroundImageUrl({
    imageUrl: style.sourceType === 'image' ? style.imageUrl : undefined,
  });

  // Load image when resolved URL changes (separate from canvas drawing)
  useEffect(() => {
    // If URL hasn't changed and we already have a loaded image, skip
    if (resolvedUrl === loadedImageUrlRef.current && loadedImageRef.current) {
      return;
    }

    // Clear previous image if URL changed
    if (resolvedUrl !== loadedImageUrlRef.current) {
      loadedImageRef.current = null;
      loadedImageUrlRef.current = null;
      setImageLoaded(false);
    }

    // If no URL or not image mode, nothing to load
    if (!resolvedUrl || style.sourceType !== 'image') {
      return;
    }

    // Load the new image
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      loadedImageRef.current = img;
      loadedImageUrlRef.current = resolvedUrl;
      setImageLoaded(true);
    };

    img.onerror = () => {
      loadedImageRef.current = null;
      loadedImageUrlRef.current = resolvedUrl; // Mark as attempted
      setImageLoaded(true); // Still trigger draw (will use fallback)
    };

    img.src = resolvedUrl;
  }, [resolvedUrl, style.sourceType]);

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

  // Combined handler for switching to styled mode (solid/gradient)
  // This avoids stale closure issues when both sourceType and mode need to change
  const handleStyledModeChange = useCallback(
    (mode: BackgroundBaseMode) => {
      drawer.updatePending({ ...drawer.pendingValue, sourceType: 'styled', mode });
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
      {/* Column 1: Background (Solid/Gradient/Image) */}
      <div className={drawerStyles.column}>
        <div className={drawerStyles.sectionHeader}>Background</div>

        {/* Mode tabs */}
        <div className={drawerStyles.modeTabs}>
          <button
            type="button"
            className={`${drawerStyles.modeTab} ${drawer.pendingValue.sourceType !== 'image' && drawer.pendingValue.mode === 'solid' ? drawerStyles.modeTabActive : ''}`}
            onClick={() => handleStyledModeChange('solid')}
          >
            Solid
          </button>
          <button
            type="button"
            className={`${drawerStyles.modeTab} ${drawer.pendingValue.sourceType !== 'image' && drawer.pendingValue.mode === 'gradient' ? drawerStyles.modeTabActive : ''}`}
            onClick={() => handleStyledModeChange('gradient')}
          >
            Gradient
          </button>
          <button
            type="button"
            className={`${drawerStyles.modeTab} ${drawer.pendingValue.sourceType === 'image' ? drawerStyles.modeTabActive : ''}`}
            onClick={() => handleSourceTypeChange('image')}
          >
            Image
          </button>
        </div>

        {/* Solid color */}
        {drawer.pendingValue.sourceType !== 'image' && drawer.pendingValue.mode === 'solid' && (
          <div className={drawerStyles.colorRow}>
            <span className={drawerStyles.controlLabel}>Color</span>
            <input
              type="color"
              value={drawer.pendingValue.solidColor}
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
        {drawer.pendingValue.sourceType !== 'image' && drawer.pendingValue.mode === 'gradient' && (
          <>
            <div className={drawerStyles.colorRow}>
              <span className={drawerStyles.controlLabel}>Color</span>
              <input
                type="color"
                value={drawer.pendingValue.gradient.colorStart}
                onChange={(e) =>
                  handleGradientChange({
                    ...drawer.pendingValue.gradient,
                    colorStart: e.target.value,
                  })
                }
                className={drawerStyles.colorInput}
                title="Start color"
              />
              <button
                type="button"
                className={drawerStyles.randomizeButton}
                onClick={() =>
                  handleGradientChange({
                    ...drawer.pendingValue.gradient,
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

        {/* Image selection */}
        {drawer.pendingValue.sourceType === 'image' && (
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
        )}
      </div>

      {/* Column 2: Light & Color */}
      <div className={drawerStyles.column}>
        <div className={drawerStyles.sectionHeader}>Light & Color</div>
        <EditableSlider
          label="Bright"
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
          label="Satur."
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
        <div className={drawerStyles.textureGrid}>
          {TEXTURE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`${drawerStyles.textureOption} ${drawer.pendingValue.texture.type === option.value ? drawerStyles.textureOptionActive : ''}`}
              onClick={() =>
                handleTextureChange({ ...drawer.pendingValue.texture, type: option.value })
              }
              title={option.description}
            >
              {option.label}
            </button>
          ))}
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
              style={currentStyle}
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
