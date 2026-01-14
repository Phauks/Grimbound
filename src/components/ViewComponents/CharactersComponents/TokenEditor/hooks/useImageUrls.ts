/**
 * useImageUrls - Hook for managing character image URLs
 *
 * Handles local state, debounced updates, and asset selection for character images.
 *
 * @module components/CharactersComponents/TokenEditor/hooks/useImageUrls
 */

import { useEffect, useRef, useState } from 'react';
import type { Character } from '@/ts/types/index.js';

/** Normalize image array for storage - single image stored as string, multiple as array */
export function normalizeImageValue(images: string[]): string | string[] {
  return images.length === 1 ? images[0] : images;
}

export interface UseImageUrlsOptions {
  initialImages: string[];
  isOfficial: boolean;
  onEditChange: (field: keyof Character, value: Character[keyof Character]) => void;
  onRefreshPreview?: () => void;
  onPreviewVariant?: (imageUrl: string | undefined) => void;
  /** Debounced update for image changes (uses longer delay for image loading) */
  debouncedImageUpdate: (value: string | string[], delay?: number) => void;
}

export interface UseImageUrlsResult {
  localImages: string[];
  setLocalImages: React.Dispatch<React.SetStateAction<string[]>>;
  previewVariantIndex: number | null;
  handleImageUpdate: (index: number, value: string) => void;
  handleImageBlur: () => void;
  handleImagePreview: (index: number, url: string) => void;
  handleAddImage: () => void;
  handleRemoveImage: (index: number) => void;
  handleRefreshImages: () => void;
  /** Handle asset selection from asset manager */
  handleAssetSelection: (index: number, assetId: string) => void;
}

export function useImageUrls({
  initialImages,
  isOfficial,
  onEditChange,
  onRefreshPreview,
  onPreviewVariant,
  debouncedImageUpdate,
}: UseImageUrlsOptions): UseImageUrlsResult {
  const [localImages, setLocalImages] = useState<string[]>(initialImages);
  const [previewVariantIndex, setPreviewVariantIndex] = useState<number | null>(null);

  // Track previous content to prevent infinite loops when parent creates
  // new array references with same content
  const prevKeyRef = useRef<string>('');
  const currentKey = initialImages.join('\x00');

  // Sync with prop changes (using content comparison)
  useEffect(() => {
    // Skip if content hasn't changed (prevents infinite loops from new array refs)
    if (prevKeyRef.current === currentKey) {
      return;
    }
    prevKeyRef.current = currentKey;
    setLocalImages(initialImages);
    setPreviewVariantIndex(null);
  }, [initialImages, currentKey]);

  const handleImageUpdate = (index: number, value: string) => {
    if (isOfficial) return;
    setLocalImages((prev) => {
      const newImages = [...prev];
      newImages[index] = value;
      return newImages;
    });
    const updatedImages = localImages.map((img, i) => (i === index ? value : img));
    debouncedImageUpdate(normalizeImageValue(updatedImages));
  };

  const handleImageBlur = () => {
    if (isOfficial) return;
    onEditChange('image', normalizeImageValue(localImages));
  };

  const handleImagePreview = (index: number, url: string) => {
    if (!onPreviewVariant) return;
    setPreviewVariantIndex(index);
    onPreviewVariant(url);
  };

  const handleAddImage = () => {
    if (isOfficial) return;
    const newImages = [...localImages, ''];
    setLocalImages(newImages);
    onEditChange('image', newImages);
  };

  const handleRemoveImage = (index: number) => {
    if (isOfficial) return;
    const isLastImage = localImages.length <= 1;
    if (isLastImage) {
      setLocalImages(['']);
      onEditChange('image', '');
      return;
    }
    const newImages = localImages.filter((_, i) => i !== index);
    setLocalImages(newImages);
    onEditChange('image', normalizeImageValue(newImages));
  };

  const handleRefreshImages = () => {
    if (isOfficial) return;
    onEditChange('image', normalizeImageValue(localImages));
    onRefreshPreview?.();
  };

  const handleAssetSelection = (index: number, assetRef: string) => {
    if (isOfficial) return;
    // assetRef is already in "asset:uuid" format from useAssetSelection hook
    setLocalImages((prev) => {
      const newImages = [...prev];
      newImages[index] = assetRef;
      return newImages;
    });
    // Update immediately (no debounce for explicit selection)
    const updatedImages = localImages.map((img, i) => (i === index ? assetRef : img));
    onEditChange('image', normalizeImageValue(updatedImages));
  };

  return {
    localImages,
    setLocalImages,
    previewVariantIndex,
    handleImageUpdate,
    handleImageBlur,
    handleImagePreview,
    handleAddImage,
    handleRemoveImage,
    handleRefreshImages,
    handleAssetSelection,
  };
}
