/**
 * FileDropzone Component
 *
 * Reusable drag-and-drop file upload zone that uses the unified
 * file upload system.
 *
 * @module components/Shared/FileDropzone
 */

import { useCallback } from 'react';
import { useFileUpload } from '../../../hooks/useFileUpload.js';
import styles from '../../../styles/components/shared/FileDropzone.module.css';
import {
  ASSET_TYPE_LABELS,
  type AssetType,
  fileValidationService,
} from '../../../ts/services/upload/index.js';

// ============================================================================
// Types
// ============================================================================

export interface FileDropzoneProps {
  /** Type of asset being uploaded */
  assetType: AssetType;
  /** Project ID to associate uploads with (null for global) */
  projectId?: string | null;
  /** Character ID to link uploads to */
  characterId?: string;
  /** Allow multiple file selection */
  multiple?: boolean;
  /** Callback when upload completes */
  onUploadComplete?: (assetIds: string[]) => void;
  /** Callback on error */
  onError?: (error: string) => void;
  /** Whether the dropzone is disabled */
  disabled?: boolean;
  /** Optional custom label */
  label?: string;
  /** Optional custom hint text */
  hint?: string;
  /** Compact mode (smaller size) */
  compact?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function FileDropzone({
  assetType,
  projectId,
  characterId,
  multiple = false,
  onUploadComplete,
  onError,
  disabled = false,
  label,
  hint,
  compact = false,
  className = '',
}: FileDropzoneProps) {
  // Use the unified file upload hook
  const { isUploading, progress, error, isDragOver, dragHandlers, openFilePicker } = useFileUpload({
    assetType,
    projectId,
    characterId,
    multiple,
    onComplete: (uploadResults: { success: boolean; assetId?: string }[]) => {
      const successfulIds = uploadResults
        .filter((r) => r.success && r.assetId)
        .map((r) => r.assetId as string);
      if (successfulIds.length > 0) {
        onUploadComplete?.(successfulIds);
      }
    },
    onError,
  });

  // Get allowed file description
  const allowedDescription = fileValidationService.getAllowedFilesDescription(assetType);
  const defaultLabel = `Upload ${ASSET_TYPE_LABELS[assetType]}`;

  // Handle click
  const handleClick = useCallback(() => {
    if (!(disabled || isUploading)) {
      openFilePicker();
    }
  }, [disabled, isUploading, openFilePicker]);

  // Handle keyboard
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && !disabled && !isUploading) {
        e.preventDefault();
        openFilePicker();
      }
    },
    [disabled, isUploading, openFilePicker]
  );

  // Build class names
  const containerClasses = [
    styles.dropzone,
    isDragOver ? styles.dragOver : '',
    isUploading ? styles.uploading : '',
    disabled ? styles.disabled : '',
    error ? styles.hasError : '',
    compact ? styles.compact : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={containerClasses}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={label || defaultLabel}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        disabled={disabled}
        {...dragHandlers}
        style={{ all: 'unset', display: 'block', width: '100%' }}
      >
        {isUploading ? (
          <div className={styles.uploadingState}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
            <p className={styles.progressText}>Uploading... {progress}%</p>
          </div>
        ) : (
          <div className={styles.idleState}>
            <svg
              className={styles.uploadIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className={styles.label}>
              <strong>{label || defaultLabel}</strong>
            </p>
            <p className={styles.hint}>
              {hint || `Drop ${multiple ? 'files' : 'file'} here or click to browse`}
            </p>
            <p className={styles.formats}>{allowedDescription}</p>
          </div>
        )}
      </button>

      {error && (
        <div className={styles.errorMessage} role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

export default FileDropzone;
