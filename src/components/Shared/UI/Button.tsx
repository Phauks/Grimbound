/**
 * Button Component
 *
 * Unified button component with variants, sizes, and loading states.
 * This is the single source of truth for all buttons in the application.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Button variant="primary" onClick={handleClick}>Save</Button>
 *
 * // With loading state
 * <Button variant="primary" loading={isLoading} loadingText="Saving...">
 *   Save Changes
 * </Button>
 *
 * // With icon
 * <Button variant="secondary" icon={<DownloadIcon />}>Download</Button>
 *
 * // Icon-only button
 * <Button variant="ghost" icon={<CloseIcon />} isIconOnly aria-label="Close" />
 * ```
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../../ts/utils'
import styles from '../../../styles/components/shared/Button.module.css'

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger'
export type ButtonSize = 'small' | 'medium' | 'large'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: ButtonVariant
  /** Size of the button */
  size?: ButtonSize
  /** Icon element to display */
  icon?: ReactNode
  /** Position of the icon relative to text */
  iconPosition?: 'left' | 'right'
  /** Whether this is an icon-only button (square aspect ratio) */
  isIconOnly?: boolean
  /** Whether the button should take full width of container */
  fullWidth?: boolean
  /** Whether the button is in a loading state */
  loading?: boolean
  /** Text to show during loading (replaces children) */
  loadingText?: string
  /** Button content */
  children?: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: styles.variantPrimary,
  secondary: styles.variantSecondary,
  accent: styles.variantAccent,
  ghost: styles.variantGhost,
  danger: styles.variantDanger,
}

const sizeClasses: Record<ButtonSize, string> = {
  small: styles.sizeSmall,
  medium: styles.sizeMedium,
  large: styles.sizeLarge,
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'medium',
      icon,
      iconPosition = 'left',
      isIconOnly = false,
      fullWidth = false,
      loading = false,
      loadingText,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const classes = cn(
      styles.button,
      variantClasses[variant],
      sizeClasses[size],
      isIconOnly && styles.iconOnly,
      fullWidth && styles.fullWidth,
      loading && styles.loading,
      className,
    )

    // Determine what content to show
    const showLoadingText = loading && loadingText
    const displayContent = showLoadingText ? loadingText : children

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <span className={styles.spinner} aria-hidden="true" />
        )}

        {/* Icon (hidden during loading unless no loading text) */}
        {icon && !loading && (
          <span
            className={cn(
              styles.icon,
              iconPosition === 'left' ? styles.iconLeft : styles.iconRight
            )}
          >
            {icon}
          </span>
        )}

        {/* Button text content */}
        {displayContent && (
          <span className={loading && !loadingText ? styles.hiddenContent : undefined}>
            {displayContent}
          </span>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

// ============================================
// Toggle Button Variant
// ============================================

interface ToggleButtonProps extends ButtonProps {
  /** Whether the toggle is in active/pressed state */
  active?: boolean
}

export const ToggleButton = forwardRef<HTMLButtonElement, ToggleButtonProps>(
  ({ active = false, className, ...props }, ref) => {
    const classes = cn(styles.toggle, active && styles.active, className)

    return (
      <button
        ref={ref}
        className={classes}
        aria-pressed={active}
        {...props}
      />
    )
  }
)

ToggleButton.displayName = 'ToggleButton'

// ============================================
// Button Group
// ============================================

interface ButtonGroupProps {
  /** Buttons to group together */
  children: ReactNode
  /** Additional CSS classes */
  className?: string
}

export function ButtonGroup({ children, className }: ButtonGroupProps) {
  const classes = cn(styles.group, className)
  return <div className={classes} role="group">{children}</div>
}
