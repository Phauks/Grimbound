/**
 * Unified Select Component
 *
 * Consistent dropdown/select styling across the application.
 * Supports standard HTML select attributes plus custom styling options.
 */

import { forwardRef, type ReactNode, type SelectHTMLAttributes } from 'react';
import styles from '../../../styles/components/shared/Form.module.css';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** Select size variant */
  size?: 'small' | 'medium' | 'large';
  /** Error state */
  error?: boolean;
  /** Error message to display */
  errorMessage?: string;
  /** Options to render (alternative to children) */
  options?: SelectOption[];
  /** Placeholder option text */
  placeholder?: string;
  /** Full width */
  fullWidth?: boolean;
  /** Children (option elements) */
  children?: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      size = 'medium',
      error = false,
      errorMessage,
      options,
      placeholder,
      fullWidth = false,
      className,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const selectClasses = [
      styles.select,
      styles[`select${size.charAt(0).toUpperCase()}${size.slice(1)}`],
      error && styles.selectError,
      disabled && styles.selectDisabled,
      fullWidth && styles.fullWidth,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const wrapperClasses = [styles.selectWrapper, fullWidth && styles.fullWidth]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={wrapperClasses}>
        <div className={styles.selectContainer}>
          <select
            ref={ref}
            className={selectClasses}
            disabled={disabled}
            aria-invalid={error}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options
              ? options.map((option) => (
                  <option key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                  </option>
                ))
              : children}
          </select>
          <span className={styles.selectChevron}>▼</span>
        </div>
        {errorMessage && <span className={styles.errorText}>{errorMessage}</span>}
      </div>
    );
  }
);

Select.displayName = 'Select';
