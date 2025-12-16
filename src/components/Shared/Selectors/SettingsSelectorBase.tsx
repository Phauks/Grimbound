/**
 * SettingsSelectorBase Component
 *
 * A shared base component that provides the unified container structure for
 * all settings selector components. Handles layout, disabled states, and
 * provides slots for preview, info, header (toggle), and action button.
 *
 * This component is designed to be composed with specific selector content,
 * not used directly. Use the specific selectors (ColorPreviewSelector,
 * FontSettingsSelector, IconSettingsSelector, etc.) instead.
 *
 * @module components/Shared/SettingsSelectorBase
 */

import { forwardRef, memo } from 'react';
import styles from '../../../styles/components/shared/SettingsSelectorBase.module.css';

// ============================================================================
// Types
// ============================================================================

export interface SettingsSelectorBaseProps {
  /** Preview content (left side - visual representation) */
  preview: React.ReactNode;
  /** Info content (middle - label and summary) */
  info: React.ReactNode;
  /** Optional header slot above the action button (e.g., toggles) */
  headerSlot?: React.ReactNode;
  /** Action button text */
  actionLabel?: string;
  /** Called when action button is clicked */
  onAction?: () => void;
  /** Whether the panel is expanded */
  isExpanded?: boolean;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Whether the component is visually disabled (grayed out but interactive) */
  visuallyDisabled?: boolean;
  /** Component size variant */
  size?: 'small' | 'medium' | 'large';
  /** Aria label for accessibility */
  ariaLabel?: string;
  /** Keyboard event handler */
  onKeyDown?: (event: React.KeyboardEvent) => void;
  /** Additional className for container */
  className?: string;
  /** Children rendered after the container (e.g., portal panels) */
  children?: React.ReactNode;
}

// ============================================================================
// Component
// ============================================================================

export const SettingsSelectorBase = memo(
  forwardRef<HTMLDivElement, SettingsSelectorBaseProps>(function SettingsSelectorBase(
    {
      preview,
      info,
      headerSlot,
      actionLabel = 'Customize',
      onAction,
      isExpanded = false,
      disabled = false,
      visuallyDisabled = false,
      size = 'medium',
      ariaLabel,
      onKeyDown,
      className,
      children,
    },
    ref
  ) {
    // CSS class construction
    const containerClasses = [
      styles.container,
      size === 'small' && styles.compact,
      size === 'large' && styles.large,
      disabled && styles.disabled,
      visuallyDisabled && styles.visuallyDisabled,
      isExpanded && styles.expanded,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <>
        <div
          ref={ref}
          className={containerClasses}
          onKeyDown={onKeyDown}
          aria-label={ariaLabel}
          aria-disabled={disabled || visuallyDisabled}
        >
          {/* Preview Section */}
          <div className={styles.preview}>{preview}</div>

          {/* Info Section */}
          <div className={styles.info}>{info}</div>

          {/* Action Column (headerSlot + button stacked vertically) */}
          <div className={styles.actionColumn}>
            {/* Header Slot (e.g., toggles) */}
            {headerSlot}

            {/* Action Button */}
            <button
              type="button"
              className={styles.actionButton}
              onClick={onAction}
              disabled={disabled}
            >
              {isExpanded ? 'Done' : actionLabel}
            </button>
          </div>
        </div>

        {/* Children (portal panels, etc.) */}
        {children}
      </>
    );
  })
);

// ============================================================================
// Sub-components for composition
// ============================================================================

/** Preview wrapper with standard sizing and shape options */
export interface PreviewBoxProps {
  children: React.ReactNode;
  shape?: 'circle' | 'square';
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const PreviewBox = memo(function PreviewBox({
  children,
  shape = 'circle',
  size = 'medium',
  className,
}: PreviewBoxProps) {
  const classes = [
    styles.previewBox,
    styles[`previewBox${size.charAt(0).toUpperCase()}${size.slice(1)}`],
    shape === 'circle' ? styles.previewBoxCircle : styles.previewBoxSquare,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={classes}>{children}</div>;
});

/** Info section with primary label and optional summary */
export interface InfoSectionProps {
  label: string;
  summary?: string;
  className?: string;
}

export const InfoSection = memo(function InfoSection({
  label,
  summary,
  className,
}: InfoSectionProps) {
  return (
    <div className={`${styles.infoSection} ${className || ''}`}>
      <span className={styles.primaryLabel}>{label}</span>
      {summary && <span className={styles.summary}>{summary}</span>}
    </div>
  );
});

/** Toggle button group for headerSlot */
export interface ToggleOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface ToggleGroupProps {
  options: ToggleOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export const ToggleGroup = memo(function ToggleGroup({
  options,
  value,
  onChange,
  disabled = false,
  className,
}: ToggleGroupProps) {
  return (
    <div className={`${styles.toggleGroup} ${className || ''}`}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`${styles.toggleButton} ${value === option.value ? styles.toggleButtonActive : ''}`}
          onClick={() => onChange(option.value)}
          disabled={disabled}
        >
          {option.icon && <span className={styles.toggleIcon}>{option.icon}</span>}
          <span className={styles.toggleLabel}>{option.label}</span>
        </button>
      ))}
    </div>
  );
});

/** Enabled/Disabled toggle for sections that can be turned off */
export interface EnableToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  enabledLabel?: string;
  disabledLabel?: string;
  disabled?: boolean;
  className?: string;
}

export const EnableToggle = memo(function EnableToggle({
  enabled,
  onChange,
  enabledLabel = 'On',
  disabledLabel = 'Off',
  disabled = false,
  className,
}: EnableToggleProps) {
  return (
    <div className={`${styles.toggleGroup} ${className || ''}`}>
      {/* Off button first (left side) */}
      <button
        type="button"
        className={`${styles.toggleButton} ${!enabled ? styles.toggleButtonActive : ''}`}
        onClick={() => onChange(false)}
        disabled={disabled}
      >
        <span className={styles.toggleLabel}>{disabledLabel}</span>
      </button>
      {/* On button second (right side) */}
      <button
        type="button"
        className={`${styles.toggleButton} ${enabled ? styles.toggleButtonActive : ''}`}
        onClick={() => onChange(true)}
        disabled={disabled}
      >
        <span className={styles.toggleLabel}>{enabledLabel}</span>
      </button>
    </div>
  );
});

export default SettingsSelectorBase;
