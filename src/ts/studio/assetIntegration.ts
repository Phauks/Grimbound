/**
 * Studio Asset Integration
 *
 * Integration between Studio and the global asset storage system
 */

import { assetStorageService } from '../services/upload/AssetStorageService.js';
import type { StudioAssetMetadata } from '../services/upload/types.js';
import type { CanvasSize, Layer, ToolSettings } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { loadStudioPreset, saveStudioPreset } from './studioPresets.js';

/**
 * Options for saving a Studio asset
 */
export interface SaveStudioAssetOptions {
  /** Asset type (icon, logo, or full project) */
  type: 'studio-icon' | 'studio-logo' | 'studio-project';
  /** Asset name */
  name: string;
  /** Asset description */
  description?: string;
  /** Project ID (null = global library) */
  projectId?: string | null;
  /** Character ID to link to (optional) */
  characterId?: string;
  /** Tags for organization */
  tags?: string[];
  /** Source information */
  createdFrom?: 'scratch' | 'import' | 'edit' | 'preset';
  /** Source asset ID if edited from existing */
  sourceAssetId?: string;
  /** Character preset applied (if any) */
  presetApplied?: string;
}

/**
 * Save current Studio state as an asset
 *
 * This function saves the Studio canvas as an asset in the global storage system.
 * For single-layer outputs (icons/logos), it flattens the layers.
 * For multi-layer projects, it saves the complete project state.
 *
 * @param layers - Current layers
 * @param canvasSize - Canvas dimensions
 * @param toolSettings - Tool settings
 * @param backgroundColor - Background color
 * @param options - Save options
 * @returns Asset ID
 */
export async function saveStudioAsset(
  layers: Layer[],
  canvasSize: CanvasSize,
  toolSettings: ToolSettings,
  backgroundColor: string,
  options: SaveStudioAssetOptions
): Promise<string> {
  const {
    type,
    name,
    description,
    projectId = null,
    characterId,
    tags = [],
    createdFrom,
    sourceAssetId,
    presetApplied,
  } = options;

  // Composite all layers to create the final image
  const compositeBlob = await compositeLayers(layers, canvasSize, backgroundColor);

  // Create metadata with Studio-specific fields
  const metadata: StudioAssetMetadata = {
    filename: `${sanitizeFilename(name)}.png`,
    mimeType: 'image/png',
    size: compositeBlob.size,
    width: canvasSize.width,
    height: canvasSize.height,
    uploadedAt: Date.now(),
    editedAt: Date.now(),
    sourceType: 'editor',
    // Studio-specific fields
    studioVersion: '1.0.0',
    layerCount: layers.length,
    hasTransparency: await hasTransparency(compositeBlob),
    canvasDimensions: { width: canvasSize.width, height: canvasSize.height },
    createdFrom,
    sourceAssetId,
    presetApplied,
    tags,
    description,
  };

  // For studio-project type, also save the complete project data
  let projectData: string | undefined;
  if (type === 'studio-project') {
    // Save complete project state to localStorage as backup
    const presetId = await saveStudioPreset(layers, canvasSize, toolSettings, backgroundColor, {
      name,
      description,
      tags,
    });
    projectData = presetId;
  }

  // Save to asset storage
  const assetId = await assetStorageService.save({
    type,
    projectId,
    blob: compositeBlob,
    thumbnail: await generateThumbnail(compositeBlob, 128),
    metadata,
    linkedTo: characterId ? [characterId] : [],
  });

  logger.info('StudioAssetIntegration', `Saved Studio asset: ${assetId}, ${type}, ${name}`);

  // Store project data reference if it's a full project
  if (projectData) {
    localStorage.setItem(`studio-project-data:${assetId}`, projectData);
  }

  return assetId;
}

/**
 * Load a Studio asset and restore it in the editor
 *
 * @param assetId - Asset ID to load
 * @returns Studio state data
 */
export async function loadStudioAsset(assetId: string): Promise<{
  layers: Layer[];
  canvasSize: CanvasSize;
  toolSettings: ToolSettings;
  backgroundColor: string;
  metadata: StudioAssetMetadata;
} | null> {
  // Check if this is a full project with saved state
  const projectDataId = localStorage.getItem(`studio-project-data:${assetId}`);

  if (projectDataId) {
    // Load complete project state
    const { layers, canvasSize, toolSettings, backgroundColor, preset } =
      await loadStudioPreset(projectDataId);

    // Get metadata from asset storage
    const asset = await assetStorageService.getById(assetId);
    const metadata = asset ? (asset.metadata as StudioAssetMetadata) : ({} as StudioAssetMetadata);

    return {
      layers,
      canvasSize,
      toolSettings,
      backgroundColor,
      metadata,
    };
  }

  // Otherwise, load as a single-layer image
  const asset = await assetStorageService.getById(assetId);
  if (!asset) {
    logger.warn('StudioAssetIntegration', `Asset not found: ${assetId}`);
    return null;
  }

  // Create a single layer from the asset blob
  const canvas = await blobToCanvas(asset.blob);
  const layer: Layer = {
    id: crypto.randomUUID(),
    type: 'image',
    name: 'Imported Image',
    visible: true,
    opacity: 1.0,
    blendMode: 'normal',
    zIndex: 0,
    canvas,
    version: 0,
    position: { x: 0, y: 0 },
    rotation: 0,
    scale: { x: 1, y: 1 },
  };

  // Extract canvas size from metadata or use asset dimensions
  const studioMeta = asset.metadata as StudioAssetMetadata;
  const canvasSize = studioMeta.canvasDimensions || {
    width: asset.metadata.width,
    height: asset.metadata.height,
  };

  return {
    layers: [layer],
    canvasSize,
    toolSettings: getDefaultToolSettings(),
    backgroundColor: '#FFFFFF',
    metadata: studioMeta,
  };
}

/**
 * Get all Studio assets from storage
 *
 * @param projectId - Filter by project (null = global, 'all' = all projects)
 * @returns Array of Studio assets
 */
export async function getAllStudioAssets(projectId?: string | null | 'all') {
  return assetStorageService.list({
    type: ['studio-icon', 'studio-logo', 'studio-project'],
    projectId,
    sortBy: 'uploadedAt',
    sortDirection: 'desc',
  });
}

/**
 * Delete a Studio asset
 *
 * @param assetId - Asset ID to delete
 */
export async function deleteStudioAsset(assetId: string): Promise<void> {
  // Remove project data if exists
  const projectDataId = localStorage.getItem(`studio-project-data:${assetId}`);
  if (projectDataId) {
    localStorage.removeItem(`studio-project-data:${assetId}`);
    // TODO: Also delete from studioPresets localStorage
  }

  // Delete from asset storage
  await assetStorageService.delete(assetId);
  logger.info('StudioAssetIntegration', `Deleted Studio asset: ${assetId}`);
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Composite all layers into a single image blob
 */
async function compositeLayers(
  layers: Layer[],
  canvasSize: CanvasSize,
  backgroundColor: string
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = canvasSize.width;
  canvas.height = canvasSize.height;

  const ctx = canvas.getContext('2d')!;

  // Fill background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

  // Composite all visible layers (bottom to top)
  for (const layer of [...layers].reverse()) {
    if (!layer.visible) continue;

    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = blendModeToCompositeOp(layer.blendMode);

    ctx.drawImage(layer.canvas, 0, 0);

    ctx.restore();
  }

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to convert canvas to blob'));
      }
    }, 'image/png');
  });
}

/**
 * Generate thumbnail from blob
 */
async function generateThumbnail(blob: Blob, size: number): Promise<Blob> {
  const img = await createImageBitmap(blob);

  const canvas = document.createElement('canvas');
  const scale = Math.min(size / img.width, size / img.height);
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);

  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to generate thumbnail'));
        }
      },
      'image/jpeg',
      0.8
    );
  });
}

/**
 * Check if blob has transparency
 */
async function hasTransparency(blob: Blob): Promise<boolean> {
  if (blob.type !== 'image/png') return false;

  const img = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Check if any pixel has alpha < 255
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }

  return false;
}

/**
 * Convert blob to canvas
 */
async function blobToCanvas(blob: Blob): Promise<HTMLCanvasElement> {
  const img = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  return canvas;
}

/**
 * Sanitize filename
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-z0-9_-]/gi, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}

/**
 * Convert blend mode to canvas composite operation
 */
function blendModeToCompositeOp(blendMode: string): GlobalCompositeOperation {
  const map: Record<string, GlobalCompositeOperation> = {
    normal: 'source-over',
    multiply: 'multiply',
    screen: 'screen',
    overlay: 'overlay',
    darken: 'darken',
    lighten: 'lighten',
  };

  return map[blendMode] || 'source-over';
}

/**
 * Get default tool settings
 */
function getDefaultToolSettings(): ToolSettings {
  return {
    brush: {
      size: 10,
      opacity: 1.0,
      color: '#000000',
      hardness: 0.8,
    },
    eraser: {
      size: 20,
      hardness: 0.8,
    },
    shape: {
      fill: 'transparent',
      stroke: '#000000',
      strokeWidth: 2,
      cornerRadius: 0,
    },
    text: {
      font: 'LHF Unlovable',
      size: 48,
      color: '#000000',
      letterSpacing: 0,
      alignment: 'center',
    },
  };
}
