/**
 * BackgroundStyleSelector Component
 *
 * A comprehensive three-column settings selector for token backgrounds.
 * Column 1: Background (solid color/gradient/image selection)
 * Column 2: Light & Color + Effects (brightness, contrast, saturation, vibrance, vignette, glow)
 * Column 3: Texture overlay selection
 *
 * Supports solid colors, gradients (linear/radial/conic), procedural textures,
 * and visual effects (vignette, inner glow, hue shift).
 *
 * @module components/Shared/BackgroundStyleSelector
 */

import { useRef, useState } from 'react';
import { AssetManagerModal } from '@/components/Modals/AssetManagerModal';
import { EditableSlider } from '@/components/Shared/Controls/EditableSlider';
import { BackgroundDrawer } from '@/components/Shared/Drawer';
import { ColorPreviewSelector } from '@/components/Shared/Selectors/ColorPreviewSelector';
import { useCoordinatedPanel } from '@/contexts/PanelCoordinationContext';
import { useBackgroundImageUrl, useDrawerState } from '@/hooks';
import drawerStyles from '@/styles/components/shared/BackgroundDrawer.module.css';
import styles from '@/styles/components/shared/BackgroundStyleSelector.module.css';
import type { BorderMode, BorderStyle, TextureBlendMode } from '@/ts/types/backgroundEffects';
import {
  BLEND_MODE_OPTIONS,
  BORDER_MODE_OPTIONS,
  BORDER_STYLE_OPTIONS,
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
import { InfoSection, PreviewBox, SettingsSelectorBase } from './SettingsSelectorBase';

// ============================================================================
// Types
// ============================================================================

export type TokenType = 'character' | 'reminder' | 'meta';

/** All background styles for all token types */
export interface AllBackgroundStyles {
  character: BackgroundStyle;
  reminder: BackgroundStyle;
  meta: BackgroundStyle;
}

export interface BackgroundStyleSelectorProps {
  /** Generation options (primary interface) */
  generationOptions: GenerationOptions;
  /** Called when options change */
  onOptionChange: (options: Partial<GenerationOptions>) => void;
  /** Component size variant */
  size?: 'small' | 'medium' | 'large';
  /** Disabled state */
  disabled?: boolean;
  /** Aria label for accessibility */
  ariaLabel?: string;
  /** Project ID for scoping assets in the asset manager modal */
  projectId?: string;
  /** Whether Character and Meta settings are linked */
  isLinked?: boolean;
  /** Called when link toggle is clicked */
  onLinkToggle?: () => void;
}

// ============================================================================
// Drawer Image Thumbnail Component
// ============================================================================

/**
 * Self-contained thumbnail for image selection in the drawer
 * Resolves image URLs internally via useBackgroundImageUrl hook
 */
function DrawerImageThumbnail({ imageUrl }: { imageUrl: string | undefined }) {
  const { resolvedUrl } = useBackgroundImageUrl({ imageUrl });

  return (
    <div
      className={drawerStyles.imageThumbnail}
      style={resolvedUrl ? { backgroundImage: `url(${resolvedUrl})` } : undefined}
    />
  );
}

// ============================================================================
// Main Component
// ============================================================================

/** Default AllBackgroundStyles */
const DEFAULT_ALL_BACKGROUND_STYLES: AllBackgroundStyles = {
  character: DEFAULT_BACKGROUND_STYLE,
  reminder: DEFAULT_BACKGROUND_STYLE,
  meta: DEFAULT_BACKGROUND_STYLE,
};

export function BackgroundStyleSelector({
  generationOptions,
  onOptionChange,
  size = 'medium',
  disabled = false,
  ariaLabel,
  projectId,
  isLinked = false,
  onLinkToggle,
}: BackgroundStyleSelectorProps) {
  // Active token type state - managed internally
  const [activeTokenType, setActiveTokenType] = useState<TokenType>('character');

  // State for image selection modal
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // Track last selected texture for re-enabling
  const lastTextureRef = useRef<TextureType>('marble');

  // Build AllBackgroundStyles from generationOptions (self-contained extraction)
  const currentStyles: AllBackgroundStyles = ((): AllBackgroundStyles => {
    const charStyle = generationOptions.characterBackgroundStyle || DEFAULT_BACKGROUND_STYLE;
    const remStyle = generationOptions.reminderBackgroundStyle || DEFAULT_BACKGROUND_STYLE;
    const metaStyle = generationOptions.metaBackgroundStyle || DEFAULT_BACKGROUND_STYLE;

    return {
      character: {
        ...DEFAULT_BACKGROUND_STYLE,
        ...charStyle,
        gradient: { ...DEFAULT_GRADIENT_CONFIG, ...charStyle?.gradient },
        texture: { ...DEFAULT_TEXTURE_CONFIG, ...charStyle?.texture },
        effects: { ...DEFAULT_EFFECTS_CONFIG, ...charStyle?.effects },
        light: { ...DEFAULT_LIGHT_CONFIG, ...charStyle?.light },
      },
      reminder: {
        ...DEFAULT_BACKGROUND_STYLE,
        ...remStyle,
        gradient: { ...DEFAULT_GRADIENT_CONFIG, ...remStyle?.gradient },
        texture: { ...DEFAULT_TEXTURE_CONFIG, ...remStyle?.texture },
        effects: { ...DEFAULT_EFFECTS_CONFIG, ...remStyle?.effects },
        light: { ...DEFAULT_LIGHT_CONFIG, ...remStyle?.light },
      },
      meta: {
        ...DEFAULT_BACKGROUND_STYLE,
        ...metaStyle,
        gradient: { ...DEFAULT_GRADIENT_CONFIG, ...metaStyle?.gradient },
        texture: { ...DEFAULT_TEXTURE_CONFIG, ...metaStyle?.texture },
        effects: { ...DEFAULT_EFFECTS_CONFIG, ...metaStyle?.effects },
        light: { ...DEFAULT_LIGHT_CONFIG, ...metaStyle?.light },
      },
    };
  })();

  // Convert AllBackgroundStyles changes to GenerationOptions updates
  const handleStylesChange = (styles: AllBackgroundStyles) => {
    onOptionChange({
      characterBackgroundStyle: styles.character,
      reminderBackgroundStyle: styles.reminder,
      metaBackgroundStyle: styles.meta,
    });
  };

  // Ref to access drawer close function for coordination
  const drawerCloseRef = useRef<(() => void) | undefined>(undefined);

  // Panel coordination - closes other panels when this one opens
  const onWillOpen = useCoordinatedPanel('background', () => drawerCloseRef.current);

  // Use drawer state hook for centralized state management
  const drawer = useDrawerState<AllBackgroundStyles>({
    value: currentStyles,
    onChange: handleStylesChange,
    onPreviewChange: handleStylesChange,
    disabled,
    defaultValue: DEFAULT_ALL_BACKGROUND_STYLES,
    onWillOpen,
  });

  // Keep ref updated for coordination
  drawerCloseRef.current = drawer.close;

  // Get the active token type's style from pending value
  const activeStyle = drawer.pendingValue[activeTokenType];

  // Helper to update just the active token type's style
  // When linked and editing Character or Meta, syncs both
  const updateActiveStyle = (updates: Partial<BackgroundStyle>) => {
    const newActiveStyle = {
      ...drawer.pendingValue[activeTokenType],
      ...updates,
    };

    // When linked and editing Character or Meta, sync both
    if (isLinked && activeTokenType !== 'reminder') {
      drawer.updatePending({
        ...drawer.pendingValue,
        character: newActiveStyle,
        meta: newActiveStyle,
      });
    } else {
      drawer.updatePending({
        ...drawer.pendingValue,
        [activeTokenType]: newActiveStyle,
      });
    }
  };

  // Update handlers that modify pending value for active token type
  const handleSourceTypeChange = (sourceType: BackgroundSourceType) => {
    updateActiveStyle({ sourceType });
  };

  const _handleModeChange = (mode: BackgroundBaseMode) => {
    updateActiveStyle({ mode });
  };

  const handleSolidColorChange = (solidColor: string) => {
    updateActiveStyle({ solidColor });
  };

  const handleGradientChange = (gradient: GradientConfig) => {
    updateActiveStyle({ gradient });
  };

  const handleTextureChange = (texture: TextureConfig) => {
    updateActiveStyle({ texture });
  };

  const handleEffectsChange = (effects: EffectsConfig) => {
    updateActiveStyle({ effects });
  };

  const handleLightChange = (light: LightConfig) => {
    updateActiveStyle({ light });
  };

  const _handlePresetSelect = (style: BackgroundStyle) => {
    drawer.updatePending({
      ...drawer.pendingValue,
      [activeTokenType]: style,
    });
  };

  // Handle opening image selection modal
  const handleOpenImageModal = () => {
    setIsImageModalOpen(true);
  };

  // Handle image selection from modal
  const handleImageSelect = (assetId: string) => {
    // Store the asset reference (asset:uuid format) as imageUrl
    // Also set sourceType to 'image' so the Image tab becomes active
    updateActiveStyle({ sourceType: 'image', imageUrl: assetId });
    setIsImageModalOpen(false);
  };

  // Render Color/Image mode tabs
  const renderModeTabs = () => (
    <div className={drawerStyles.modeTabs}>
      <button
        type="button"
        className={`${drawerStyles.modeTab} ${activeStyle.sourceType !== 'image' ? drawerStyles.modeTabActive : ''}`}
        onClick={() => handleSourceTypeChange('styled')}
      >
        Color
      </button>
      <button
        type="button"
        className={`${drawerStyles.modeTab} ${activeStyle.sourceType === 'image' ? drawerStyles.modeTabActive : ''}`}
        onClick={() => handleSourceTypeChange('image')}
      >
        Image
      </button>
    </div>
  );

  // Render color tab content (solid color or gradient)
  const renderColorTabContent = () => (
    <>
      {/* Single row: Gradient toggle + Start/Color + End (when gradient) */}
      <div className={drawerStyles.colorRow}>
        <label className={drawerStyles.effectCheckbox}>
          <input
            type="checkbox"
            checked={activeStyle.mode === 'gradient'}
            onChange={(e) => updateActiveStyle({ mode: e.target.checked ? 'gradient' : 'solid' })}
          />
          Gradient
        </label>
        <ColorPreviewSelector
          label={activeStyle.mode === 'gradient' ? 'Start' : 'Color'}
          value={
            activeStyle.mode === 'gradient'
              ? activeStyle.gradient.colorStart
              : activeStyle.solidColor
          }
          onChange={(color) => {
            if (activeStyle.mode === 'gradient') {
              handleGradientChange({ ...activeStyle.gradient, colorStart: color });
            } else {
              handleSolidColorChange(color);
            }
          }}
          onPreviewChange={(color) => {
            if (activeStyle.mode === 'gradient') {
              handleGradientChange({ ...activeStyle.gradient, colorStart: color });
            } else {
              handleSolidColorChange(color);
            }
          }}
          size="small"
        />
        {activeStyle.mode === 'gradient' && (
          <ColorPreviewSelector
            label="End"
            value={activeStyle.gradient.colorEnd}
            onChange={(color) => handleGradientChange({ ...activeStyle.gradient, colorEnd: color })}
            onPreviewChange={(color) =>
              handleGradientChange({ ...activeStyle.gradient, colorEnd: color })
            }
            size="small"
          />
        )}
      </div>

      {activeStyle.mode === 'gradient' && renderGradientControls()}
    </>
  );

  // Render gradient-specific controls (type and angle)
  const renderGradientControls = () => (
    <>
      <div className={drawerStyles.controlRow}>
        <span className={drawerStyles.controlLabel}>Type</span>
        <select
          value={activeStyle.gradient.type}
          onChange={(e) =>
            handleGradientChange({ ...activeStyle.gradient, type: e.target.value as GradientType })
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

      {(activeStyle.gradient.type === 'linear' || activeStyle.gradient.type === 'conic') && (
        <EditableSlider
          label="Angle"
          value={activeStyle.gradient.rotation}
          onChange={(v) => handleGradientChange({ ...activeStyle.gradient, rotation: v })}
          min={0}
          max={360}
          step={15}
          suffix="°"
          defaultValue={DEFAULT_GRADIENT_CONFIG.rotation}
          ariaLabel="Gradient angle"
        />
      )}
    </>
  );

  // Render image tab content
  const renderImageTabContent = () => (
    <>
      <div className={drawerStyles.imageSelectRow}>
        <DrawerImageThumbnail imageUrl={activeStyle.imageUrl} />
        <button
          type="button"
          className={drawerStyles.selectImageButton}
          onClick={handleOpenImageModal}
        >
          Choose...
        </button>
      </div>

      <div className={drawerStyles.controlRow}>
        <EditableSlider
          label="Rotation"
          value={activeStyle.imageRotation ?? 0}
          onChange={(v) => updateActiveStyle({ imageRotation: v })}
          min={0}
          max={360}
          step={15}
          suffix="°"
          defaultValue={0}
          ariaLabel="Image rotation"
        />
        <button
          type="button"
          className={`${drawerStyles.randomizeButton} ${activeStyle.randomizeRotation ? drawerStyles.randomizeButtonActive : ''}`}
          onClick={() => updateActiveStyle({ randomizeRotation: !activeStyle.randomizeRotation })}
          title="Randomize rotation for each token"
        >
          🔀
        </button>
      </div>

      <div className={drawerStyles.controlRow}>
        <label className={drawerStyles.effectCheckbox}>
          <input
            type="checkbox"
            checked={activeStyle.randomCrop ?? false}
            onChange={(e) => updateActiveStyle({ randomCrop: e.target.checked })}
          />
          Random crop
        </label>
      </div>

      <EditableSlider
        label="Zoom"
        value={(activeStyle.imageZoom ?? 1) * 100}
        onChange={(v) => updateActiveStyle({ imageZoom: v / 100 })}
        min={50}
        max={200}
        step={5}
        suffix="%"
        defaultValue={100}
        ariaLabel="Image zoom"
      />

      <EditableSlider
        label="X Offset"
        value={(activeStyle.imageOffsetX ?? 0) * 100}
        onChange={(v) => updateActiveStyle({ imageOffsetX: v / 100 })}
        min={-100}
        max={100}
        step={5}
        suffix="%"
        defaultValue={0}
        ariaLabel="Image X offset"
      />

      <EditableSlider
        label="Y Offset"
        value={(activeStyle.imageOffsetY ?? 0) * 100}
        onChange={(v) => updateActiveStyle({ imageOffsetY: v / 100 })}
        min={-100}
        max={100}
        step={5}
        suffix="%"
        defaultValue={0}
        ariaLabel="Image Y offset"
      />
    </>
  );

  // Render Column 1: Background (Color/Image)
  const renderBackgroundColumn = () => (
    <div className={drawerStyles.column}>
      <div className={drawerStyles.sectionHeader}>Background</div>
      {renderModeTabs()}
      {activeStyle.sourceType !== 'image' ? renderColorTabContent() : renderImageTabContent()}
    </div>
  );

  // Render Column 2: Light & Color + Effects (combined)
  const renderLightAndEffectsColumn = () => (
    <div className={drawerStyles.column}>
      {/* Light & Color section */}
      <div className={drawerStyles.sectionHeader}>Light & Color</div>
      <EditableSlider
        label="Brightness"
        value={activeStyle.light?.brightness ?? 100}
        onChange={(v) =>
          handleLightChange({ ...(activeStyle.light || DEFAULT_LIGHT_CONFIG), brightness: v })
        }
        min={0}
        max={200}
        defaultValue={DEFAULT_LIGHT_CONFIG.brightness}
        ariaLabel="Brightness"
      />
      <EditableSlider
        label="Contrast"
        value={activeStyle.light?.contrast ?? 100}
        onChange={(v) =>
          handleLightChange({ ...(activeStyle.light || DEFAULT_LIGHT_CONFIG), contrast: v })
        }
        min={0}
        max={200}
        defaultValue={DEFAULT_LIGHT_CONFIG.contrast}
        ariaLabel="Contrast"
      />
      <EditableSlider
        label="Saturation"
        value={activeStyle.light?.saturation ?? 100}
        onChange={(v) =>
          handleLightChange({ ...(activeStyle.light || DEFAULT_LIGHT_CONFIG), saturation: v })
        }
        min={0}
        max={200}
        defaultValue={DEFAULT_LIGHT_CONFIG.saturation}
        ariaLabel="Saturation"
      />
      <EditableSlider
        label="Vibrance"
        value={activeStyle.light?.vibrance ?? 100}
        onChange={(v) =>
          handleLightChange({ ...(activeStyle.light || DEFAULT_LIGHT_CONFIG), vibrance: v })
        }
        min={0}
        max={200}
        defaultValue={DEFAULT_LIGHT_CONFIG.vibrance}
        ariaLabel="Vibrance"
      />

      {/* Divider */}
      <div className={drawerStyles.sectionDivider} />

      {/* Effects section */}
      <div className={drawerStyles.sectionHeader}>Effects</div>
      <div className={drawerStyles.controlRow}>
        <label className={drawerStyles.effectCheckbox}>
          <input
            type="checkbox"
            checked={activeStyle.effects.vignetteEnabled}
            onChange={(e) =>
              handleEffectsChange({ ...activeStyle.effects, vignetteEnabled: e.target.checked })
            }
          />
          Vignette
        </label>
        <ColorPreviewSelector
          value={activeStyle.effects.vignetteColor || '#000000'}
          onChange={(color) =>
            handleEffectsChange({ ...activeStyle.effects, vignetteColor: color })
          }
          onPreviewChange={(color) =>
            handleEffectsChange({ ...activeStyle.effects, vignetteColor: color })
          }
          disabled={!activeStyle.effects.vignetteEnabled}
          size="small"
        />
      </div>
      <EditableSlider
        label="Intensity"
        value={activeStyle.effects.vignetteIntensity}
        onChange={(v) => handleEffectsChange({ ...activeStyle.effects, vignetteIntensity: v })}
        min={0}
        max={100}
        defaultValue={DEFAULT_EFFECTS_CONFIG.vignetteIntensity}
        disabled={!activeStyle.effects.vignetteEnabled}
        className={drawerStyles.subOptionIndent}
        ariaLabel="Vignette intensity"
      />
      <div className={drawerStyles.controlRow}>
        <label className={drawerStyles.effectCheckbox}>
          <input
            type="checkbox"
            checked={activeStyle.effects.innerGlowEnabled}
            onChange={(e) =>
              handleEffectsChange({ ...activeStyle.effects, innerGlowEnabled: e.target.checked })
            }
          />
          Glow
        </label>
        <ColorPreviewSelector
          value={activeStyle.effects.innerGlowColor}
          onChange={(color) =>
            handleEffectsChange({ ...activeStyle.effects, innerGlowColor: color })
          }
          onPreviewChange={(color) =>
            handleEffectsChange({ ...activeStyle.effects, innerGlowColor: color })
          }
          disabled={!activeStyle.effects.innerGlowEnabled}
          size="small"
        />
      </div>
      <EditableSlider
        label="Radius"
        value={activeStyle.effects.innerGlowRadius}
        onChange={(v) => handleEffectsChange({ ...activeStyle.effects, innerGlowRadius: v })}
        min={0}
        max={50}
        suffix=""
        defaultValue={DEFAULT_EFFECTS_CONFIG.innerGlowRadius}
        disabled={!activeStyle.effects.innerGlowEnabled}
        className={drawerStyles.subOptionIndent}
        ariaLabel="Glow radius"
      />
      <EditableSlider
        label="Intensity"
        value={activeStyle.effects.innerGlowIntensity}
        onChange={(v) => handleEffectsChange({ ...activeStyle.effects, innerGlowIntensity: v })}
        min={0}
        max={100}
        defaultValue={DEFAULT_EFFECTS_CONFIG.innerGlowIntensity}
        disabled={!activeStyle.effects.innerGlowEnabled}
        className={drawerStyles.subOptionIndent}
        ariaLabel="Glow intensity"
      />

      {/* Border effect */}
      <div className={drawerStyles.controlRow}>
        <label className={drawerStyles.effectCheckbox}>
          <input
            type="checkbox"
            checked={activeStyle.effects.borderEnabled}
            onChange={(e) =>
              handleEffectsChange({ ...activeStyle.effects, borderEnabled: e.target.checked })
            }
          />
          Border
        </label>
        <ColorPreviewSelector
          value={activeStyle.effects.borderColor}
          onChange={(color) => handleEffectsChange({ ...activeStyle.effects, borderColor: color })}
          onPreviewChange={(color) =>
            handleEffectsChange({ ...activeStyle.effects, borderColor: color })
          }
          disabled={!activeStyle.effects.borderEnabled}
          size="small"
        />
      </div>
      <EditableSlider
        label="Width"
        value={activeStyle.effects.borderWidth}
        onChange={(v) => handleEffectsChange({ ...activeStyle.effects, borderWidth: v })}
        min={0}
        max={10}
        step={0.5}
        suffix="%"
        defaultValue={DEFAULT_EFFECTS_CONFIG.borderWidth}
        disabled={!activeStyle.effects.borderEnabled}
        className={drawerStyles.subOptionIndent}
        ariaLabel="Border width"
      />
      <div className={`${drawerStyles.controlRow} ${drawerStyles.subOptionIndent}`}>
        <span className={drawerStyles.controlLabel}>Style</span>
        <select
          value={activeStyle.effects.borderStyle}
          onChange={(e) =>
            handleEffectsChange({
              ...activeStyle.effects,
              borderStyle: e.target.value as BorderStyle,
            })
          }
          className={drawerStyles.typeSelect}
          disabled={!activeStyle.effects.borderEnabled}
        >
          {BORDER_STYLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className={`${drawerStyles.controlRow} ${drawerStyles.subOptionIndent}`}>
        <span className={drawerStyles.controlLabel}>Mode</span>
        <select
          value={activeStyle.effects.borderMode}
          onChange={(e) =>
            handleEffectsChange({
              ...activeStyle.effects,
              borderMode: e.target.value as BorderMode,
            })
          }
          className={drawerStyles.typeSelect}
          disabled={!activeStyle.effects.borderEnabled}
        >
          {BORDER_MODE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} title={opt.description}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  // Handle texture enabled toggle
  const handleTextureEnabledChange = (enabled: boolean) => {
    if (enabled) {
      handleTextureChange({ ...activeStyle.texture, type: lastTextureRef.current });
    } else {
      if (activeStyle.texture.type !== 'none') {
        lastTextureRef.current = activeStyle.texture.type;
      }
      handleTextureChange({ ...activeStyle.texture, type: 'none' });
    }
  };

  // Handle texture type selection
  const handleTextureTypeSelect = (newType: TextureType) => {
    lastTextureRef.current = newType;
    handleTextureChange({ ...activeStyle.texture, type: newType });
  };

  // Render Column 3: Texture
  const renderTextureColumn = () => {
    const isTextureEnabled = activeStyle.texture.type !== 'none';
    const isSeedDisabled = !isTextureEnabled || activeStyle.texture.randomizeSeedPerToken;

    return (
      <div className={drawerStyles.column}>
        <div className={drawerStyles.sectionHeader}>Texture</div>
        <div className={drawerStyles.controlRow}>
          <label className={drawerStyles.effectCheckbox}>
            <input
              type="checkbox"
              checked={isTextureEnabled}
              onChange={(e) => handleTextureEnabledChange(e.target.checked)}
            />
            Enabled
          </label>
          <select
            value={isTextureEnabled ? activeStyle.texture.type : lastTextureRef.current}
            onChange={(e) => handleTextureTypeSelect(e.target.value as TextureType)}
            className={drawerStyles.typeSelect}
            disabled={!isTextureEnabled}
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
          value={activeStyle.texture.intensity}
          onChange={(v) => handleTextureChange({ ...activeStyle.texture, intensity: v })}
          min={0}
          max={100}
          defaultValue={DEFAULT_TEXTURE_CONFIG.intensity}
          disabled={!isTextureEnabled}
          ariaLabel="Texture intensity"
        />
        <EditableSlider
          label="Scale"
          value={activeStyle.texture.scale}
          onChange={(v) => handleTextureChange({ ...activeStyle.texture, scale: v })}
          min={0.5}
          max={2}
          step={0.1}
          suffix="x"
          defaultValue={DEFAULT_TEXTURE_CONFIG.scale}
          disabled={!isTextureEnabled}
          ariaLabel="Texture scale"
        />
        <div className={drawerStyles.controlRow}>
          <span className={drawerStyles.controlLabel}>Blend</span>
          <select
            value={activeStyle.texture.blendMode ?? 'overlay'}
            onChange={(e) =>
              handleTextureChange({
                ...activeStyle.texture,
                blendMode: e.target.value as TextureBlendMode,
              })
            }
            className={drawerStyles.typeSelect}
            disabled={!isTextureEnabled}
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
            value={activeStyle.texture.seed ?? 12345}
            onChange={(e) =>
              handleTextureChange({ ...activeStyle.texture, seed: Number(e.target.value) })
            }
            className={drawerStyles.seedInput}
            disabled={isSeedDisabled}
          />
          <button
            type="button"
            className={drawerStyles.randomizeButton}
            onClick={() =>
              handleTextureChange({
                ...activeStyle.texture,
                seed: Math.floor(Math.random() * 100000),
              })
            }
            disabled={isSeedDisabled}
          >
            🎲
          </button>
          <button
            type="button"
            className={`${drawerStyles.randomizeButton} ${activeStyle.texture.randomizeSeedPerToken ? drawerStyles.randomizeButtonActive : ''}`}
            onClick={() =>
              handleTextureChange({
                ...activeStyle.texture,
                randomizeSeedPerToken: !activeStyle.texture.randomizeSeedPerToken,
              })
            }
            disabled={!isTextureEnabled}
            title="When enabled, each token gets a unique texture pattern"
          >
            🔀
          </button>
        </div>
      </div>
    );
  };

  // Render the drawer with all settings in 3-column layout
  const renderDrawer = () => (
    <BackgroundDrawer
      isOpen={drawer.isOpen}
      onClose={drawer.cancel}
      onApply={drawer.apply}
      onReset={drawer.reset}
      activeTokenType={activeTokenType}
      onTokenTypeChange={setActiveTokenType}
      title="Background Settings"
      isLinked={isLinked}
      onLinkToggle={onLinkToggle}
    >
      {renderBackgroundColumn()}
      {renderLightAndEffectsColumn()}
      {renderTextureColumn()}
    </BackgroundDrawer>
  );

  return (
    <>
      <SettingsSelectorBase
        preview={
          <PreviewBox shape="square" size={size}>
            <span className={styles.previewEmoji}>🎨</span>
          </PreviewBox>
        }
        info={<InfoSection label="Background" />}
        onAction={drawer.toggle}
        actionLabel={drawer.isOpen ? 'Close' : 'Customize'}
        isExpanded={drawer.isOpen}
        disabled={disabled}
        size={size}
        ariaLabel={ariaLabel || 'Background style for all token types'}
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
          previewTokenType={activeTokenType}
        />
      )}
    </>
  );
}
