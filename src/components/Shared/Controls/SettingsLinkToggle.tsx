/**
 * SettingsLinkToggle Component
 *
 * A toggle button that shows link state between Character and Meta tokens.
 * When linked, changes to one token type automatically sync to the other.
 *
 * Features:
 * - Chain icon that toggles between linked/unlinked states
 * - Accessible with keyboard support
 * - Tooltip support
 * - Visual feedback for active state
 *
 * @module components/Shared/Controls/SettingsLinkToggle
 */

import { memo, useCallback } from 'react';
import styles from '@/styles/components/shared/SettingsLinkToggle.module.css';

export interface SettingsLinkToggleProps {
  /** Whether settings are linked */
  isLinked: boolean;
  /** Called when toggle is clicked */
  onToggle: () => void;
  /** Label for accessibility */
  ariaLabel?: string;
  /** Optional tooltip text */
  tooltip?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Size variant */
  size?: 'small' | 'medium';
}

/**
 * Chain link icon (linked state)
 */
const LinkIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

/**
 * Broken chain icon (unlinked state)
 */
const UnlinkIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M18.84 12.25l1.72-1.71a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M5.16 11.75l-1.72 1.71a5 5 0 0 0 7.07 7.07l1.72-1.71" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);

export const SettingsLinkToggle = memo(function SettingsLinkToggle({
  isLinked,
  onToggle,
  ariaLabel = 'Link Character and Meta settings',
  tooltip,
  disabled = false,
  size = 'medium',
}: SettingsLinkToggleProps) {
  const handleClick = useCallback(() => {
    if (!disabled) {
      onToggle();
    }
  }, [disabled, onToggle]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
        e.preventDefault();
        onToggle();
      }
    },
    [disabled, onToggle]
  );

  const tooltipText =
    tooltip || (isLinked ? 'Unlink Character and Meta' : 'Link Character and Meta');

  return (
    <button
      type="button"
      className={`${styles.linkToggle} ${isLinked ? styles.linked : ''} ${styles[size]} ${disabled ? styles.disabled : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel}
      aria-pressed={isLinked}
      title={tooltipText}
      disabled={disabled}
    >
      {isLinked ? <LinkIcon /> : <UnlinkIcon />}
    </button>
  );
});

export default SettingsLinkToggle;
