/**
 * Unified Input Component
 *
 * Consistent text input styling across the application.
 * Supports standard HTML input attributes plus custom styling options.
 */

import type { InputHTMLAttributes, ReactNode } from 'react';
import styles from '@/styles/components/shared/Form.module.css';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Input size variant */
  size?: 'small' | 'medium' | 'large';
  /** Error state */
  error?: boolean;
  /** Error message to display */
  errorMessage?: string;
  /** Left icon/element */
  leftIcon?: ReactNode;
  /** Right icon/element */
  rightIcon?: ReactNode;
  /** Full width */
  fullWidth?: boolean;
}

export function Input({
  size = 'medium',
  error = false,
  errorMessage,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className,
  disabled,
  ref,
  ...props
}: InputProps & { ref?: React.Ref<HTMLInputElement> }) {
  const inputClasses = [
    styles.input,
    styles[`input${size.charAt(0).toUpperCase()}${size.slice(1)}`],
    error && styles.inputError,
    disabled && styles.inputDisabled,
    leftIcon && styles.inputWithLeftIcon,
    rightIcon && styles.inputWithRightIcon,
    fullWidth && styles.fullWidth,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const wrapperClasses = [styles.inputWrapper, fullWidth && styles.fullWidth]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClasses}>
      <div className={styles.inputContainer}>
        {leftIcon && <span className={styles.inputIcon}>{leftIcon}</span>}
        <input
          ref={ref}
          className={inputClasses}
          disabled={disabled}
          aria-invalid={error}
          {...props}
        />
        {rightIcon && (
          <span className={`${styles.inputIcon} ${styles.inputIconRight}`}>{rightIcon}</span>
        )}
      </div>
      {errorMessage && <span className={styles.errorText}>{errorMessage}</span>}
    </div>
  );
}
