/**
 * useDrawerAnimation Hook
 *
 * Manages drawer open/close animation state, keeping the component
 * mounted during the close animation before unmounting.
 *
 * @module hooks/ui/useDrawerAnimation
 */

import { useEffect, useState } from 'react';

interface UseDrawerAnimationOptions {
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Animation duration in milliseconds (default: 300) */
  animationDuration?: number;
}

interface UseDrawerAnimationReturn {
  /** Whether the drawer should be rendered in the DOM */
  shouldRender: boolean;
}

/**
 * Hook for managing drawer animation lifecycle
 *
 * @example
 * ```tsx
 * function MyDrawer({ isOpen, onClose }) {
 *   const { shouldRender } = useDrawerAnimation({ isOpen });
 *
 *   if (!shouldRender) return null;
 *
 *   return <div className={isOpen ? styles.open : ''}>...</div>;
 * }
 * ```
 */
export function useDrawerAnimation({
  isOpen,
  animationDuration = 300,
}: UseDrawerAnimationOptions): UseDrawerAnimationReturn {
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => setShouldRender(false), animationDuration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, animationDuration]);

  return { shouldRender };
}

export default useDrawerAnimation;
