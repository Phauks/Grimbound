/**
 * ScriptPdfDrawer Component
 *
 * Unified settings drawer for script PDF generation.
 * Uses DrawerTokenTabs for Player Script / Night Order selection.
 * Three-column layout matching TokenView drawers:
 * - Column 1: Background (Color/Image) + Fonts
 * - Column 2: Margins (type-specific)
 * - Column 3: Other type-specific settings
 *
 * Built on SettingsDrawer base component with BackgroundDrawer styles.
 */

import { useState } from 'react';
import { AssetManagerModal } from '@/components/Modals/AssetManagerModal';
import { DrawerTokenTabs, type TabGroup } from '@/components/Shared/Controls/DrawerTokenTabs';
import { EditableSlider } from '@/components/Shared/Controls/EditableSlider';
import { SettingsDrawer } from '@/components/Shared/Drawer/SettingsDrawer';
import { ColorPreviewSelector } from '@/components/Shared/Selectors/ColorPreviewSelector';
import { useBackgroundImageUrl } from '@/hooks';
import drawerStyles from '@/styles/components/shared/BackgroundDrawer.module.css';
import { DEFAULT_MARGINS, DEFAULT_NIGHT_ORDER_SETTINGS } from '@/ts/scriptPdf/constants.js';
import type {
  BackingSheetSettings,
  DeepPartial,
  MarginConfig,
  NightOrderSettings,
  PlayerScriptSettings,
  ScriptPdfSettings,
} from '@/ts/scriptPdf/types.js';
import { createAssetReference } from '@/ts/services/upload/assetResolver.js';
import type {
  BackgroundSourceType,
  GradientType,
  ImageFitMode,
} from '@/ts/types/backgroundEffects.js';
import {
  DEFAULT_GRADIENT_CONFIG,
  GRADIENT_TYPE_OPTIONS,
  IMAGE_FIT_MODE_OPTIONS,
} from '@/ts/types/backgroundEffects.js';

// ============================================================================
// TYPES
// ============================================================================

export type ScriptPdfDrawerTab = 'playerScript' | 'nightOrder' | 'backingSheet';

export interface ScriptPdfDrawerProps {
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Called when the drawer should close */
  onClose: () => void;
  /** Called when Apply button is clicked */
  onApply: () => void;
  /** Called when Reset button is clicked */
  onReset: () => void;
  /** Currently active tab */
  activeTab: ScriptPdfDrawerTab;
  /** Tab change handler */
  onTabChange: (tab: ScriptPdfDrawerTab) => void;
  /** Current pending settings */
  pendingSettings: ScriptPdfSettings;
  /** Update pending settings */
  updatePending: (updates: DeepPartial<ScriptPdfSettings>) => void;
  /** Optional project ID for asset selection */
  projectId?: string;
}

// ============================================================================
// DRAWER IMAGE THUMBNAIL COMPONENT
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
// COMPONENT
// ============================================================================

export function ScriptPdfDrawer({
  isOpen,
  onClose,
  onApply,
  onReset,
  activeTab,
  onTabChange,
  pendingSettings,
  updatePending,
  projectId,
}: ScriptPdfDrawerProps) {
  // Current settings based on active tab
  const ps = pendingSettings.playerScript;
  const bs = pendingSettings.backingSheet;
  const no = pendingSettings.nightOrder;

  // State for image selection modal
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // Get background style based on active tab - each type has its own background
  const backgroundStyle =
    activeTab === 'backingSheet'
      ? bs.background
      : activeTab === 'playerScript'
        ? ps.background
        : ps.background; // Night Order uses simple backgroundColor, but still needs a style for the UI

  // ============================================================================
  // UPDATE HELPERS
  // ============================================================================

  /** Update Player Script settings */
  const updatePS = <K extends keyof PlayerScriptSettings>(
    key: K,
    value: PlayerScriptSettings[K]
  ) => {
    updatePending({ playerScript: { [key]: value } });
  };

  /** Update Night Order settings */
  const updateNO = <K extends keyof NightOrderSettings>(key: K, value: NightOrderSettings[K]) => {
    updatePending({ nightOrder: { [key]: value } });
  };

  /** Update Backing Sheet settings */
  const updateBS = <K extends keyof BackingSheetSettings>(
    key: K,
    value: BackingSheetSettings[K]
  ) => {
    updatePending({ backingSheet: { [key]: value } });
  };

  /** Update margin for current tab */
  const updateMargin = (key: keyof MarginConfig, value: number) => {
    if (activeTab === 'nightOrder') {
      updatePending({ nightOrder: { margins: { [key]: value } } });
    } else if (activeTab === 'backingSheet') {
      updatePending({ backingSheet: { margins: { [key]: value } } });
    } else {
      updatePending({ playerScript: { margins: { [key]: value } } });
    }
  };

  /** Update background style based on active tab */
  const updateBackground = (updates: Partial<typeof backgroundStyle>) => {
    if (activeTab === 'backingSheet') {
      // Update backing sheet's own background
      updatePending({
        backingSheet: {
          background: {
            ...updates,
          },
        },
      });
    } else if (activeTab === 'playerScript') {
      // Update player script's background
      updatePending({
        playerScript: {
          background: {
            ...updates,
          },
        },
      });
    } else if (activeTab === 'nightOrder') {
      // Night Order also uses background style now
      updatePending({
        nightOrder: {
          background: {
            ...updates,
          },
        },
      });
    }
  };

  /** Handle source type change (Color vs Image) */
  const handleSourceTypeChange = (sourceType: BackgroundSourceType) => {
    updateBackground({ sourceType });
  };

  /** Handle solid color change */
  const handleSolidColorChange = (color: string) => {
    updateBackground({ solidColor: color });
  };

  /** Handle gradient config change */
  const handleGradientChange = (gradient: typeof backgroundStyle.gradient) => {
    updateBackground({ gradient });
  };

  /** Handle opening image modal */
  const handleOpenImageModal = () => {
    setIsImageModalOpen(true);
  };

  /** Handle image selection from modal */
  const handleImageSelect = (assetId: string) => {
    // Create proper asset reference format (asset:uuid) for storage
    const assetRef = createAssetReference(assetId);
    updateBackground({ sourceType: 'image', imageUrl: assetRef });
    setIsImageModalOpen(false);
  };

  // ============================================================================
  // TAB CONFIGURATION
  // ============================================================================

  const tabGroups: TabGroup[] = [
    {
      tabs: [
        { id: 'playerScript', label: 'Player Script' },
        { id: 'backingSheet', label: 'Backing Sheet' },
        { id: 'nightOrder', label: 'Night Order' },
      ],
    },
  ];

  const headerSlot = (
    <DrawerTokenTabs
      groups={tabGroups}
      activeTab={activeTab}
      onTabChange={(id) => onTabChange(id as ScriptPdfDrawerTab)}
    />
  );

  // ============================================================================
  // BACKGROUND CONTROLS (Matching TokenView)
  // ============================================================================

  /** Render Color/Image mode tabs */
  const renderModeTabs = () => (
    <div className={drawerStyles.modeTabs}>
      <button
        type="button"
        className={`${drawerStyles.modeTab} ${backgroundStyle.sourceType !== 'image' ? drawerStyles.modeTabActive : ''}`}
        onClick={() => handleSourceTypeChange('styled')}
      >
        Color
      </button>
      <button
        type="button"
        className={`${drawerStyles.modeTab} ${backgroundStyle.sourceType === 'image' ? drawerStyles.modeTabActive : ''}`}
        onClick={() => handleSourceTypeChange('image')}
      >
        Image
      </button>
    </div>
  );

  /** Render color tab content (solid color or gradient) */
  const renderColorTabContent = () => (
    <>
      {/* Single row: Gradient toggle + Start/Color + End (when gradient) */}
      <div className={drawerStyles.colorRow}>
        <label className={drawerStyles.effectCheckbox}>
          <input
            type="checkbox"
            checked={backgroundStyle.mode === 'gradient'}
            onChange={(e) => updateBackground({ mode: e.target.checked ? 'gradient' : 'solid' })}
          />
          Gradient
        </label>
        <ColorPreviewSelector
          label={backgroundStyle.mode === 'gradient' ? 'Start' : 'Color'}
          value={
            backgroundStyle.mode === 'gradient'
              ? backgroundStyle.gradient.colorStart
              : backgroundStyle.solidColor
          }
          onChange={(color) => {
            if (backgroundStyle.mode === 'gradient') {
              handleGradientChange({ ...backgroundStyle.gradient, colorStart: color });
            } else {
              handleSolidColorChange(color);
            }
          }}
          onPreviewChange={(color) => {
            if (backgroundStyle.mode === 'gradient') {
              handleGradientChange({ ...backgroundStyle.gradient, colorStart: color });
            } else {
              handleSolidColorChange(color);
            }
          }}
          size="small"
        />
        {backgroundStyle.mode === 'gradient' && (
          <ColorPreviewSelector
            label="End"
            value={backgroundStyle.gradient.colorEnd}
            onChange={(color) =>
              handleGradientChange({ ...backgroundStyle.gradient, colorEnd: color })
            }
            onPreviewChange={(color) =>
              handleGradientChange({ ...backgroundStyle.gradient, colorEnd: color })
            }
            size="small"
          />
        )}
      </div>

      {backgroundStyle.mode === 'gradient' && renderGradientControls()}
    </>
  );

  /** Render gradient-specific controls (type and angle) */
  const renderGradientControls = () => (
    <>
      <div className={drawerStyles.controlRow}>
        <span className={drawerStyles.controlLabel}>Type</span>
        <select
          value={backgroundStyle.gradient.type}
          onChange={(e) =>
            handleGradientChange({
              ...backgroundStyle.gradient,
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

      {(backgroundStyle.gradient.type === 'linear' ||
        backgroundStyle.gradient.type === 'conic') && (
        <EditableSlider
          label="Angle"
          value={backgroundStyle.gradient.rotation}
          onChange={(v) => handleGradientChange({ ...backgroundStyle.gradient, rotation: v })}
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

  /** Render image tab content */
  const renderImageTabContent = () => {
    const fitMode = backgroundStyle.imageFitMode ?? 'cover';
    const isTileMode = fitMode === 'tile';

    return (
      <>
        <div className={drawerStyles.imageSelectRow}>
          <DrawerImageThumbnail imageUrl={backgroundStyle.imageUrl} />
          <button
            type="button"
            className={drawerStyles.selectImageButton}
            onClick={handleOpenImageModal}
          >
            Choose...
          </button>
        </div>

        {/* Fit Mode dropdown */}
        <div className={drawerStyles.controlRow}>
          <span className={drawerStyles.controlLabel}>Fit Mode</span>
          <select
            value={fitMode}
            onChange={(e) => updateBackground({ imageFitMode: e.target.value as ImageFitMode })}
            className={drawerStyles.typeSelect}
          >
            {IMAGE_FIT_MODE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tile Scale - only shown in tile mode */}
        {isTileMode && (
          <EditableSlider
            label="Tile Scale"
            value={(backgroundStyle.tileScale ?? 1) * 100}
            onChange={(v) => updateBackground({ tileScale: v / 100 })}
            min={25}
            max={400}
            step={25}
            suffix="%"
            defaultValue={100}
            ariaLabel="Tile scale"
          />
        )}

        {/* Position controls - hidden in tile mode */}
        {!isTileMode && (
          <>
            <div className={drawerStyles.controlRow}>
              <EditableSlider
                label="Rotation"
                value={backgroundStyle.imageRotation ?? 0}
                onChange={(v) => updateBackground({ imageRotation: v })}
                min={0}
                max={360}
                step={15}
                suffix="°"
                defaultValue={0}
                ariaLabel="Image rotation"
              />
              <button
                type="button"
                className={`${drawerStyles.randomizeButton} ${backgroundStyle.randomizeRotation ? drawerStyles.randomizeButtonActive : ''}`}
                onClick={() =>
                  updateBackground({ randomizeRotation: !backgroundStyle.randomizeRotation })
                }
                title="Randomize rotation for each page"
              >
                🔀
              </button>
            </div>

            <div className={drawerStyles.controlRow}>
              <label className={drawerStyles.effectCheckbox}>
                <input
                  type="checkbox"
                  checked={backgroundStyle.randomCrop ?? false}
                  onChange={(e) => updateBackground({ randomCrop: e.target.checked })}
                />
                Random crop
              </label>
            </div>

            <EditableSlider
              label="Zoom"
              value={(backgroundStyle.imageZoom ?? 1) * 100}
              onChange={(v) => updateBackground({ imageZoom: v / 100 })}
              min={50}
              max={200}
              step={5}
              suffix="%"
              defaultValue={100}
              ariaLabel="Image zoom"
            />

            <EditableSlider
              label="X Offset"
              value={(backgroundStyle.cropOffsetX ?? 0.5) * 100}
              onChange={(v) => updateBackground({ cropOffsetX: v / 100 })}
              min={0}
              max={100}
              step={5}
              suffix="%"
              defaultValue={50}
              ariaLabel="Image X offset"
            />

            <EditableSlider
              label="Y Offset"
              value={(backgroundStyle.cropOffsetY ?? 0.5) * 100}
              onChange={(v) => updateBackground({ cropOffsetY: v / 100 })}
              min={0}
              max={100}
              step={5}
              suffix="%"
              defaultValue={50}
              ariaLabel="Image Y offset"
            />
          </>
        )}
      </>
    );
  };

  // ============================================================================
  // COLUMN 1: BACKGROUND + FONTS
  // ============================================================================

  const renderBackgroundColumn = () => (
    <div className={drawerStyles.column}>
      <div className={drawerStyles.sectionHeader}>Background</div>
      {renderModeTabs()}
      {backgroundStyle.sourceType !== 'image' ? renderColorTabContent() : renderImageTabContent()}

      {/* Divider */}
      <div className={drawerStyles.sectionDivider} />

      {/* Fonts Section (placeholder) */}
      <div className={drawerStyles.sectionHeader}>Fonts</div>
      <div className={drawerStyles.controlRow}>
        <span className={drawerStyles.controlLabel} style={{ color: 'var(--text-muted)' }}>
          Font settings coming soon
        </span>
      </div>
    </div>
  );

  // ============================================================================
  // COLUMN 2: MARGINS
  // ============================================================================

  const renderMarginsColumn = () => {
    // Each tab type has its own margins
    const margins =
      activeTab === 'nightOrder'
        ? no.margins
        : activeTab === 'backingSheet'
          ? bs.margins
          : ps.margins;
    const defaults =
      activeTab === 'nightOrder' ? DEFAULT_NIGHT_ORDER_SETTINGS.margins : DEFAULT_MARGINS;

    return (
      <div className={drawerStyles.column}>
        <div className={drawerStyles.sectionHeader}>Page Margins</div>

        <EditableSlider
          label="Top"
          value={margins.top}
          onChange={(v) => updateMargin('top', v)}
          min={0}
          max={1}
          step={0.05}
          suffix='"'
          defaultValue={defaults.top}
          ariaLabel="Top margin"
        />

        <EditableSlider
          label="Bottom"
          value={margins.bottom}
          onChange={(v) => updateMargin('bottom', v)}
          min={0}
          max={1}
          step={0.05}
          suffix='"'
          defaultValue={defaults.bottom}
          ariaLabel="Bottom margin"
        />

        <EditableSlider
          label="Left"
          value={margins.left}
          onChange={(v) => updateMargin('left', v)}
          min={0}
          max={1}
          step={0.05}
          suffix='"'
          defaultValue={defaults.left}
          ariaLabel="Left margin"
        />

        <EditableSlider
          label="Right"
          value={margins.right}
          onChange={(v) => updateMargin('right', v)}
          min={0}
          max={1}
          step={0.05}
          suffix='"'
          defaultValue={defaults.right}
          ariaLabel="Right margin"
        />

        {/* Icon Sizing Section - per-tab scale */}
        <div className={drawerStyles.sectionDivider} />
        <div className={drawerStyles.sectionHeader}>Icon Sizing</div>

        {activeTab === 'playerScript' && (
          <EditableSlider
            label="Scale"
            value={ps.iconScale * 100}
            onChange={(v) => updatePS('iconScale', v / 100)}
            min={50}
            max={200}
            step={5}
            suffix="%"
            defaultValue={100}
            ariaLabel="Player Script icon scale"
          />
        )}
        {activeTab === 'backingSheet' && (
          <EditableSlider
            label="Scale"
            value={bs.iconScale * 100}
            onChange={(v) => updateBS('iconScale', v / 100)}
            min={50}
            max={200}
            step={5}
            suffix="%"
            defaultValue={100}
            ariaLabel="Backing Sheet icon scale"
          />
        )}
        {activeTab === 'nightOrder' && (
          <EditableSlider
            label="Scale"
            value={no.iconScale * 100}
            onChange={(v) => updateNO('iconScale', v / 100)}
            min={50}
            max={200}
            step={5}
            suffix="%"
            defaultValue={100}
            ariaLabel="Night Order icon scale"
          />
        )}
      </div>
    );
  };

  // ============================================================================
  // COLUMN 3: TYPE-SPECIFIC SETTINGS
  // ============================================================================

  const renderSettingsColumn = () => {
    if (activeTab === 'playerScript') {
      return renderPlayerScriptSettings();
    }
    if (activeTab === 'backingSheet') {
      return renderBackingSheetSettings();
    }
    return renderNightOrderSettings();
  };

  /** Player Script specific settings */
  const renderPlayerScriptSettings = () => (
    <div className={drawerStyles.column}>
      <div className={drawerStyles.sectionHeader}>Header</div>

      <div className={drawerStyles.controlRow}>
        <span className={drawerStyles.controlLabel}>Title Style</span>
        <select
          value={ps.titleStyle}
          onChange={(e) => updatePS('titleStyle', e.target.value as 'centered' | 'compact')}
          className={drawerStyles.typeSelect}
        >
          <option value="centered">Centered</option>
          <option value="compact">Compact</option>
        </select>
      </div>

      <div className={drawerStyles.controlRow}>
        <label className={drawerStyles.effectCheckbox}>
          <input
            type="checkbox"
            checked={ps.showAuthor}
            onChange={(e) => updatePS('showAuthor', e.target.checked)}
          />
          Show author
        </label>
      </div>

      <div className={drawerStyles.controlRow}>
        <label className={drawerStyles.effectCheckbox}>
          <input
            type="checkbox"
            checked={ps.showVersion}
            onChange={(e) => updatePS('showVersion', e.target.checked)}
          />
          Show version
        </label>
      </div>

      <div className={drawerStyles.sectionDivider} />
      <div className={drawerStyles.sectionHeader}>Layout</div>

      <div className={drawerStyles.controlRow}>
        <span className={drawerStyles.controlLabel}>Columns</span>
        <select
          value={String(ps.columns)}
          onChange={(e) => {
            updatePS('columns', Number(e.target.value) as 1 | 2);
          }}
          className={drawerStyles.typeSelect}
        >
          <option value="1">1 Column</option>
          <option value="2">2 Columns</option>
        </select>
      </div>

      <div className={drawerStyles.controlRow}>
        <label className={drawerStyles.effectCheckbox}>
          <input
            type="checkbox"
            checked={ps.showJinxIconsInline}
            onChange={(e) => updatePS('showJinxIconsInline', e.target.checked)}
          />
          Show Jinxes In-line
        </label>
      </div>
    </div>
  );

  /** Backing Sheet specific settings */
  const renderBackingSheetSettings = () => (
    <div className={drawerStyles.column}>
      <div className={drawerStyles.sectionHeader}>Layout</div>

      <div className={drawerStyles.controlRow}>
        <span className={drawerStyles.controlLabel}>Center</span>
        <select
          value={bs.backingContent}
          onChange={(e) => updateBS('backingContent', e.target.value as 'none' | 'name' | 'logo')}
          className={drawerStyles.typeSelect}
        >
          <option value="none">None</option>
          <option value="name">Script Name</option>
          <option value="logo">Script Logo</option>
        </select>
      </div>

      {bs.backingContent === 'logo' && (
        <EditableSlider
          label="Logo Scale"
          value={bs.logoScale * 100}
          onChange={(v) => updateBS('logoScale', v / 100)}
          min={50}
          max={200}
          step={5}
          suffix="%"
          defaultValue={100}
          ariaLabel="Logo scale"
        />
      )}

      <div className={drawerStyles.sectionDivider} />
      <div className={drawerStyles.sectionHeader}>Additional Information</div>

      <div className={drawerStyles.controlRow}>
        <label className={drawerStyles.effectCheckbox}>
          <input
            type="checkbox"
            checked={bs.showJinxes}
            onChange={(e) => updateBS('showJinxes', e.target.checked)}
          />
          Jinxes
        </label>
      </div>

      <div className={drawerStyles.controlRow}>
        <label className={drawerStyles.effectCheckbox}>
          <input
            type="checkbox"
            checked={bs.showFabled}
            onChange={(e) => updateBS('showFabled', e.target.checked)}
          />
          Fabled
        </label>
      </div>

      <div className={drawerStyles.controlRow}>
        <label className={drawerStyles.effectCheckbox}>
          <input
            type="checkbox"
            checked={bs.showTravellers}
            onChange={(e) => updateBS('showTravellers', e.target.checked)}
          />
          Travellers
        </label>
      </div>

      <div className={drawerStyles.controlRow}>
        <label className={drawerStyles.effectCheckbox}>
          <input
            type="checkbox"
            checked={bs.showBootlegger}
            onChange={(e) => updateBS('showBootlegger', e.target.checked)}
          />
          Bootlegger
        </label>
      </div>

      <div className={drawerStyles.controlRow}>
        <label className={drawerStyles.effectCheckbox}>
          <input
            type="checkbox"
            checked={bs.showLoric}
            onChange={(e) => updateBS('showLoric', e.target.checked)}
          />
          Loric
        </label>
      </div>

      <div className={drawerStyles.sectionDivider} />
      <div className={drawerStyles.sectionHeader}>Options</div>

      <div className={drawerStyles.controlRow}>
        <label className={drawerStyles.effectCheckbox}>
          <input
            type="checkbox"
            checked={bs.showNightOrderOnBack}
            onChange={(e) => updateBS('showNightOrderOnBack', e.target.checked)}
          />
          Night order icons
        </label>
      </div>

      <div className={drawerStyles.controlRow}>
        <label className={drawerStyles.effectCheckbox}>
          <input
            type="checkbox"
            checked={bs.showPlayerCountOnBack}
            onChange={(e) => updateBS('showPlayerCountOnBack', e.target.checked)}
          />
          Player count table
        </label>
      </div>
    </div>
  );

  /** Night Order specific settings */
  const renderNightOrderSettings = () => (
    <div className={drawerStyles.column}>
      <div className={drawerStyles.sectionHeader}>Options</div>

      <div className={drawerStyles.controlRow}>
        <label className={drawerStyles.effectCheckbox}>
          <input
            type="checkbox"
            checked={no.scaleIcons}
            onChange={(e) => updateNO('scaleIcons', e.target.checked)}
          />
          Scale icons to fit
        </label>
      </div>

      <div className={drawerStyles.controlRow}>
        <label className={drawerStyles.effectCheckbox}>
          <input
            type="checkbox"
            checked={no.showDecorations}
            onChange={(e) => updateNO('showDecorations', e.target.checked)}
          />
          Show decorations
        </label>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <SettingsDrawer
        isOpen={isOpen}
        onClose={onClose}
        onApply={onApply}
        onReset={onReset}
        title="Script PDF Settings"
        titleIcon="📄"
        headerSlot={headerSlot}
        ariaLabel="Script PDF settings drawer"
      >
        {renderBackgroundColumn()}
        {renderMarginsColumn()}
        {renderSettingsColumn()}
      </SettingsDrawer>

      {/* Asset Manager Modal for image selection */}
      {isImageModalOpen && (
        <AssetManagerModal
          isOpen={isImageModalOpen}
          onClose={() => setIsImageModalOpen(false)}
          projectId={projectId}
          initialAssetType="script-background"
          selectionMode={true}
          onSelectAsset={handleImageSelect}
          includeBuiltIn={true}
          showNoneOption={false}
        />
      )}
    </>
  );
}
