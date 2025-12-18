/**
 * Alert Component
 *
 * Displays contextual feedback messages with semantic styling.
 * Replaces inline-styled warning/error divs found in modals like DeleteProjectModal.
 *
 * @example
 * ```tsx
 * // Warning alert
 * <Alert variant="warning" title="Warning">
 *   This action cannot be undone.
 * </Alert>
 *
 * // Error alert
 * <Alert variant="error">
 *   Failed to save changes. Please try again.
 * </Alert>
 *
 * // Success alert
 * <Alert variant="success" title="Success!">
 *   Your changes have been saved.
 * </Alert>
 * ```
 */

import type { CSSProperties, ReactNode } from 'react';
import styles from '@/styles/components/shared/Alert.module.css';
import { cn } from '@/ts/utils';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  /** Visual style variant */
  variant?: AlertVariant;
  /** Optional title displayed in bold */
  title?: string;
  /** Alert content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Custom icon (overrides default) */
  icon?: ReactNode;
  /** Inline styles (for layout spacing) */
  style?: CSSProperties;
}

const defaultIcons: Record<AlertVariant, string> = {
  info: 'i',
  success: '✓',
  warning: '⚠',
  error: '✕',
};

export function Alert({ variant = 'info', title, children, className, icon, style }: AlertProps) {
  return (
    <div
      className={cn(styles.alert, styles[variant], className)}
      role={variant === 'error' ? 'alert' : 'status'}
      style={style}
    >
      <span className={styles.icon} aria-hidden="true">
        {icon ?? defaultIcons[variant]}
      </span>
      <div className={styles.content}>
        {title && <strong className={styles.title}>{title}</strong>}
        <div className={styles.message}>{children}</div>
      </div>
    </div>
  );
}

export default Alert;
