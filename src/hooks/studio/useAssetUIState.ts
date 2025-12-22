/**
 * useAssetUIState Hook
 *
 * Manages UI state for the Studio asset editor:
 * - Loading state (initial image loading)
 * - Processing state (save operations)
 * - Error state
 *
 * Extracted from useAssetEditor for better separation of concerns.
 *
 * @module hooks/studio/useAssetUIState
 */

import { useCallback, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface UseAssetUIStateResult {
  /** Whether the initial image is loading */
  isLoading: boolean;
  /** Whether a processing operation is in progress */
  isProcessing: boolean;
  /** Current processing message (e.g., "Saving...") */
  processingMessage: string;
  /** Current error message, if any */
  error: string | null;

  /** Set loading state */
  setIsLoading: (loading: boolean) => void;
  /** Start a processing operation with a message */
  startProcessing: (message: string) => void;
  /** End the current processing operation */
  endProcessing: () => void;
  /** Set an error message */
  setError: (error: string | null) => void;
  /** Clear the error */
  clearError: () => void;
  /** Reset all UI state */
  reset: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useAssetUIState(): UseAssetUIStateResult {
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const startProcessing = useCallback((message: string) => {
    setIsProcessing(true);
    setProcessingMessage(message);
    setError(null);
  }, []);

  const endProcessing = useCallback(() => {
    setIsProcessing(false);
    setProcessingMessage('');
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setIsProcessing(false);
    setProcessingMessage('');
    setError(null);
  }, []);

  return {
    isLoading,
    isProcessing,
    processingMessage,
    error,

    setIsLoading,
    startProcessing,
    endProcessing,
    setError,
    clearError,
    reset,
  };
}

export default useAssetUIState;
