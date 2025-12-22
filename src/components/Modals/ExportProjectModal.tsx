/**
 * Export Project Modal Component
 *
 * Modal for exporting projects as ZIP files with customizable options.
 * Shows estimated file size and progress during export.
 * Migrated to use unified Modal, Button, and Alert components.
 */

import { useCallback, useMemo, useState } from 'react';
import { Modal } from '@/components/Shared/ModalBase/Modal';
import { Alert } from '@/components/Shared/UI/Alert';
import { Button } from '@/components/Shared/UI/Button';
import { useProjectExporter } from '@/contexts/ServiceContext';
import styles from '@/styles/components/modals/ExportProjectModal.module.css';
import type { ExportOptions, Project } from '@/ts/types/project.js';

interface ExportProjectModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Callback to close modal */
  onClose: () => void;
  /** Project to export */
  project: Project | null;
}

export function ExportProjectModal({ isOpen, onClose, project }: ExportProjectModalProps) {
  // Get factory hook for creating exporter instances
  const createExporter = useProjectExporter();

  const [options, setOptions] = useState<ExportOptions>({
    includeCustomIcons: true,
    includeThumbnail: true,
    compressImages: false,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Estimate file size
  const estimatedSize = useMemo(() => {
    if (!project) return '0 KB';

    // Rough estimation
    let sizeBytes = 50000; // Base project.json + manifest.json

    // Add custom icons
    if (options.includeCustomIcons && project.state.customIcons) {
      const iconSize = project.state.customIcons.reduce(
        (sum, icon) => sum + (icon.fileSize || 100000),
        0
      );
      sizeBytes += iconSize;
    }

    // Add thumbnail
    if (options.includeThumbnail && project.thumbnail) {
      sizeBytes += 50000; // Estimated thumbnail size
    }

    // Adjust for compression
    if (options.compressImages) {
      sizeBytes *= 0.6; // ~40% compression
    }

    // Format size
    if (sizeBytes < 1024) {
      return `${sizeBytes.toFixed(0)} B`;
    } else if (sizeBytes < 1024 * 1024) {
      return `${(sizeBytes / 1024).toFixed(1)} KB`;
    } else {
      return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
    }
  }, [project, options]);

  // Handle export
  const handleExport = useCallback(async () => {
    if (!project) return;

    setIsExporting(true);
    setError(null);
    setProgress(10);

    try {
      const exporter = createExporter();

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      // Export project
      const blob = await exporter.exportAsZip(project, options);

      clearInterval(progressInterval);
      setProgress(100);

      // Download file
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = exporter.generateFilename(project.name);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Success - close modal after brief delay
      setTimeout(() => {
        onClose();
        setIsExporting(false);
        setProgress(0);
      }, 500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export project';
      setError(errorMessage);
      setIsExporting(false);
      setProgress(0);
    }
  }, [project, options, onClose, createExporter]);

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    if (!isExporting) {
      setError(null);
      setProgress(0);
      onClose();
    }
  }, [isExporting, onClose]);

  if (!project) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Export Project"
      size="medium"
      preventClose={isExporting}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button
            variant="accent"
            onClick={handleExport}
            loading={isExporting}
            loadingText="Exporting..."
          >
            Export as ZIP
          </Button>
        </>
      }
    >
      {/* Project Info */}
      <div className={styles.projectInfo}>
        <h3 className={styles.projectName}>{project.name}</h3>
        {project.description && <p className={styles.projectDescription}>{project.description}</p>}
        <div className={styles.projectStats}>
          <span>{project.stats.characterCount} characters</span>
          <span>•</span>
          <span>{project.state.customIcons?.length || 0} custom icons</span>
        </div>
      </div>

      {/* Export Options */}
      <div className={styles.options}>
        <h4 className={styles.optionsTitle}>Export Options</h4>

        <label className={styles.option}>
          <input
            type="checkbox"
            checked={options.includeCustomIcons}
            onChange={(e) =>
              setOptions((prev) => ({ ...prev, includeCustomIcons: e.target.checked }))
            }
            disabled={isExporting || !project.state.customIcons?.length}
          />
          <div className={styles.optionContent}>
            <span className={styles.optionLabel}>Include Custom Icons</span>
            <span className={styles.optionDescription}>
              {project.state.customIcons?.length || 0} custom icon(s)
            </span>
          </div>
        </label>

        <label className={styles.option}>
          <input
            type="checkbox"
            checked={options.includeThumbnail}
            onChange={(e) =>
              setOptions((prev) => ({ ...prev, includeThumbnail: e.target.checked }))
            }
            disabled={isExporting}
          />
          <div className={styles.optionContent}>
            <span className={styles.optionLabel}>Include Thumbnail</span>
            <span className={styles.optionDescription}>Project preview image</span>
          </div>
        </label>

        <label className={styles.option}>
          <input
            type="checkbox"
            checked={options.compressImages}
            onChange={(e) => setOptions((prev) => ({ ...prev, compressImages: e.target.checked }))}
            disabled={isExporting}
          />
          <div className={styles.optionContent}>
            <span className={styles.optionLabel}>Compress Images</span>
            <span className={styles.optionDescription}>Reduce file size (~40% smaller)</span>
          </div>
        </label>
      </div>

      {/* File Size Estimate */}
      <div className={styles.sizeEstimate}>
        <span className={styles.sizeLabel}>Estimated Size:</span>
        <span className={styles.sizeValue}>{estimatedSize}</span>
      </div>

      {/* Progress Bar */}
      {isExporting && (
        <div className={styles.progressSection}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          <span className={styles.progressText}>Exporting... {progress}%</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <Alert variant="error" style={{ marginTop: 'var(--spacing-md)' }}>
          {error}
        </Alert>
      )}
    </Modal>
  );
}
