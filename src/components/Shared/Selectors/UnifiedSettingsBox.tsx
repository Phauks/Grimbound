/**
 * UnifiedSettingsBox Component
 *
 * A flexible, unified component for all settings selectors in the application.
 * Replaces FontSettingsSelector, IconSettingsSelector, ColorPreviewSelector,
 * and AssetPreviewSelector with a single, configurable component.
 *
 * Features:
 * - Multiple modes: color, asset, font, icon, background (color/image toggle)
 * - Integrated toggles inside the preview box (color/image, enabled/disabled)
 * - Portal-based expandable panels with smart positioning
 * - Consistent state management, keyboard handling, and click-outside behavior
 * - Reset/Cancel/Apply workflow
 *
 * @module components/Shared/UnifiedSettingsBox
 */

import {
  type CSSProperties,
  memo,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import styles from '@/styles/components/shared/UnifiedSettingsBox.module.css';

// ============================================================================
// Types
// ============================================================================

/** Available box modes */
export type BoxMode =
  | 'color' // Single color selection
  | 'asset' // Single asset selection
  | 'font' // Font family, color, spacing, shadow
  | 'icon' // Scale, offsetX, offsetY
  | 'background' // Toggle between color and image
  | 'font-toggleable' // Font settings with enabled/disabled toggle
  | 'accent'; // Asset + multiple sliders (leaves)

/** Toggle configuration for modes with switching */
export interface ToggleConfig {
  /** Current active option */
  activeOption: string;
  /** Available options to toggle between */
  options: Array<{
    value: string;
    label: string;
    icon?: string;
  }>;
  /** Called when toggle changes */
  onToggle: (value: string) => void;
}

/** Panel position data */
interface PanelPosition {
  top: number;
  left: number;
  width: number;
  openUpward: boolean;
}

/** Props for the preview box area */
export interface PreviewConfig {
  /** Primary visual element (color swatch, image thumbnail, icon preview, etc.) */
  render: () => ReactNode;
  /** Optional secondary element (for toggle display) */
  badge?: ReactNode;
}

/** Props for UnifiedSettingsBox */
export interface UnifiedSettingsBoxProps<T = unknown> {
  /** Current value (shape depends on mode) */
  value: T;
  /** Called when value is committed (Apply or click-outside) */
  onChange: (value: T) => void;
  /** Called on every change for live preview */
  onPreviewChange?: (value: T) => void;

  /** Box display mode */
  mode: BoxMode;

  /** Toggle configuration (for background, font-toggleable modes) */
  toggle?: ToggleConfig;

  /** Preview box configuration */
  preview: PreviewConfig;

  /** Primary label (e.g., "Color", "Background", "Font") */
  label: string;

  /** Secondary info line (e.g., "#FFFFFF", "Dumbledor · 0px") */
  summary?: string;

  /** Panel content (what shows when expanded) */
  renderPanel: (props: {
    value: T;
    pendingValue: T;
    updateValue: (newValue: T) => void;
    updateField: <K extends keyof T>(key: K, fieldValue: T[K]) => void;
  }) => ReactNode;

  /** Default value for reset */
  defaultValue: T;

  /** Estimated panel height for positioning (default: 320) */
  panelHeight?: number;

  /** Minimum panel width (default: 300) */
  minPanelWidth?: number;

  /** Component size variant */
  size?: 'small' | 'medium' | 'large';

  /** Disabled state */
  disabled?: boolean;

  /** Aria label for accessibility */
  ariaLabel?: string;

  /** Whether this box is currently enabled (for toggleable modes) */
  enabled?: boolean;
}

// ============================================================================
// Component
// ============================================================================

function UnifiedSettingsBoxInner<T>({
  value,
  onChange,
  onPreviewChange,
  mode: _mode,
  toggle,
  preview,
  label,
  summary,
  renderPanel,
  defaultValue,
  panelHeight = 320,
  minPanelWidth = 300,
  size = 'medium',
  disabled = false,
  ariaLabel,
  enabled = true,
}: UnifiedSettingsBoxProps<T>) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [pendingValue, setPendingValue] = useState<T>(value);
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const originalValueRef = useRef<T>(value);

  // Sync pending value when value prop changes (and not expanded)
  useEffect(() => {
    if (!isExpanded) {
      setPendingValue(value);
    }
  }, [value, isExpanded]);

  // Calculate panel position when opening
  useLayoutEffect(() => {
    if (isExpanded && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUpward = spaceBelow < panelHeight && spaceAbove > spaceBelow;

      setPanelPosition({
        top: openUpward ? rect.top - 4 : rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, minPanelWidth),
        openUpward,
      });
    }
  }, [isExpanded, panelHeight, minPanelWidth]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInContainer = containerRef.current?.contains(target);
      const isInPanel = panelRef.current?.contains(target);

      if (!(isInContainer || isInPanel)) {
        if (isExpanded) {
          onChange(pendingValue);
        }
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded, pendingValue, onChange]);

  // Close on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (isExpanded) {
        onChange(pendingValue);
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      window.addEventListener('scroll', handleScroll, true);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isExpanded, pendingValue, onChange]);

  // Keyboard handling
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        const original = originalValueRef.current;
        setPendingValue(original);
        onPreviewChange?.(original);
        setIsExpanded(false);
      } else if (event.key === 'Enter' && isExpanded) {
        onChange(pendingValue);
        setIsExpanded(false);
      }
    },
    [isExpanded, pendingValue, onChange, onPreviewChange]
  );

  // Toggle expansion
  const handleToggle = () => {
    if (disabled) return;
    if (!isExpanded) {
      originalValueRef.current = value;
      setPendingValue(value);
    } else {
      onChange(pendingValue);
    }
    setIsExpanded(!isExpanded);
  };

  // Update entire value
  const updateValue = useCallback(
    (newValue: T) => {
      setPendingValue(newValue);
      onPreviewChange?.(newValue);
    },
    [onPreviewChange]
  );

  // Update a single field (for object values)
  const updateField = useCallback(
    <K extends keyof T>(key: K, fieldValue: T[K]) => {
      const newValue = { ...pendingValue, [key]: fieldValue } as T;
      setPendingValue(newValue);
      onPreviewChange?.(newValue);
    },
    [pendingValue, onPreviewChange]
  );

  // Reset to defaults
  const handleReset = () => {
    setPendingValue(defaultValue);
    onPreviewChange?.(defaultValue);
  };

  // Confirm and apply
  const handleConfirm = () => {
    onChange(pendingValue);
    setIsExpanded(false);
  };

  // Cancel and revert
  const handleCancel = () => {
    const original = originalValueRef.current;
    setPendingValue(original);
    onPreviewChange?.(original);
    setIsExpanded(false);
  };

  // Display value (pending when expanded, committed otherwise)
  const _displayValue = isExpanded ? pendingValue : value;

  // CSS classes
  const containerClasses = [
    styles.container,
    size === 'small' && styles.compact,
    size === 'large' && styles.large,
    disabled && styles.disabled,
    isExpanded && styles.expanded,
    !enabled && styles.disabledState,
  ]
    .filter(Boolean)
    .join(' ');

  // Render panel via portal
  const renderPortalPanel = () => {
    if (!(isExpanded && panelPosition)) return null;

    const panelStyle: CSSProperties = {
      position: 'fixed',
      top: panelPosition.openUpward ? 'auto' : panelPosition.top,
      bottom: panelPosition.openUpward ? window.innerHeight - panelPosition.top : 'auto',
      left: panelPosition.left,
      width: panelPosition.width,
      zIndex: 10000,
    };

    const panel = (
      <div
        ref={panelRef}
        className={`${styles.panel} ${panelPosition.openUpward ? styles.panelUpward : ''}`}
        style={panelStyle}
      >
        {/* Panel Content */}
        <div className={styles.panelContent}>
          {renderPanel({
            value: value,
            pendingValue: pendingValue,
            updateValue,
            updateField,
          })}
        </div>

        {/* Panel Footer */}
        <div className={styles.panelFooter}>
          <button type="button" className={styles.resetLink} onClick={handleReset}>
            Reset
          </button>
          <div className={styles.panelActions}>
            <button type="button" className={styles.cancelButton} onClick={handleCancel}>
              Cancel
            </button>
            <button type="button" className={styles.confirmButton} onClick={handleConfirm}>
              Apply
            </button>
          </div>
        </div>
      </div>
    );

    return createPortal(panel, document.body);
  };

  return (
    <section
      ref={containerRef}
      className={containerClasses}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel ?? `${label} settings`}
    >
      {/* Preview Box with optional toggle */}
      <div className={styles.previewArea}>
        {/* Toggle (if configured) - rendered inside preview area */}
        {toggle && (
          <div className={styles.toggleInside}>
            {toggle.options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`${styles.toggleOption} ${toggle.activeOption === option.value ? styles.toggleOptionActive : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggle.onToggle(option.value);
                }}
                title={option.label}
              >
                {option.icon && <span className={styles.toggleIcon}>{option.icon}</span>}
                <span className={styles.toggleLabel}>{option.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Preview visual */}
        <div className={styles.preview}>
          {preview.render()}
          {preview.badge && <div className={styles.previewBadge}>{preview.badge}</div>}
        </div>
      </div>

      {/* Info Section */}
      <div className={styles.info}>
        <span className={styles.primaryLabel}>{label}</span>
        {summary && <span className={styles.summary}>{summary}</span>}
      </div>

      {/* Action Button */}
      <button
        type="button"
        className={styles.actionButton}
        onClick={handleToggle}
        disabled={disabled || !enabled}
      >
        {isExpanded ? 'Done' : 'Customize'}
      </button>

      {/* Portal Panel */}
      {renderPortalPanel()}
    </section>
  );
}

// Memoized export with generic support
export const UnifiedSettingsBox = memo(UnifiedSettingsBoxInner) as typeof UnifiedSettingsBoxInner;

export default UnifiedSettingsBox;
