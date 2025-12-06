import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../ts/utils'
import styles from '../../styles/components/shared/Button.module.css'

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger'
export type ButtonSize = 'small' | 'medium' | 'large'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  isIconOnly?: boolean
  fullWidth?: boolean
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
      className,
      children,
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
      className,
    )

    return (
      <button ref={ref} className={classes} {...props}>
        {icon && (
          <span
            className={`${styles.icon} ${iconPosition === 'left' ? styles.iconLeft : styles.iconRight}`}
          >
            {icon}
          </span>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

// Toggle Button variant
interface ToggleButtonProps extends ButtonProps {
  active?: boolean
}

export const ToggleButton = forwardRef<HTMLButtonElement, ToggleButtonProps>(
  ({ active = false, className, ...props }, ref) => {
    const classes = cn(styles.toggle, active && styles.active, className)

    return <button ref={ref} className={classes} {...props} />
  }
)

ToggleButton.displayName = 'ToggleButton'

// Button Group
interface ButtonGroupProps {
  children: ReactNode
  className?: string
}

export function ButtonGroup({ children, className }: ButtonGroupProps) {
  const classes = cn(styles.group, className)
  return <div className={classes}>{children}</div>
}
