/**
 * Studio Preset System
 *
 * Save and load complete Studio projects with all layers and settings
 */

import { projectDb } from '../db/projectDb.js';
import type { Layer, ToolSettings, CanvasSize } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Serialized layer for storage
 * Canvas data is stored as data URL for easy serialization
 */
export interface SerializedLayer extends Omit<Layer, 'canvas'> {
  canvasData: string; // Data URL (canvas.toDataURL())
}

/**
 * Studio preset stored in IndexedDB
 */
export interface StudioPreset {
  id: string;
  name: string;
  description?: string;
  thumbnail: string; // Data URL of composite preview

  // Editor state
  layers: SerializedLayer[];
  canvasSize: CanvasSize;
  toolSettings: ToolSettings;
  backgroundColor: string;

  // Metadata
  createdAt: number;
  updatedAt: number;
  tags: string[];
}

/**
 * Options for saving a preset
 */
export interface SavePresetOptions {
  name: string;
  description?: string;
  tags?: string[];
}

/**
 * Save current Studio state as a preset
 *
 * @param layers - Current layers
 * @param canvasSize - Canvas dimensions
 * @param toolSettings - Tool settings
 * @param backgroundColor - Background color
 * @param options - Save options (name, description, tags)
 * @returns Preset ID
 */
export async function saveStudioPreset(
  layers: Layer[],
  canvasSize: CanvasSize,
  toolSettings: ToolSettings,
  backgroundColor: string,
  options: SavePresetOptions
): Promise<string> {
  const id = crypto.randomUUID();

  // Serialize layers (convert canvases to data URLs)
  const serializedLayers: SerializedLayer[] = layers.map((layer) => ({
    ...layer,
    canvasData: layer.canvas.toDataURL('image/png', 0.8),
  }));

  // Generate thumbnail (composite of all layers)
  const thumbnail = await generateThumbnail(layers, canvasSize);

  // Create preset
  const preset: StudioPreset = {
    id,
    name: options.name,
    description: options.description,
    thumbnail,
    layers: serializedLayers,
    canvasSize,
    toolSettings,
    backgroundColor,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tags: options.tags ?? [],
  };

  // Store in IndexedDB
  // Note: We'll store presets in a custom object store
  // For now, we'll use the existing projectDb structure
  // TODO: Add studioPresets table to projectDb schema
  await storePresetInIndexedDB(preset);

  logger.info('StudioPresets', `Saved preset: ${id} - ${options.name}`);
  return id;
}

/**
 * Load a Studio preset
 *
 * @param id - Preset ID
 * @returns Preset data with deserialized layers
 */
export async function loadStudioPreset(id: string): Promise<{
  layers: Layer[];
  canvasSize: CanvasSize;
  toolSettings: ToolSettings;
  backgroundColor: string;
  preset: StudioPreset;
}> {
  // Load from IndexedDB
  const preset = await loadPresetFromIndexedDB(id);

  if (!preset) {
    throw new Error(`Studio preset not found: ${id}`);
  }

  // Deserialize layers (convert data URLs back to canvases)
  const layers: Layer[] = await Promise.all(
    preset.layers.map(async (serializedLayer) => {
      const canvas = await dataUrlToCanvas(serializedLayer.canvasData);

      return {
        ...serializedLayer,
        canvas,
      } as Layer;
    })
  );

  logger.info('StudioPresets', `Loaded preset: ${id} - ${preset.name}`);

  return {
    layers,
    canvasSize: preset.canvasSize,
    toolSettings: preset.toolSettings,
    backgroundColor: preset.backgroundColor,
    preset,
  };
}

/**
 * Get all saved Studio presets
 *
 * @returns Array of presets (sorted by updatedAt, newest first)
 */
export async function getAllStudioPresets(): Promise<StudioPreset[]> {
  const presets = await loadAllPresetsFromIndexedDB();

  // Sort by most recently updated
  return presets.sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Update an existing preset
 *
 * @param id - Preset ID
 * @param updates - Partial preset updates
 */
export async function updateStudioPreset(
  id: string,
  updates: Partial<Omit<StudioPreset, 'id' | 'createdAt'>>
): Promise<void> {
  const preset = await loadPresetFromIndexedDB(id);

  if (!preset) {
    throw new Error(`Studio preset not found: ${id}`);
  }

  const updatedPreset: StudioPreset = {
    ...preset,
    ...updates,
    updatedAt: Date.now(),
  };

  await storePresetInIndexedDB(updatedPreset);
  logger.info('StudioPresets', `Updated preset: ${id}`);
}

/**
 * Delete a Studio preset
 *
 * @param id - Preset ID
 */
export async function deleteStudioPreset(id: string): Promise<void> {
  await deletePresetFromIndexedDB(id);
  logger.info('StudioPresets', `Deleted preset: ${id}`);
}

/**
 * Duplicate a preset with a new name
 *
 * @param id - Preset ID to duplicate
 * @param newName - Name for the duplicate
 * @returns New preset ID
 */
export async function duplicateStudioPreset(
  id: string,
  newName: string
): Promise<string> {
  const preset = await loadPresetFromIndexedDB(id);

  if (!preset) {
    throw new Error(`Studio preset not found: ${id}`);
  }

  const newPreset: StudioPreset = {
    ...preset,
    id: crypto.randomUUID(),
    name: newName,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await storePresetInIndexedDB(newPreset);
  logger.info('StudioPresets', `Duplicated preset: ${id} -> ${newPreset.id}`);

  return newPreset.id;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate thumbnail from layers
 */
async function generateThumbnail(
  layers: Layer[],
  canvasSize: CanvasSize
): Promise<string> {
  // Create temporary canvas for compositing
  const canvas = document.createElement('canvas');
  const maxSize = 256; // Thumbnail max dimension

  // Calculate scaled dimensions (maintain aspect ratio)
  const scale = Math.min(maxSize / canvasSize.width, maxSize / canvasSize.height);
  canvas.width = Math.round(canvasSize.width * scale);
  canvas.height = Math.round(canvasSize.height * scale);

  const ctx = canvas.getContext('2d')!;

  // Composite all visible layers
  for (const layer of [...layers].reverse()) { // Bottom to top
    if (!layer.visible) continue;

    ctx.save();
    ctx.globalAlpha = layer.opacity;

    // Draw layer canvas scaled to thumbnail size
    ctx.drawImage(
      layer.canvas,
      0,
      0,
      layer.canvas.width,
      layer.canvas.height,
      0,
      0,
      canvas.width,
      canvas.height
    );

    ctx.restore();
  }

  // Convert to data URL (JPEG for smaller size)
  return canvas.toDataURL('image/jpeg', 0.7);
}

/**
 * Convert data URL to canvas
 */
async function dataUrlToCanvas(dataUrl: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      resolve(canvas);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image from data URL'));
    };

    img.src = dataUrl;
  });
}

// =============================================================================
// IndexedDB Storage Functions
// =============================================================================

/**
 * Store preset in IndexedDB
 *
 * Note: This is a temporary implementation using localStorage.
 * In production, this should use a dedicated IndexedDB object store.
 */
async function storePresetInIndexedDB(preset: StudioPreset): Promise<void> {
  // Get existing presets
  const presets = await loadAllPresetsFromIndexedDB();

  // Add or update preset
  const index = presets.findIndex((p) => p.id === preset.id);
  if (index >= 0) {
    presets[index] = preset;
  } else {
    presets.push(preset);
  }

  // Store back to localStorage
  // TODO: Replace with IndexedDB when schema is updated
  localStorage.setItem('studio-presets', JSON.stringify(presets));
}

/**
 * Load preset from IndexedDB
 */
async function loadPresetFromIndexedDB(id: string): Promise<StudioPreset | null> {
  const presets = await loadAllPresetsFromIndexedDB();
  return presets.find((p) => p.id === id) ?? null;
}

/**
 * Load all presets from IndexedDB
 */
async function loadAllPresetsFromIndexedDB(): Promise<StudioPreset[]> {
  try {
    const data = localStorage.getItem('studio-presets');
    if (!data) return [];

    return JSON.parse(data) as StudioPreset[];
  } catch (error) {
    logger.error('StudioPresets', 'Failed to load presets', error);
    return [];
  }
}

/**
 * Delete preset from IndexedDB
 */
async function deletePresetFromIndexedDB(id: string): Promise<void> {
  const presets = await loadAllPresetsFromIndexedDB();
  const filtered = presets.filter((p) => p.id !== id);

  localStorage.setItem('studio-presets', JSON.stringify(filtered));
}

/**
 * Clear all presets (for testing/debugging)
 */
export async function clearAllStudioPresets(): Promise<void> {
  localStorage.removeItem('studio-presets');
  logger.info('StudioPresets', 'Cleared all presets');
}
