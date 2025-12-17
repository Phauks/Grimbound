/**
 * Blood on the Clocktower Token Generator
 * Async/Timing Utility Functions
 */

/**
 * Fisher-Yates shuffle algorithm - returns a new shuffled array
 * @param array - Array to shuffle (can be readonly)
 * @returns New shuffled array (original unchanged)
 */
export function shuffleArray<T>(array: readonly T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Debounced function interface with cancel capability
 */
export interface DebouncedFunction<T extends (...args: Parameters<T>) => void> {
  (...args: Parameters<T>): void;
  /** Cancel any pending debounced call */
  cancel: () => void;
}

/**
 * Debounce function to limit rate of function calls
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function with cancel method for cleanup (e.g., on component unmount)
 */
export function debounce<T extends (...args: never[]) => void>(
  func: T,
  wait: number
): DebouncedFunction<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const debouncedFn = function executedFunction(...args: Parameters<T>): void {
    const later = (): void => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  } as DebouncedFunction<T>;

  debouncedFn.cancel = (): void => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = undefined;
    }
  };

  return debouncedFn;
}

/**
 * Sleep for specified milliseconds
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
