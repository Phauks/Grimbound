/**
 * FontManagerPanel Component
 *
 * A settings panel for managing custom fonts. Allows users to:
 * - View all uploaded custom fonts
 * - Upload new fonts (.ttf, .otf, .woff, .woff2)
 * - Delete custom fonts
 * - See storage usage information
 *
 * @module components/Shared/Options/FontManagerPanel
 */

import { memo, useCallback, useRef, useState } from 'react';
import { useCustomFonts, useFonts } from '@/contexts/FontContext';
import styles from '@/styles/components/options/FontManagerPanel.module.css';
import type { FontDefinition } from '@/ts/types/fonts.js';
import { logger } from '@/ts/utils/logger.js';

// ============================================================================
// Constants
// ============================================================================

const MAX_CUSTOM_FONTS = 10;
const MAX_FONT_SIZE_MB = 5;
const ACCEPTED_EXTENSIONS = '.ttf,.otf,.woff,.woff2';

// ============================================================================
// Types
// ============================================================================

interface FontManagerPanelProps {
  /** Optional callback when a font is selected */
  onFontSelect?: (family: string) => void;
}

// ============================================================================
// Helper Components
// ============================================================================

interface FontItemProps {
  font: FontDefinition;
  onDelete: (id: string) => void;
}

const FontItem = memo(function FontItem({ font, onDelete }: FontItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (isDeleting) return;

    const confirmed = window.confirm(`Delete "${font.name}"? This cannot be undone.`);
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await onDelete(font.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const fileSizeKB = ((font.metadata?.fileSize ?? 0) / 1024).toFixed(1);

  // Format weight range for display
  const weightInfo =
    font.weights.length > 1
      ? `${Math.min(...font.weights)}-${Math.max(...font.weights)}`
      : (font.weights[0]?.toString() ?? '400');

  return (
    <div className={styles.fontItem}>
      <div className={styles.fontInfo}>
        <span className={styles.fontPreview} style={{ fontFamily: font.family }}>
          {font.name}
        </span>
        <span className={styles.fontMeta}>
          {font.metadata?.originalFilename ?? 'Unknown file'} • {fileSizeKB}KB
          {font.isVariable && (
            <span
              className={styles.variableBadge}
              title={`Variable font with ${font.variableAxes?.length ?? 0} axes`}
            >
              Variable
            </span>
          )}
          <span className={styles.weightInfo}>Weight: {weightInfo}</span>
        </span>
      </div>
      <button
        type="button"
        className={styles.deleteButton}
        onClick={handleDelete}
        disabled={isDeleting}
        aria-label={`Delete ${font.name}`}
        title="Delete font"
      >
        {isDeleting ? '...' : '×'}
      </button>
    </div>
  );
});

// ============================================================================
// Main Component
// ============================================================================

export const FontManagerPanel = memo(function FontManagerPanel({
  onFontSelect,
}: FontManagerPanelProps) {
  const { uploadFont, deleteFont } = useFonts();
  const customFonts = useCustomFonts();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate storage usage
  const totalSizeBytes = customFonts.reduce((sum, f) => sum + (f.metadata?.fileSize ?? 0), 0);
  const totalSizeMB = (totalSizeBytes / 1024 / 1024).toFixed(2);

  // Handle file upload
  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setUploadError(null);
      setIsUploading(true);

      try {
        for (const file of Array.from(files)) {
          const font = await uploadFont(file);
          logger.info('FontManagerPanel', `Uploaded font: ${font.name}`);

          // Optionally select the newly uploaded font
          if (onFontSelect) {
            onFontSelect(font.family);
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to upload font';
        setUploadError(message);
        logger.error('FontManagerPanel', 'Upload failed', error);
      } finally {
        setIsUploading(false);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [uploadFont, onFontSelect]
  );

  // Handle font deletion
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteFont(id);
        logger.info('FontManagerPanel', `Deleted font: ${id}`);
      } catch (error) {
        logger.error('FontManagerPanel', 'Delete failed', error);
      }
    },
    [deleteFont]
  );

  // Trigger file input click
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const canUpload = customFonts.length < MAX_CUSTOM_FONTS && !isUploading;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Custom Fonts</h3>
        <span className={styles.count}>
          {customFonts.length} / {MAX_CUSTOM_FONTS}
        </span>
      </div>

      <p className={styles.description}>
        Upload your own fonts (.ttf, .otf, .woff, .woff2) to use in token generation. Fonts are
        stored locally in your browser.
      </p>

      {/* Upload Area */}
      <button
        type="button"
        className={`${styles.uploadArea} ${canUpload ? '' : styles.uploadAreaDisabled}`}
        onClick={handleUploadClick}
        disabled={!canUpload}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          multiple
          onChange={handleUpload}
          disabled={!canUpload}
          hidden
        />
        <div className={styles.uploadContent}>
          {isUploading ? (
            <span className={styles.uploadingText}>Uploading...</span>
          ) : customFonts.length >= MAX_CUSTOM_FONTS ? (
            <>
              <span className={styles.uploadIcon}>⚠</span>
              <span>Maximum fonts reached</span>
              <span className={styles.uploadHint}>Delete a font to upload more</span>
            </>
          ) : (
            <>
              <span className={styles.uploadIcon}>+</span>
              <span>Drop fonts here or click to upload</span>
              <span className={styles.uploadHint}>Max {MAX_FONT_SIZE_MB}MB per file</span>
            </>
          )}
        </div>
      </button>

      {/* Error Message */}
      {uploadError && (
        <div className={styles.errorMessage}>
          <span className={styles.errorIcon}>!</span>
          {uploadError}
        </div>
      )}

      {/* Font List */}
      <div className={styles.fontList}>
        {customFonts.length === 0 ? (
          <p className={styles.emptyState}>No custom fonts uploaded yet.</p>
        ) : (
          customFonts.map((font) => <FontItem key={font.id} font={font} onDelete={handleDelete} />)
        )}
      </div>

      {/* Storage Info */}
      <div className={styles.storageInfo}>
        <span className={styles.storageText}>
          {customFonts.length} font{customFonts.length !== 1 ? 's' : ''} • {totalSizeMB}
          MB used
        </span>
      </div>
    </div>
  );
});

export default FontManagerPanel;
