/**
 * Studio View - Simple Asset Editor
 *
 * A simplified image editor for editing assets in the asset manager.
 * Features: background removal, team color application, save/export.
 *
 * Uses standard 2-panel ViewLayout matching other views.
 * Uses SettingsSelectorBase pattern for consistent UI with TokensView.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ViewLayout } from '@/components/Layout/ViewLayout';
import { AssetManagerModal } from '@/components/Modals/AssetManagerModal';
import { EditableSlider } from '@/components/Shared/Controls/EditableSlider';
import {
  EnableToggle,
  InfoSection,
  PreviewBox,
  SettingsSelectorBase,
} from '@/components/Shared/Selectors/SettingsSelectorBase';
import { useAssetStorageService } from '@/contexts/ServiceContext';
import { useTokenContext } from '@/contexts/TokenContext';
import { useAssetEditor } from '@/hooks/studio/useAssetEditor';
import layoutStyles from '@/styles/components/layout/ViewLayout.module.css';
import baseStyles from '@/styles/components/shared/SettingsSelectorBase.module.css';
import styles from '@/styles/components/studio/Studio.module.css';
import { consumePendingStudioOperation } from '@/ts/studio/navigationHelpers.js';
import type { TeamColorPreset } from '@/ts/studio/iconColorReplacer.js';
import { extractAssetId, isAssetReference } from '@/ts/types/index.js';
import { cn } from '@/ts/utils/classNames.js';
import { logger } from '@/ts/utils/logger.js';

// ============================================================================
// Team Color Settings Component
// ============================================================================

interface TeamColorSettingsProps {
  enabled: boolean;
  selectedPreset: TeamColorPreset | null;
  customColor: string | null;
  presets: TeamColorPreset[];
  colorPickerValue: string;
  onColorPickerChange: (color: string) => void;
  onToggle: (enabled: boolean) => void;
  onPresetSelect: (preset: TeamColorPreset | null) => void;
  onCustomColor: (color: string) => void;
  onInvert: () => void;
  disabled?: boolean;
}

/** Preview circle that shows split colors for Traveler */
const TeamColorPreview = memo(function TeamColorPreview({
  preset,
  customColor,
  enabled,
}: {
  preset: TeamColorPreset | null;
  customColor: string | null;
  enabled: boolean;
}) {
  // Check if this is a split color preset (Traveler)
  const isSplit = preset?.splitConfig !== undefined;

  if (!enabled) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: 'var(--bg-tertiary)',
          border: '2px solid var(--border-color)',
          opacity: 0.5,
        }}
      />
    );
  }

  if (customColor) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: customColor,
          border: '2px solid var(--border-color)',
        }}
      />
    );
  }

  if (isSplit && preset?.splitConfig) {
    // Split preview for Traveler - left blue, right red
    const leftHue = preset.splitConfig.leftHue;
    const rightHue = preset.splitConfig.rightHue;
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: `linear-gradient(90deg, hsl(${leftHue}, 60%, 45%) 50%, hsl(${rightHue}, 70%, 40%) 50%)`,
          border: '2px solid var(--border-color)',
        }}
      />
    );
  }

  if (preset?.targetHue !== undefined) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: `hsl(${preset.targetHue}, 60%, 50%)`,
          border: '2px solid var(--border-color)',
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        background: 'var(--bg-tertiary)',
        border: '2px solid var(--border-color)',
      }}
    />
  );
});

const TeamColorSettings = memo(function TeamColorSettings({
  enabled,
  selectedPreset,
  customColor,
  presets,
  colorPickerValue,
  onColorPickerChange,
  onToggle,
  onPresetSelect,
  onCustomColor,
  onInvert,
  disabled = false,
}: TeamColorSettingsProps) {
  // Simple panel state - no pending values, apply immediately
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPosition, setPanelPosition] = useState<{
    top: number;
    left: number;
    width: number;
    openUpward: boolean;
  } | null>(null);

  // Calculate panel position when opening
  useEffect(() => {
    if (isExpanded && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const panelHeight = 220;
      const openUpward = spaceBelow < panelHeight && rect.top > spaceBelow;

      setPanelPosition({
        top: openUpward ? rect.top - 4 : rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 280),
        openUpward,
      });
    }
  }, [isExpanded]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        isExpanded &&
        !containerRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  // Get summary text
  const summaryText = useMemo(() => {
    if (!enabled) return 'None';
    if (customColor) return 'Custom';
    if (selectedPreset) return selectedPreset.displayName;
    return 'None';
  }, [enabled, customColor, selectedPreset]);

  // Handle toggle change - open panel when enabling
  const handleToggle = useCallback(
    (newEnabled: boolean) => {
      if (newEnabled && !enabled) {
        // Opening - expand panel to let user pick
        setIsExpanded(true);
      } else if (!newEnabled) {
        // Turning off - clear selection
        onPresetSelect(null);
        setIsExpanded(false);
      }
      onToggle(newEnabled);
    },
    [enabled, onToggle, onPresetSelect]
  );

  // Handle preset click - apply immediately
  const handlePresetClick = useCallback(
    (preset: TeamColorPreset) => {
      onPresetSelect(preset);
    },
    [onPresetSelect]
  );

  // Handle custom color apply - apply immediately
  const handleCustomColorApply = useCallback(() => {
    onCustomColor(colorPickerValue);
  }, [colorPickerValue, onCustomColor]);

  // Handle clear/reset
  const handleClear = useCallback(() => {
    onPresetSelect(null);
  }, [onPresetSelect]);

  // Toggle panel
  const togglePanel = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Keyboard handler
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsExpanded(false);
    }
  }, []);

  // Render the expandable panel via portal
  const renderPanel = () => {
    if (!(isExpanded && panelPosition)) return null;

    const panelStyle: React.CSSProperties = {
      position: 'fixed',
      top: panelPosition.openUpward ? 'auto' : panelPosition.top,
      bottom: panelPosition.openUpward ? window.innerHeight - panelPosition.top : 'auto',
      left: panelPosition.left,
      width: panelPosition.width,
      zIndex: 10000,
    };

    return createPortal(
      <div
        ref={panelRef}
        className={`${baseStyles.panel} ${panelPosition.openUpward ? baseStyles.panelUpward : ''}`}
        style={panelStyle}
      >
        <div className={baseStyles.panelContent}>
          {/* Preset Buttons */}
          <div className={baseStyles.settingSection}>
            <div className={baseStyles.settingLabel}>Presets</div>
            <div className={styles.toolsRow}>
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={cn(
                    styles.presetButton,
                    selectedPreset?.id === preset.id && !customColor && styles.selected
                  )}
                  data-team={preset.name}
                  onClick={() => handlePresetClick(preset)}
                >
                  {preset.displayName}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Color */}
          <div className={baseStyles.settingSection}>
            <div className={baseStyles.settingLabel}>Custom Color</div>
            <div className={styles.customColorRow}>
              <input
                type="color"
                value={colorPickerValue}
                onChange={(e) => onColorPickerChange(e.target.value)}
                className={styles.colorPicker}
              />
              <button
                type="button"
                className={cn(styles.presetButton, customColor === colorPickerValue && styles.selected)}
                onClick={handleCustomColorApply}
              >
                Apply Custom
              </button>
              <button type="button" className={styles.presetButton} onClick={onInvert}>
                Invert
              </button>
            </div>
          </div>
        </div>

        {/* Panel Footer */}
        <div className={baseStyles.panelFooter}>
          <button
            type="button"
            className={baseStyles.resetLink}
            onClick={handleClear}
            disabled={!selectedPreset && !customColor}
          >
            Clear
          </button>
          <div className={baseStyles.panelActions}>
            <button
              type="button"
              className={baseStyles.confirmButton}
              onClick={() => setIsExpanded(false)}
            >
              Done
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <SettingsSelectorBase
      ref={containerRef}
      preview={
        <PreviewBox shape="circle" size="medium">
          <TeamColorPreview preset={selectedPreset} customColor={customColor} enabled={enabled} />
        </PreviewBox>
      }
      info={<InfoSection label="Team Color" summary={summaryText} />}
      headerSlot={<EnableToggle enabled={enabled} onChange={handleToggle} disabled={disabled} />}
      actionLabel="Customize"
      onAction={togglePanel}
      isExpanded={isExpanded}
      disabled={disabled}
      visuallyDisabled={!enabled}
      size="medium"
      ariaLabel="Team color settings"
      onKeyDown={handleKeyDown}
    >
      {renderPanel()}
    </SettingsSelectorBase>
  );
});

// ============================================================================
// Border Settings Component
// ============================================================================

interface BorderSettingsProps {
  enabled: boolean;
  borderWidth: number;
  borderColor: string;
  onToggle: (enabled: boolean) => void;
  onWidthChange: (width: number) => void;
  onColorChange: (color: string) => void;
  disabled?: boolean;
}

const BorderSettings = memo(function BorderSettings({
  enabled,
  borderWidth,
  borderColor,
  onToggle,
  onWidthChange,
  onColorChange,
  disabled = false,
}: BorderSettingsProps) {
  // Simple panel state - apply changes immediately
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPosition, setPanelPosition] = useState<{
    top: number;
    left: number;
    width: number;
    openUpward: boolean;
  } | null>(null);

  // Calculate panel position when opening
  useEffect(() => {
    if (isExpanded && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const panelHeight = 180;
      const openUpward = spaceBelow < panelHeight && rect.top > spaceBelow;

      setPanelPosition({
        top: openUpward ? rect.top - 4 : rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 280),
        openUpward,
      });
    }
  }, [isExpanded]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        isExpanded &&
        !containerRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  // Summary text
  const summaryText = useMemo(() => {
    if (!enabled) return 'None';
    return `${borderWidth}px`;
  }, [enabled, borderWidth]);

  // Toggle panel
  const togglePanel = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Keyboard handler
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsExpanded(false);
    }
  }, []);

  // Handle reset
  const handleReset = useCallback(() => {
    onWidthChange(3);
    onColorChange('#FFFFFF');
  }, [onWidthChange, onColorChange]);

  // Render the expandable panel via portal
  const renderPanel = () => {
    if (!(isExpanded && panelPosition)) return null;

    const panelStyle: React.CSSProperties = {
      position: 'fixed',
      top: panelPosition.openUpward ? 'auto' : panelPosition.top,
      bottom: panelPosition.openUpward ? window.innerHeight - panelPosition.top : 'auto',
      left: panelPosition.left,
      width: panelPosition.width,
      zIndex: 10000,
    };

    return createPortal(
      <div
        ref={panelRef}
        className={`${baseStyles.panel} ${panelPosition.openUpward ? baseStyles.panelUpward : ''}`}
        style={panelStyle}
      >
        <div className={baseStyles.panelContent}>
          {/* Width Slider - using EditableSlider */}
          <div className={baseStyles.settingSection}>
            <EditableSlider
              label="Width"
              value={borderWidth}
              onChange={onWidthChange}
              min={1}
              max={10}
              step={1}
              suffix="px"
              defaultValue={3}
              ariaLabel="Border width"
            />
          </div>

          {/* Color Picker */}
          <div className={baseStyles.settingSection}>
            <div className={baseStyles.settingLabel}>Color</div>
            <input
              type="color"
              value={borderColor}
              onChange={(e) => onColorChange(e.target.value)}
              className={styles.colorPicker}
              style={{ width: '100%', height: '36px' }}
            />
          </div>
        </div>

        {/* Panel Footer */}
        <div className={baseStyles.panelFooter}>
          <button type="button" className={baseStyles.resetLink} onClick={handleReset}>
            Reset
          </button>
          <div className={baseStyles.panelActions}>
            <button
              type="button"
              className={baseStyles.confirmButton}
              onClick={() => setIsExpanded(false)}
            >
              Done
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <SettingsSelectorBase
      ref={containerRef}
      preview={
        <PreviewBox shape="circle" size="medium">
          <div
            style={{
              width: '70%',
              height: '70%',
              borderRadius: '50%',
              background: 'var(--bg-tertiary)',
              border: enabled
                ? `${Math.min(borderWidth, 4)}px solid ${borderColor}`
                : '2px solid var(--border-color)',
              opacity: enabled ? 1 : 0.5,
            }}
          />
        </PreviewBox>
      }
      info={<InfoSection label="Border" summary={summaryText} />}
      headerSlot={<EnableToggle enabled={enabled} onChange={onToggle} disabled={disabled} />}
      actionLabel="Customize"
      onAction={togglePanel}
      isExpanded={isExpanded}
      disabled={disabled}
      visuallyDisabled={!enabled}
      size="medium"
      ariaLabel="Border settings"
      onKeyDown={handleKeyDown}
    >
      {renderPanel()}
    </SettingsSelectorBase>
  );
});

// ============================================================================
// Main Studio View Component
// ============================================================================

export function StudioView() {
  const assetStorageService = useAssetStorageService();
  const { generationOptions } = useTokenContext();

  const {
    currentCanvas,
    loadedAssetName,
    isLoading,
    isProcessing,
    processingMessage,
    hasChanges,
    selectedPreset,
    customColor,
    borderOptions,
    error,
    loadFromFile,
    loadFromAsset,
    applyTeamColor,
    applyCustomColor,
    applyBorder,
    removeBorder,
    invertColors,
    undo,
    reset,
    clear,
    save,
    canUndo,
    canReset,
    presets,
  } = useAssetEditor();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveAsNew, setSaveAsNew] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [colorPickerValue, setColorPickerValue] = useState('#3B5998');
  const [borderWidth, setBorderWidth] = useState(3);
  const [borderColor, setBorderColor] = useState('#FFFFFF');

  // Sync border UI state with current border options from hook
  useEffect(() => {
    if (borderOptions) {
      setBorderWidth(borderOptions.width);
      setBorderColor(borderOptions.color);
    }
  }, [borderOptions]);

  // Team color is considered "enabled" if we have a preset or custom color
  const isTeamColorEnabled = selectedPreset !== null || customColor !== null;

  // Border is considered "enabled" if we have border options
  const isBorderEnabled = borderOptions !== null;

  // Handle team color toggle
  const handleTeamColorToggle = useCallback(
    (enabled: boolean) => {
      if (!enabled) {
        applyTeamColor(null);
      }
      // If enabling without a selection, don't auto-apply - user will pick from panel
    },
    [applyTeamColor]
  );

  // Handle border toggle
  const handleBorderToggle = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        applyBorder({ width: borderWidth, color: borderColor });
      } else {
        removeBorder();
      }
    },
    [borderWidth, borderColor, applyBorder, removeBorder]
  );

  // Live update border when settings change (only if border is already applied)
  // skipUndo=true prevents undo history pollution from slider movements
  const handleBorderWidthChange = useCallback(
    (newWidth: number) => {
      setBorderWidth(newWidth);
      if (borderOptions) {
        applyBorder({ width: newWidth, color: borderColor }, true);
      }
    },
    [borderOptions, borderColor, applyBorder]
  );

  const handleBorderColorChange = useCallback(
    (newColor: string) => {
      setBorderColor(newColor);
      if (borderOptions) {
        applyBorder({ width: borderWidth, color: newColor }, true);
      }
    },
    [borderOptions, borderWidth, applyBorder]
  );

  // Check for pending navigation operations (e.g., "Edit in Studio" from TokenGrid)
  useEffect(() => {
    const pendingOp = consumePendingStudioOperation();
    if (!pendingOp) return;

    const loadPendingOperation = async () => {
      try {
        logger.info('StudioView', 'Loading pending operation:', pendingOp.type, pendingOp.metadata);

        if (pendingOp.type === 'loadFromBlob' && pendingOp.data instanceof Blob) {
          await loadFromFile(pendingOp.data);
        } else if (pendingOp.type === 'loadFromUrl' && typeof pendingOp.data === 'string') {
          // Fetch the URL and load as file
          const response = await fetch(pendingOp.data);
          const blob = await response.blob();
          await loadFromFile(blob);
        } else if (pendingOp.type === 'loadFromAsset' && typeof pendingOp.data === 'string') {
          await loadFromAsset(pendingOp.data, pendingOp.metadata?.characterName);
        }
      } catch (err) {
        logger.error('StudioView', 'Failed to load pending operation', err);
      }
    };

    loadPendingOperation();
  }, [loadFromFile, loadFromAsset]);

  // Generate preview URL from canvas
  const previewUrl = useMemo(() => {
    if (!currentCanvas) return null;
    return currentCanvas.toDataURL('image/png');
  }, [currentCanvas]);

  // Handle file selection
  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        loadFromFile(file);
      }
      // Reset input for re-selection
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [loadFromFile]
  );

  // Handle asset selection from modal
  const handleAssetSelect = useCallback(
    async (assetIdOrRef: string) => {
      setShowAssetModal(false);

      if (assetIdOrRef === 'none') return;

      try {
        // Extract actual asset ID from reference if needed
        const assetId = isAssetReference(assetIdOrRef)
          ? extractAssetId(assetIdOrRef)
          : assetIdOrRef;

        // Get asset metadata for name
        const asset = await assetStorageService.getById(assetId);
        const assetName = asset?.metadata?.filename || 'Asset';

        await loadFromAsset(assetId, assetName);
      } catch (err) {
        logger.error('StudioView', 'Failed to load selected asset', err);
      }
    },
    [assetStorageService, loadFromAsset]
  );

  // Handle drag and drop
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragging(false);

      const file = event.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        await loadFromFile(file);
      }
    },
    [loadFromFile]
  );

  // Handle paste from clipboard
  useEffect(() => {
    const handlePaste = async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            await loadFromFile(blob);
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [loadFromFile]);

  // Handle save modal
  const handleSaveClick = useCallback((asNew: boolean) => {
    setSaveAsNew(asNew);
    setShowSaveModal(true);
  }, []);

  const handleSaveConfirm = useCallback(async () => {
    if (!saveName.trim()) return;

    try {
      await save(saveName.trim(), !saveAsNew);
      setShowSaveModal(false);
      setSaveName('');
    } catch {
      // Error is handled in the hook
    }
  }, [save, saveName, saveAsNew]);

  const handleSaveCancel = useCallback(() => {
    setShowSaveModal(false);
    setSaveName('');
  }, []);

  // Set default save name from loaded asset
  useEffect(() => {
    if (showSaveModal && loadedAssetName) {
      setSaveName(saveAsNew ? `${loadedAssetName}_edited` : loadedAssetName);
    }
  }, [showSaveModal, loadedAssetName, saveAsNew]);

  const hasImage = currentCanvas !== null;

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      <ViewLayout variant="2-panel">
        {/* Left Sidebar - Tools */}
        <ViewLayout.Panel position="left" width="left" scrollable>
          <div className={layoutStyles.panelContent}>
            {/* Load Image Section */}
            <details className={layoutStyles.sidebarCard} open>
              <summary className={layoutStyles.sectionHeader}>Load Image</summary>
              <div className={layoutStyles.optionSection}>
                <div className={styles.toolsRow}>
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={() => setShowAssetModal(true)}
                    disabled={isProcessing}
                  >
                    From Assets
                  </button>
                  <button
                    type="button"
                    className={cn(styles.actionButton, styles.secondary)}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                  >
                    From File
                  </button>
                </div>
                <p className={styles.helpText}>
                  Or drag & drop an image, or paste from clipboard (Ctrl+V)
                </p>
              </div>
            </details>

            {/* Team Color Settings */}
            <TeamColorSettings
              enabled={isTeamColorEnabled}
              selectedPreset={selectedPreset}
              customColor={customColor}
              presets={presets}
              colorPickerValue={colorPickerValue}
              onColorPickerChange={setColorPickerValue}
              onToggle={handleTeamColorToggle}
              onPresetSelect={applyTeamColor}
              onCustomColor={applyCustomColor}
              onInvert={invertColors}
              disabled={!hasImage || isProcessing}
            />

            {/* Border Settings */}
            <BorderSettings
              enabled={isBorderEnabled}
              borderWidth={borderWidth}
              borderColor={borderColor}
              onToggle={handleBorderToggle}
              onWidthChange={handleBorderWidthChange}
              onColorChange={handleBorderColorChange}
              disabled={!hasImage || isProcessing}
            />

            {/* Actions Section */}
            <details className={layoutStyles.sidebarCard} open>
              <summary className={layoutStyles.sectionHeader}>Actions</summary>
              <div className={layoutStyles.optionSection}>
                <div className={styles.toolsRow}>
                  <button
                    type="button"
                    className={cn(styles.actionButton, styles.secondary)}
                    onClick={undo}
                    disabled={!canUndo || isProcessing}
                  >
                    Undo
                  </button>
                  <button
                    type="button"
                    className={cn(styles.actionButton, styles.secondary)}
                    onClick={reset}
                    disabled={!canReset || isProcessing}
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    className={cn(styles.actionButton, styles.secondary)}
                    onClick={clear}
                    disabled={!hasImage || isProcessing}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </details>

            {/* Save Section */}
            <details className={layoutStyles.sidebarCard} open>
              <summary className={layoutStyles.sectionHeader}>Save</summary>
              <div className={layoutStyles.optionSection}>
                <div className={styles.toolsRow}>
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={() => handleSaveClick(false)}
                    disabled={!hasImage || isProcessing}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className={cn(styles.actionButton, styles.secondary)}
                    onClick={() => handleSaveClick(true)}
                    disabled={!hasImage || isProcessing}
                  >
                    Save as New
                  </button>
                </div>
              </div>
            </details>
          </div>
        </ViewLayout.Panel>

        {/* Right Content - Image Preview */}
        <ViewLayout.Panel position="right" width="flex" scrollable>
          <div
            className={styles.editorContent}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              outline: isDragging ? '3px dashed var(--color-accent)' : 'none',
              outlineOffset: '-10px',
            }}
          >
            {/* Error message */}
            {error && <div className={styles.errorMessage}>{error}</div>}

            {/* Empty state */}
            {!hasImage && !isLoading && (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateIcon}>🎨</div>
                <h2 className={styles.emptyStateTitle}>Asset Editor</h2>
                <p className={styles.emptyStateText}>
                  Edit character icons with background removal and team color application.
                </p>
                <div className={styles.emptyStateActions}>
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={() => setShowAssetModal(true)}
                  >
                    Load from Assets
                  </button>
                  <button
                    type="button"
                    className={cn(styles.actionButton, styles.secondary)}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Load from File
                  </button>
                </div>
                <p className={styles.helpText} style={{ marginTop: 'var(--spacing-lg)' }}>
                  You can also drag & drop an image or paste from clipboard (Ctrl+V)
                </p>
              </div>
            )}

            {/* Image preview */}
            {hasImage && previewUrl && (
              <div className={styles.previewContainer}>
                <img
                  src={previewUrl}
                  alt="Preview"
                  className={styles.imagePreview}
                />
                {currentCanvas && (
                  <div className={styles.imageDimensions}>
                    {loadedAssetName && <span className={styles.assetName}>{loadedAssetName}</span>}
                    <span>{currentCanvas.width} x {currentCanvas.height} px</span>
                    {hasChanges && <span className={styles.unsavedIndicator} title="Unsaved changes" />}
                  </div>
                )}
              </div>
            )}

            {/* Processing overlay */}
            {(isLoading || isProcessing) && (
              <div className={styles.processingOverlay}>
                <div className={styles.processingContent}>
                  <div className={styles.processingSpinner} />
                  <div className={styles.processingText}>
                    {processingMessage || (isLoading ? 'Loading...' : 'Processing...')}
                  </div>
                </div>
              </div>
            )}
          </div>
        </ViewLayout.Panel>
      </ViewLayout>

      {/* Asset Manager Modal for loading assets */}
      <AssetManagerModal
        isOpen={showAssetModal}
        onClose={() => setShowAssetModal(false)}
        projectId={undefined}
        initialAssetType="character-icon"
        selectionMode={true}
        onSelectAsset={handleAssetSelect}
        generationOptions={generationOptions}
      />

      {/* Save modal */}
      {showSaveModal && (
        <div className={styles.processingOverlay} onClick={handleSaveCancel}>
          <div
            className={styles.saveModal}
            style={{
              background: 'var(--bg-panel)',
              borderRadius: 'var(--border-radius)',
              minWidth: '300px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 var(--spacing-md) 0' }}>
              {saveAsNew ? 'Save as New Asset' : 'Save Asset'}
            </h3>
            <input
              type="text"
              className={styles.saveModalInput}
              placeholder="Asset name"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveConfirm();
                if (e.key === 'Escape') handleSaveCancel();
              }}
              autoFocus
            />
            <div className={styles.saveModalActions}>
              <button
                type="button"
                className={cn(styles.actionButton, styles.secondary)}
                onClick={handleSaveCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.actionButton}
                onClick={handleSaveConfirm}
                disabled={!saveName.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
