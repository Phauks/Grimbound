/**
 * Unified Checkbox Component
 *
 * Consistent checkbox styling across the application.
 * Supports standard HTML checkbox attributes plus custom styling options.
 */

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import styles from '@/styles/components/shared/Form.module.css';

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** Checkbox size variant */
  size?: 'small' | 'medium' | 'large';
  /** Label text */
  label?: ReactNode;
  /** Description text below label */
  description?: string;
  /** Error state */
  error?: boolean;
  /** Indeterminate state */
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      size = 'medium',
      label,
      description,
      error = false,
      indeterminate = false,
      className,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

    const wrapperClasses = [styles.checkboxWrapper, disabled && styles.checkboxDisabled, className]
      .filter(Boolean)
      .join(' ');

    const checkboxClasses = [
      styles.checkbox,
      styles[`checkbox${size.charAt(0).toUpperCase()}${size.slice(1)}`],
      error && styles.checkboxError,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <label className={wrapperClasses} htmlFor={checkboxId}>
        <input
          ref={(node) => {
            if (node) {
              node.indeterminate = indeterminate;
            }
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
          type="checkbox"
          id={checkboxId}
          className={checkboxClasses}
          disabled={disabled}
          aria-invalid={error}
          {...props}
        />
        {(label || description) && (
          <div className={styles.checkboxContent}>
            {label && <span className={styles.checkboxLabel}>{label}</span>}
            {description && <span className={styles.checkboxDescription}>{description}</span>}
          </div>
        )}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
