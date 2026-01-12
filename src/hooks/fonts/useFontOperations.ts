/**
 * useFontOperations Hook
 *
 * Manages font loading, hovering (preload), and uploading operations
 * for FontSettingsSelector.
 *
 * @module hooks/fonts/useFontOperations
 */

import { useRef, useState } from 'react';
import type { FontDefinition } from '@/ts/types/fonts.js';
import { logger } from '@/ts/utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export interface UseFontOperationsOptions {
  /** Load font function from FontContext */
  loadFont: (family: string) => Promise<void>;
  /** Upload font function from FontContext */
  uploadFont: (file: File) => Promise<FontDefinition>;
  /** Callback when a font is selected */
  onFontSelect: (family: string) => void;
  /** Callback when source tab should change (after upload) */
  onSourceChange?: (source: 'custom') => void;
}

export interface UseFontOperationsResult {
  /** Set of font families currently being loaded (for loading indicators) */
  loadingFonts: Set<string>;
  /** Whether an upload is in progress */
  isUploading: boolean;
  /** Handle font selection - loads if needed, then selects */
  handleFontSelect: (font: FontDefinition) => Promise<void>;
  /** Handle font hover - preloads font for preview */
  handleFontHover: (font: FontDefinition) => Promise<void>;
  /** Handle file upload from input */
  handleUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  /** Ref for file input element */
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useFontOperations({
  loadFont,
  uploadFont,
  onFontSelect,
  onSourceChange,
}: UseFontOperationsOptions): UseFontOperationsResult {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [loadingFonts, setLoadingFonts] = useState<Set<string>>(new Set());

  // Handle font selection
  const handleFontSelect = async (font: FontDefinition) => {
    try {
      // Load font if not yet loaded
      if (font.status !== 'loaded') {
        await loadFont(font.family);
      }
      onFontSelect(font.family);
    } catch (error) {
      logger.error('useFontOperations', 'Failed to load font', error);
    }
  };

  // Handle font hover for preview preloading
  const handleFontHover = async (font: FontDefinition) => {
    // Skip if already loaded or currently loading
    if (font.status === 'loaded' || loadingFonts.has(font.family)) {
      return;
    }

    // Mark as loading
    setLoadingFonts((prev) => new Set(prev).add(font.family));

    try {
      await loadFont(font.family);
    } catch {
      // Silent fail - font will show fallback
    } finally {
      setLoadingFonts((prev) => {
        const next = new Set(prev);
        next.delete(font.family);
        return next;
      });
    }
  };

  // Handle file upload
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const font = await uploadFont(file);
      onFontSelect(font.family);
      onSourceChange?.('custom');
    } catch (error) {
      logger.error('useFontOperations', 'Failed to upload font', error);
    } finally {
      setIsUploading(false);
      // Reset file input for re-upload of same file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return {
    loadingFonts,
    isUploading,
    handleFontSelect,
    handleFontHover,
    handleUpload,
    fileInputRef,
  };
}
