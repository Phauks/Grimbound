/**
 * Blood on the Clocktower Token Generator
 * Auto-Save Toggle - Button to enable/disable auto-save functionality
 *
 * Features:
 * - Visual toggle button with icon
 * - Clear enabled/disabled states
 * - Tooltip with current status
 * - Disabled state when no project is active
 */

import styles from '../../../styles/components/shared/AutoSaveToggle.module.css';

interface AutoSaveToggleProps {
  /** Whether auto-save is currently enabled */
  isEnabled: boolean;
  /** Callback when toggle state changes */
  onToggle: (enabled: boolean) => void;
  /** Whether the toggle should be disabled (e.g., no active project) */
  disabled?: boolean;
}

export function AutoSaveToggle({ isEnabled, onToggle, disabled = false }: AutoSaveToggleProps) {
  const handleClick = () => {
    if (!disabled) {
      onToggle(!isEnabled);
    }
  };

  const getTooltipText = () => {
    if (disabled) {
      return 'Auto-save requires an active project';
    }
    return isEnabled
      ? 'Auto-save: ON - Click to disable'
      : 'Auto-save: OFF - Click to enable';
  };

  return (
    <button
      type="button"
      className={`${styles.toggle} ${isEnabled ? styles.enabled : styles.disabled} ${disabled ? styles.inactive : ''}`}
      onClick={handleClick}
      disabled={disabled}
      aria-label={getTooltipText()}
      title={getTooltipText()}
    >
      {/* Icon */}
      <span className={styles.icon} aria-hidden="true">
        {isEnabled ? '💾' : '⏸'}
      </span>

      {/* Label */}
      <span className={styles.label}>
        {isEnabled ? 'Auto-save' : 'Auto-save OFF'}
      </span>
    </button>
  );
}
