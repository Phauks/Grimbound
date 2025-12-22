/**
 * Border Settings Component
 *
 * Expandable panel for configuring border width and color.
 * Uses SettingsSelectorBase pattern for consistent UI with other settings.
 */

import { memo, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { EditableSlider } from '@/components/Shared/Controls/EditableSlider';
import {
  EnableToggle,
  InfoSection,
  PreviewBox,
  SettingsSelectorBase,
} from '@/components/Shared/Selectors/SettingsSelectorBase';
import { type PanelPosition, useExpandablePanel } from '@/hooks/ui/useExpandablePanel';
import baseStyles from '@/styles/components/shared/SettingsSelectorBase.module.css';
import styles from '@/styles/components/studio/Studio.module.css';
import { cn } from '@/ts/utils/classNames.js';

export interface BorderSettingsProps {
  enabled: boolean;
  borderWidth: number;
  borderColor: string;
  onToggle: (enabled: boolean) => void;
  onWidthChange: (width: number) => void;
  onColorChange: (color: string) => void;
  disabled?: boolean;
}

/** Render border panel content in portal */
const BorderPanelContent = memo(function BorderPanelContent({
  panelRef,
  panelPosition,
  borderWidth,
  borderColor,
  onWidthChange,
  onColorChange,
  onReset,
  onClose,
}: {
  panelRef: React.RefObject<HTMLDivElement>;
  panelPosition: PanelPosition;
  borderWidth: number;
  borderColor: string;
  onWidthChange: (width: number) => void;
  onColorChange: (color: string) => void;
  onReset: () => void;
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
        {/* Width Slider */}
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
        <button type="button" className={baseStyles.resetLink} onClick={onReset}>
          Reset
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

export const BorderSettings = memo(function BorderSettings({
  enabled,
  borderWidth,
  borderColor,
  onToggle,
  onWidthChange,
  onColorChange,
  disabled = false,
}: BorderSettingsProps) {
  const panelValue = useMemo(
    () => ({ width: borderWidth, color: borderColor }),
    [borderWidth, borderColor]
  );

  const { isExpanded, panelPosition, containerRef, panelRef, toggle, close, handleKeyDown } =
    useExpandablePanel({
      value: panelValue,
      onChange: () => {},
      disabled,
      panelHeight: 180,
      autoApplyOnClose: false,
    });

  const summaryText = enabled ? `${borderWidth}px` : 'None';

  const handleReset = useCallback(() => {
    onWidthChange(3);
    onColorChange('#FFFFFF');
  }, [onWidthChange, onColorChange]);

  const borderPreviewStyle: React.CSSProperties = enabled
    ? { border: `${Math.min(borderWidth, 4)}px solid ${borderColor}` }
    : { border: '2px solid var(--border-color)' };

  return (
    <SettingsSelectorBase
      ref={containerRef}
      preview={
        <PreviewBox shape="circle" size="medium">
          <div
            className={cn(styles.borderPreview, enabled ? styles.enabled : styles.disabled)}
            style={borderPreviewStyle}
          />
        </PreviewBox>
      }
      info={<InfoSection label="Border" summary={summaryText} />}
      headerSlot={<EnableToggle enabled={enabled} onChange={onToggle} disabled={disabled} />}
      actionLabel="Customize"
      onAction={toggle}
      isExpanded={isExpanded}
      disabled={disabled}
      visuallyDisabled={!enabled}
      size="medium"
      ariaLabel="Border settings"
      onKeyDown={handleKeyDown}
    >
      {isExpanded && panelPosition && (
        <BorderPanelContent
          panelRef={panelRef}
          panelPosition={panelPosition}
          borderWidth={borderWidth}
          borderColor={borderColor}
          onWidthChange={onWidthChange}
          onColorChange={onColorChange}
          onReset={handleReset}
          onClose={close}
        />
      )}
    </SettingsSelectorBase>
  );
});
