/**
 * Import Project Modal Component
 *
 * Modal for importing projects from ZIP files with drag-and-drop support.
 * Shows validation results, preview, and import progress.
 */

import { useState, useCallback, useRef } from 'react';
import { ProjectImporter } from '../../ts/services/project/ProjectImporter';
import type { ProjectPreview } from '../../ts/types/project.js';
import styles from '../../styles/components/modals/ImportProjectModal.module.css';

interface ImportProjectModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Callback to close modal */
  onClose: () => void;
  /** Callback when project is successfully imported */
  onImport: (projectId: string) => void;
}

export function ImportProjectModal({ isOpen, onClose, onImport }: ImportProjectModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ProjectPreview | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file drop
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await processFile(files[0]);
    }
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  }, []);

  // Process and validate file
  const processFile = async (file: File) => {
    setSelectedFile(file);
    setError(null);
    setIsValidating(true);
    setPreview(null);

    try {
      const importer = new ProjectImporter();

      // Validate ZIP
      const validation = await importer.validateZip(file);

      if (!validation.valid) {
        setError(validation.errors.join(', '));
        setIsValidating(false);
        return;
      }

      // Show warnings if any
      if (validation.warnings && validation.warnings.length > 0) {
        console.warn('Import warnings:', validation.warnings);
      }

      // Generate preview
      const previewData = await importer.previewZip(file);
      setPreview(previewData);
      setIsValidating(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate file';
      setError(errorMessage);
      setIsValidating(false);
    }
  };

  // Handle import
  const handleImport = useCallback(async () => {
    if (!selectedFile) return;

    setIsImporting(true);
    setError(null);
    setProgress(10);

    try {
      const importer = new ProjectImporter();

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      // Import project (generates new ID automatically)
      const project = await importer.importFromZip(selectedFile);

      clearInterval(progressInterval);
      setProgress(100);

      // Success - call onImport callback
      setTimeout(() => {
        onImport(project.id);
        handleClose();
      }, 500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import project';
      setError(errorMessage);
      setIsImporting(false);
      setProgress(0);
    }
  }, [selectedFile, onImport]);

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  // Handle click to browse
  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Reset and close
  const handleClose = useCallback(() => {
    if (!isImporting) {
      setSelectedFile(null);
      setPreview(null);
      setError(null);
      setProgress(0);
      setIsValidating(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onClose();
    }
  }, [isImporting, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Import Project</h2>
          <button
            onClick={handleClose}
            className={styles.closeButton}
            aria-label="Close"
            disabled={isImporting}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {!selectedFile && (
            <>
              {/* Drop Zone */}
              <div
                className={`${styles.dropZone} ${isDragging ? styles.dragging : ''} ${
                  error ? styles.error : ''
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onClick={handleBrowseClick}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  onChange={handleFileSelect}
                  className={styles.fileInput}
                />

                <svg
                  className={styles.uploadIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>

                <p className={styles.dropText}>
                  <strong>Drop ZIP file here</strong> or click to browse
                </p>
                <p className={styles.dropHint}>Maximum file size: 50MB</p>
              </div>

              {error && (
                <div className={styles.errorMessage} role="alert">
                  <span className={styles.errorIcon}>⚠</span>
                  {error}
                </div>
              )}
            </>
          )}

          {selectedFile && isValidating && (
            <div className={styles.validating}>
              <div className={styles.spinner} />
              <p>Validating {selectedFile.name}...</p>
            </div>
          )}

          {selectedFile && preview && !isValidating && (
            <>
              {/* Preview */}
              <div className={styles.preview}>
                <h3 className={styles.previewTitle}>{preview.name}</h3>
                {preview.description && (
                  <p className={styles.previewDescription}>{preview.description}</p>
                )}

                <div className={styles.previewStats}>
                  <div className={styles.stat}>
                    <span className={styles.statLabel}>Characters:</span>
                    <span className={styles.statValue}>{preview.characterCount}</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statLabel}>Custom Icons:</span>
                    <span className={styles.statValue}>{preview.customIconCount}</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statLabel}>File Size:</span>
                    <span className={styles.statValue}>
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                </div>

                {preview.thumbnailDataUrl && (
                  <div className={styles.thumbnailSection}>
                    <span className={styles.thumbnailLabel}>Thumbnail:</span>
                    <img
                      src={preview.thumbnailDataUrl}
                      alt="Project thumbnail"
                      className={styles.thumbnail}
                    />
                  </div>
                )}
              </div>

              {/* Progress */}
              {isImporting && (
                <div className={styles.progressSection}>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                  </div>
                  <span className={styles.progressText}>Importing... {progress}%</span>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className={styles.errorMessage} role="alert">
                  <span className={styles.errorIcon}>⚠</span>
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          {selectedFile && preview ? (
            <>
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setPreview(null);
                  setError(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className={styles.cancelButton}
                disabled={isImporting}
              >
                Choose Different File
              </button>
              <button
                onClick={handleImport}
                className={styles.importButton}
                disabled={isImporting}
              >
                {isImporting ? 'Importing...' : 'Import Project'}
              </button>
            </>
          ) : (
            <button onClick={handleClose} className={styles.cancelButton} disabled={isImporting}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
