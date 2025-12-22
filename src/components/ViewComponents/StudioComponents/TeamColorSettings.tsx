/**
 * Team Color Settings Component
 *
 * Expandable panel for selecting team color presets or custom colors.
 * Uses SettingsSelectorBase pattern for consistent UI with other settings.
 */

import { memo, useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  EnableToggle,
  InfoSection,
  PreviewBox,
  SettingsSelectorBase,
} from '@/components/Shared/Selectors/SettingsSelectorBase';
import { type PanelPosition, useExpandablePanel } from '@/hooks/ui/useExpandablePanel';
import baseStyles from '@/styles/components/shared/SettingsSelectorBase.module.css';
import styles from '@/styles/components/studio/Studio.module.css';
import type { TeamColorPreset } from '@/ts/studio/iconColorReplacer.js';
import { cn } from '@/ts/utils/classNames.js';

/** Team color panel state */
interface TeamColorPanelValue {
  presetId: string | null;
  customColor: string | null;
  colorPickerValue: string;
}

export interface TeamColorSettingsProps {
  enabled: boolean;
  selectedPreset: TeamColorPreset | null;
  customColor: string | null;
  presets: TeamColorPreset[];
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
  const isSplit = preset?.split !== undefined;

  const getBackgroundStyle = (): string => {
    if (!enabled) return 'var(--bg-tertiary)';
    if (customColor) return customColor;
    if (isSplit && preset?.split) {
      const { left, right } = preset.split;
      return `linear-gradient(90deg, hsl(${left.hue}, 60%, 45%) 50%, hsl(${right.hue}, 70%, 40%) 50%)`;
    }
    if (preset?.targetHue !== undefined) {
      return `hsl(${preset.targetHue}, 60%, 50%)`;
    }
    return 'var(--bg-tertiary)';
  };

  return (
    <div
      className={cn(
        styles.teamColorPreview,
        !enabled && styles.disabled,
        customColor && styles.custom,
        preset && styles.preset
      )}
      style={{ background: getBackgroundStyle() }}
    />
  );
});

/** Render panel content in portal */
const TeamColorPanelContent = memo(function TeamColorPanelContent({
  panelRef,
  panelPosition,
  presets,
  selectedPresetId,
  customColor,
  colorPickerValue,
  onColorPickerChange,
  onPresetClick,
  onCustomColorApply,
  onInvert,
  onClear,
  onClose,
}: {
  panelRef: React.RefObject<HTMLDivElement>;
  panelPosition: PanelPosition;
  presets: TeamColorPreset[];
  selectedPresetId: string | null;
  customColor: string | null;
  colorPickerValue: string;
  onColorPickerChange: (color: string) => void;
  onPresetClick: (preset: TeamColorPreset) => void;
  onCustomColorApply: () => void;
  onInvert: () => void;
  onClear: () => void;
  onClose: () => void;
}) {
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
      className={cn(baseStyles.panel, panelPosition.openUpward && baseStyles.panelUpward)}
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
                  selectedPresetId === preset.id && !customColor && styles.selected
                )}
                data-team={preset.name}
                onClick={() => onPresetClick(preset)}
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
              className={cn(
                styles.presetButton,
                customColor === colorPickerValue && styles.selected
              )}
              onClick={onCustomColorApply}
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
          onClick={onClear}
          disabled={!(selectedPresetId || customColor)}
        >
          Clear
        </button>
        <div className={baseStyles.panelActions}>
          <button type="button" className={baseStyles.confirmButton} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
});

export const TeamColorSettings = memo(function TeamColorSettings({
  enabled,
  selectedPreset,
  customColor,
  presets,
  onToggle,
  onPresetSelect,
  onCustomColor,
  onInvert,
  disabled = false,
}: TeamColorSettingsProps) {
  const [colorPickerValue, setColorPickerValue] = useState('#3B5998');

  const panelValue: TeamColorPanelValue = useMemo(
    () => ({
      presetId: selectedPreset?.id ?? null,
      customColor,
      colorPickerValue,
    }),
    [selectedPreset, customColor, colorPickerValue]
  );

  const { isExpanded, panelPosition, containerRef, panelRef, toggle, close, handleKeyDown } =
    useExpandablePanel<TeamColorPanelValue>({
      value: panelValue,
      onChange: () => {},
      disabled,
      panelHeight: 220,
      autoApplyOnClose: false,
    });

  const summaryText = useMemo(() => {
    if (!enabled) return 'None';
    if (customColor) return 'Custom';
    if (selectedPreset) return selectedPreset.displayName;
    return 'None';
  }, [enabled, customColor, selectedPreset]);

  const handleToggle = useCallback(
    (newEnabled: boolean) => {
      if (newEnabled && !enabled) {
        toggle();
      } else if (!newEnabled) {
        onPresetSelect(null);
        close();
      }
      onToggle(newEnabled);
    },
    [enabled, onToggle, onPresetSelect, toggle, close]
  );

  const handlePresetClick = useCallback(
    (preset: TeamColorPreset) => {
      onPresetSelect(preset);
    },
    [onPresetSelect]
  );

  const handleCustomColorApply = useCallback(() => {
    onCustomColor(colorPickerValue);
  }, [colorPickerValue, onCustomColor]);

  const handleClear = useCallback(() => {
    onPresetSelect(null);
  }, [onPresetSelect]);

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
      onAction={toggle}
      isExpanded={isExpanded}
      disabled={disabled}
      visuallyDisabled={!enabled}
      size="medium"
      ariaLabel="Team color settings"
      onKeyDown={handleKeyDown}
    >
      {isExpanded && panelPosition && (
        <TeamColorPanelContent
          panelRef={panelRef}
          panelPosition={panelPosition}
          presets={presets}
          selectedPresetId={selectedPreset?.id ?? null}
          customColor={customColor}
          colorPickerValue={colorPickerValue}
          onColorPickerChange={setColorPickerValue}
          onPresetClick={handlePresetClick}
          onCustomColorApply={handleCustomColorApply}
          onInvert={onInvert}
          onClear={handleClear}
          onClose={close}
        />
      )}
    </SettingsSelectorBase>
  );
});
