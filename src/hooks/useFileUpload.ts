/**
 * useFileUpload Hook
 *
 * React hook for handling file uploads with drag-and-drop,
 * clipboard paste, and file picker support.
 *
 * @module hooks/useFileUpload
 *
 * @example
 * ```tsx
 * const {
 *   isUploading,
 *   progress,
 *   error,
 *   isDragOver,
 *   dragHandlers,
 *   handleFileSelect,
 *   handlePaste,
 *   openFilePicker,
 * } = useFileUpload({
 *   assetType: 'character-icon',
 *   projectId: currentProjectId,
 *   onComplete: (results) => console.log('Uploaded:', results),
 * });
 *
 * return (
 *   <div {...dragHandlers} className={isDragOver ? 'drag-over' : ''}>
 *     Drop files here
 *   </div>
 * );
 * ```
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { fileUploadService, UploadOutcome, UseFileUploadConfig } from '../ts/services/upload/index.js';

// ============================================================================
// Types
// ============================================================================

export interface UseFileUploadReturn {
  // State
  isUploading: boolean;
  progress: number;
  error: string | null;
  results: UploadOutcome[];

  // Drag state
  isDragOver: boolean;
  dragHandlers: {
    onDragEnter: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };

  // Actions
  handleFileSelect: (files: FileList | File[]) => Promise<void>;
  handlePaste: (e: ClipboardEvent) => Promise<void>;
  openFilePicker: () => Promise<void>;
  reset: () => void;
  abort: () => void;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for handling file uploads
 */
export function useFileUpload(config: UseFileUploadConfig): UseFileUploadReturn {
  // State
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<UploadOutcome[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // Refs
  const abortedRef = useRef(false);
  const dragCounterRef = useRef(0);

  // Reset state
  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(0);
    setError(null);
    setResults([]);
    abortedRef.current = false;
  }, []);

  // Abort current upload
  const abort = useCallback(() => {
    abortedRef.current = true;
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      // Check multiple file constraint
      if (!config.multiple && fileArray.length > 1) {
        setError('Only one file can be uploaded at a time');
        config.onError?.('Only one file can be uploaded at a time');
        return;
      }

      setIsUploading(true);
      setProgress(0);
      setError(null);
      abortedRef.current = false;

      try {
        const uploadResults = await fileUploadService.upload(fileArray, {
          assetType: config.assetType,
          projectId: config.projectId,
          characterId: config.characterId,
          onProgress: (p) => {
            if (!abortedRef.current) {
              setProgress(p);
            }
          },
        });

        if (!abortedRef.current) {
          setResults(uploadResults);

          // Check for errors
          const errors = uploadResults.filter((r) => !r.success);
          if (errors.length > 0) {
            const errorMsg = errors.map((e) => (e as any).error).join('; ');
            setError(errorMsg);
            config.onError?.(errorMsg);
          }

          config.onComplete?.(uploadResults);
        }
      } catch (err) {
        if (!abortedRef.current) {
          const errorMsg = (err as Error).message;
          setError(errorMsg);
          config.onError?.(errorMsg);
        }
      } finally {
        if (!abortedRef.current) {
          setIsUploading(false);
          setProgress(100);
        }
      }
    },
    [config]
  );

  // Handle paste event
  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      const result = await fileUploadService.uploadFromClipboard(e, {
        assetType: config.assetType,
        projectId: config.projectId,
        characterId: config.characterId,
      });

      if (result) {
        setResults([result]);
        if (!result.success) {
          const errorMsg = (result as any).error;
          setError(errorMsg);
          config.onError?.(errorMsg);
        }
        config.onComplete?.([result]);
      }
    },
    [config]
  );

  // Open file picker
  const openFilePicker = useCallback(async () => {
    const uploadResults = await fileUploadService.openFilePicker(
      {
        assetType: config.assetType,
        projectId: config.projectId,
        characterId: config.characterId,
      },
      config.multiple ?? false
    );

    if (uploadResults.length > 0) {
      setResults(uploadResults);

      const errors = uploadResults.filter((r) => !r.success);
      if (errors.length > 0) {
        const errorMsg = errors.map((e) => (e as any).error).join('; ');
        setError(errorMsg);
        config.onError?.(errorMsg);
      }

      config.onComplete?.(uploadResults);
    }
  }, [config]);

  // Drag handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragOver(false);

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        handleFileSelect(files);
      }
    },
    [handleFileSelect]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortedRef.current = true;
    };
  }, []);

  return {
    // State
    isUploading,
    progress,
    error,
    results,

    // Drag state
    isDragOver,
    dragHandlers: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },

    // Actions
    handleFileSelect,
    handlePaste,
    openFilePicker,
    reset,
    abort,
  };
}

export default useFileUpload;
