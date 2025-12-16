/**
 * Icon Uploader Component
 *
 * Drag-and-drop file uploader for custom character icons.
 * Supports image preview, format validation, and size constraints.
 */

import { useState, useCallback, useRef } from 'react';
import styles from '../../../styles/components/shared/IconUploader.module.css';

interface IconUploaderProps {
  /** Current image data URL (if any) */
  value?: string;
  /** Callback when image is uploaded/changed */
  onChange: (dataUrl: string | null) => void;
  /** Optional label */
  label?: string;
  /** Character name for context */
  characterName?: string;
  /** Max file size in bytes (default: 5MB) */
  maxSizeMB?: number;
  /** Accepted formats (default: PNG, JPG, WebP) */
  acceptedFormats?: string[];
  /** Show remove button */
  showRemove?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

const DEFAULT_MAX_SIZE_MB = 5;
const DEFAULT_FORMATS = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_BYTES = (mb: number) => mb * 1024 * 1024;

export function IconUploader({
  value,
  onChange,
  label = 'Upload Icon',
  characterName,
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
  acceptedFormats = DEFAULT_FORMATS,
  showRemove = true,
  disabled = false,
}: IconUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate file
  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file type
      if (!acceptedFormats.includes(file.type)) {
        const formatList = acceptedFormats
          .map((f) => f.split('/')[1].toUpperCase())
          .join(', ');
        return `Invalid format. Please use: ${formatList}`;
      }

      // Check file size
      const maxBytes = MAX_BYTES(maxSizeMB);
      if (file.size > maxBytes) {
        return `File too large. Maximum size: ${maxSizeMB}MB`;
      }

      return null;
    },
    [acceptedFormats, maxSizeMB]
  );

  // Process image file
  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setIsProcessing(true);

      try {
        // Validate
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          setIsProcessing(false);
          return;
        }

        // Convert to data URL
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          onChange(dataUrl);
          setIsProcessing(false);
        };
        reader.onerror = () => {
          setError('Failed to read file');
          setIsProcessing(false);
        };
        reader.readAsDataURL(file);
      } catch (err) {
        setError('Failed to process image');
        setIsProcessing(false);
      }
    },
    [validateFile, onChange]
  );

  // Handle file drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        processFile(files[0]);
      }
    },
    [disabled, processFile]
  );

  // Handle file selection
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        processFile(files[0]);
      }
    },
    [processFile]
  );

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  // Handle click to browse
  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  // Handle remove
  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(null);
      setError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [onChange]
  );

  const acceptString = acceptedFormats.join(',');

  return (
    <div className={styles.container}>
      {label && <label className={styles.label}>{label}</label>}

      <div
        className={`${styles.dropzone} ${isDragging ? styles.dragging : ''} ${
          value ? styles.hasImage : ''
        } ${disabled ? styles.disabled : ''} ${error ? styles.error : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={`Upload icon${characterName ? ` for ${characterName}` : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptString}
          onChange={handleFileSelect}
          className={styles.fileInput}
          disabled={disabled}
          aria-hidden="true"
        />

        {isProcessing ? (
          <div className={styles.processing}>
            <div className={styles.spinner} />
            <p>Processing...</p>
          </div>
        ) : value ? (
          <div className={styles.preview}>
            <img src={value} alt={characterName || 'Icon preview'} className={styles.previewImage} />
            {showRemove && !disabled && (
              <button
                onClick={handleRemove}
                className={styles.removeButton}
                aria-label="Remove icon"
                type="button"
              >
                ×
              </button>
            )}
          </div>
        ) : (
          <div className={styles.placeholder}>
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
            <p className={styles.placeholderText}>
              <strong>Click to browse</strong> or drag image here
            </p>
            <p className={styles.hint}>
              {acceptedFormats.map((f) => f.split('/')[1].toUpperCase()).join(', ')} • Max {maxSizeMB}MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className={styles.errorMessage} role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
