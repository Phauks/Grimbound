/**
 * Blood on the Clocktower Token Generator
 * Class Name Utility - Simple className concatenation helper
 *
 * A lightweight alternative to clsx/classnames libraries
 */

type ClassValue = string | number | boolean | undefined | null | ClassValue[];

/**
 * Concatenate class names, filtering out falsy values
 *
 * @example
 * cn('base', isActive && 'active', isDisabled && 'disabled')
 * // Returns: 'base active' (if isActive is true, isDisabled is false)
 *
 * @example
 * cn(['base', 'class'], condition && 'conditional')
 * // Handles nested arrays
 *
 * @param args - Class names or conditional expressions
 * @returns Concatenated class name string
 */
export function cn(...args: ClassValue[]): string {
  const classes: string[] = [];

  for (const arg of args) {
    if (!arg) continue;

    if (typeof arg === 'string' || typeof arg === 'number') {
      classes.push(String(arg));
    } else if (Array.isArray(arg)) {
      const inner = cn(...arg);
      if (inner) {
        classes.push(inner);
      }
    }
  }

  return classes.join(' ');
}

/**
 * Create a variant-based class name builder
 * Useful for component variants like Button, Card, etc.
 *
 * @example
 * const cardClasses = createVariantClasses({
 *   base: 'card',
 *   variants: {
 *     elevated: 'card-elevated',
 *     outlined: 'card-outlined',
 *   }
 * })
 * cardClasses('elevated') // Returns: 'card card-elevated'
 *
 * Note: For buttons, use the unified Button component from
 * src/components/Shared/Button instead of CSS class variants.
 */
export function createVariantClasses<T extends string>(config: {
  base: string;
  variants: Record<T, string>;
}): (variant: T, ...extra: ClassValue[]) => string {
  return (variant: T, ...extra: ClassValue[]) => {
    return cn(config.base, config.variants[variant], ...extra);
  };
}
