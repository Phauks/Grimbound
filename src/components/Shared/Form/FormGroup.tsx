/**
 * Form Group Component
 *
 * Wraps form controls with label and optional help text.
 * Provides consistent layout for form fields.
 */

import type { ReactNode } from 'react';
import styles from '../../../styles/components/shared/Form.module.css';

export interface FormGroupProps {
  /** Label text */
  label?: ReactNode;
  /** Label htmlFor attribute */
  htmlFor?: string;
  /** Required indicator */
  required?: boolean;
  /** Help text below the control */
  helpText?: string;
  /** Error message */
  error?: string;
  /** Form control */
  children: ReactNode;
  /** Additional class name */
  className?: string;
  /** Horizontal layout (label beside control) */
  horizontal?: boolean;
}

export function FormGroup({
  label,
  htmlFor,
  required = false,
  helpText,
  error,
  children,
  className,
  horizontal = false,
}: FormGroupProps) {
  const groupClasses = [
    styles.formGroup,
    horizontal && styles.formGroupHorizontal,
    error && styles.formGroupError,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={groupClasses}>
      {label && (
        <label className={styles.formLabel} htmlFor={htmlFor}>
          {label}
          {required && <span className={styles.formRequired}>*</span>}
        </label>
      )}
      <div className={styles.formControl}>
        {children}
        {helpText && !error && <span className={styles.formHelpText}>{helpText}</span>}
        {error && <span className={styles.formError}>{error}</span>}
      </div>
    </div>
  );
}
