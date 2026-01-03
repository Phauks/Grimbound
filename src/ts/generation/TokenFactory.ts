/**
 * Blood on the Clocktower Token Generator
 * Token Factory - Creates Token objects from rendered canvases
 *
 * Separates Token object creation from canvas rendering (TokenGenerator).
 * This factory handles metadata assembly, callback emission, and consistent Token structure.
 *
 * Memory Optimization:
 * - Encodes canvas to dataUrl immediately after token creation
 * - Clears canvas context to release GPU/bitmap memory
 * - Canvas element is kept but cleared (minimal overhead)
 * - Use getTokenCanvas() to recreate canvas from dataUrl when needed for export
 */

import CONFIG from '@/ts/config.js';
import type { Character, Team, Token, TokenCallback } from '@/ts/types/index.js';

// ============================================================================
// CANVAS ENCODING UTILITIES
// ============================================================================

/** Check WebP support once (WebP encoding is ~3-4x faster than PNG) */
let webpSupported: boolean | null = null;
function supportsWebP(): boolean {
  if (webpSupported !== null) return webpSupported;
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  webpSupported = canvas.toDataURL('image/webp').startsWith('data:image/webp');
  return webpSupported;
}

/**
 * Encode a canvas to an optimized data URL.
 * Uses WebP when supported (faster, smaller) with PNG fallback.
 */
function encodeCanvasToDataUrl(canvas: HTMLCanvasElement): string {
  return supportsWebP() ? canvas.toDataURL('image/webp', 0.92) : canvas.toDataURL('image/png');
}

/**
 * Clear a canvas to release memory while keeping the element.
 * This frees the bitmap memory while the element remains (minimal overhead).
 */
function clearCanvasMemory(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Clear the canvas content
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  // Resize to 1x1 to release the bitmap memory
  canvas.width = 1;
  canvas.height = 1;
}

/**
 * Recreate a canvas from a data URL.
 * Used by export functions that need canvas access (PDF bleed, etc.)
 *
 * @param dataUrl - The data URL to convert
 * @param width - Canvas width (from token.diameter)
 * @param height - Canvas height (from token.diameter)
 * @returns Promise resolving to a new canvas with the image drawn
 */
export async function getCanvasFromDataUrl(
  dataUrl: string,
  width: number,
  height: number
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
      }
      resolve(canvas);
    };
    img.onerror = () => reject(new Error('Failed to load image from data URL'));
    img.src = dataUrl;
  });
}

/**
 * Get or recreate a canvas from a token.
 * If token has a valid canvas with content, returns it.
 * Otherwise, recreates from dataUrl.
 *
 * @param token - The token to get canvas from
 * @returns Promise resolving to a canvas element
 */
export async function getTokenCanvas(token: Token): Promise<HTMLCanvasElement> {
  // If canvas exists and has valid dimensions, it might still have content
  if (token.canvas && token.canvas.width > 1 && token.canvas.height > 1) {
    return token.canvas;
  }

  // Recreate from dataUrl
  if (token.dataUrl) {
    return getCanvasFromDataUrl(token.dataUrl, token.diameter, token.diameter);
  }

  throw new Error(`Token "${token.name}" has no canvas or dataUrl`);
}

// ============================================================================
// TYPES
// ============================================================================

/** Token types for meta tokens */
export type MetaTokenType = 'script-name' | 'almanac' | 'pandemonium' | 'bootlegger' | 'jinx';

/** Variant information for characters with multiple images */
export interface VariantInfo {
  variantIndex: number;
  totalVariants: number;
}

/** Options for creating a character token */
export interface CharacterTokenOptions {
  canvas: HTMLCanvasElement;
  character: Character;
  filename: string;
  order: number;
  imageUrl?: string;
  variantInfo?: VariantInfo;
  hasDecorativeOverrides?: boolean;
}

/** Options for creating a reminder token */
export interface ReminderTokenOptions {
  canvas: HTMLCanvasElement;
  character: Character;
  reminderText: string;
  filename: string;
  order: number;
  variantInfo?: VariantInfo;
  hasDecorativeOverrides?: boolean;
}

/** Jinx data for regenerating jinx tokens */
export interface JinxTokenData {
  reason: string;
  char1: { id: string; name: string; image: string };
  char2: { id: string; name: string; image: string };
}

/** Options for creating a meta token */
export interface MetaTokenOptions {
  canvas: HTMLCanvasElement;
  type: MetaTokenType;
  name: string;
  filename: string;
  order?: number;
  jinxData?: JinxTokenData;
}

// ============================================================================
// TOKEN FACTORY
// ============================================================================

/**
 * Factory for creating Token objects from rendered canvases.
 *
 * Responsibilities:
 * - Assembles Token metadata from canvas and character data
 * - Calculates diameters based on DPI
 * - Handles optional callback emission
 * - Ensures consistent Token structure
 *
 * Does NOT handle:
 * - Canvas rendering (that's TokenGenerator's job)
 * - Filename generation (that's batchGenerator's job)
 * - Progress tracking (that's batchGenerator's job)
 */
export class TokenFactory {
  private readonly characterDiameter: number;
  private readonly reminderDiameter: number;

  /**
   * Create a new TokenFactory
   * @param tokenCallback - Optional callback to invoke when emitting tokens
   */
  constructor(private readonly tokenCallback?: TokenCallback | null) {
    // Pre-calculate diameters (used for every token)
    this.characterDiameter = CONFIG.TOKEN.ROLE_DIAMETER_INCHES * CONFIG.PDF.DPI;
    this.reminderDiameter = CONFIG.TOKEN.REMINDER_DIAMETER_INCHES * CONFIG.PDF.DPI;
  }

  // ==========================================================================
  // CHARACTER TOKENS
  // ==========================================================================

  /**
   * Create a character token from a rendered canvas.
   * Immediately encodes canvas to dataUrl and clears canvas memory.
   */
  createCharacterToken(options: CharacterTokenOptions): Token {
    const { canvas, character, filename, order, imageUrl, variantInfo, hasDecorativeOverrides } =
      options;

    // Encode canvas to dataUrl BEFORE creating token (memory optimization)
    const dataUrl = encodeCanvasToDataUrl(canvas);

    // Clear canvas memory - the dataUrl now holds all the image data
    clearCanvasMemory(canvas);

    const token: Token = {
      type: 'character',
      name: character.name,
      filename,
      team: (character.team || 'townsfolk') as Team,
      canvas, // Kept for type compatibility but cleared (1x1 pixel)
      dataUrl, // Primary image source
      diameter: this.characterDiameter,
      hasReminders: (character.reminders?.length ?? 0) > 0,
      reminderCount: character.reminders?.length ?? 0,
      parentUuid: character.uuid,
      isOfficial: character.source === 'official',
      order,
      characterData: character,
      imageUrl,
    };

    // Only add variant info if there are multiple variants
    if (variantInfo && variantInfo.totalVariants > 1) {
      token.variantIndex = variantInfo.variantIndex;
      token.totalVariants = variantInfo.totalVariants;
    }

    // Mark if generated with decorative overrides
    if (hasDecorativeOverrides) {
      token.hasDecorativeOverrides = true;
    }

    return token;
  }

  // ==========================================================================
  // REMINDER TOKENS
  // ==========================================================================

  /**
   * Create a reminder token from a rendered canvas.
   * Immediately encodes canvas to dataUrl and clears canvas memory.
   */
  createReminderToken(options: ReminderTokenOptions): Token {
    const {
      canvas,
      character,
      reminderText,
      filename,
      order,
      variantInfo,
      hasDecorativeOverrides,
    } = options;

    // Encode canvas to dataUrl BEFORE creating token (memory optimization)
    const dataUrl = encodeCanvasToDataUrl(canvas);

    // Clear canvas memory - the dataUrl now holds all the image data
    clearCanvasMemory(canvas);

    const token: Token = {
      type: 'reminder',
      name: `${character.name} - ${reminderText}`,
      filename,
      team: (character.team || 'townsfolk') as Team,
      canvas, // Kept for type compatibility but cleared (1x1 pixel)
      dataUrl, // Primary image source
      diameter: this.reminderDiameter,
      parentCharacter: character.name,
      parentUuid: character.uuid,
      reminderText,
      isOfficial: character.source === 'official',
      order,
    };

    // Only add variant info if there are multiple variants
    if (variantInfo && variantInfo.totalVariants > 1) {
      token.variantIndex = variantInfo.variantIndex;
      token.totalVariants = variantInfo.totalVariants;
    }

    // Mark if generated with decorative overrides
    if (hasDecorativeOverrides) {
      token.hasDecorativeOverrides = true;
    }

    return token;
  }

  // ==========================================================================
  // META TOKENS
  // ==========================================================================

  /**
   * Create a meta token (script-name, almanac, pandemonium, bootlegger, jinx).
   * Immediately encodes canvas to dataUrl and clears canvas memory.
   */
  createMetaToken(options: MetaTokenOptions): Token {
    const { canvas, type, name, filename, order, jinxData } = options;

    // Encode canvas to dataUrl BEFORE creating token (memory optimization)
    const dataUrl = encodeCanvasToDataUrl(canvas);

    // Clear canvas memory - the dataUrl now holds all the image data
    clearCanvasMemory(canvas);

    const token: Token = {
      type,
      name,
      filename,
      team: 'meta',
      canvas, // Kept for type compatibility but cleared (1x1 pixel)
      dataUrl, // Primary image source
      diameter: this.characterDiameter, // Meta tokens use character size
    };

    if (order !== undefined) {
      token.order = order;
    }

    if (jinxData) {
      token.jinxData = jinxData;
    }

    return token;
  }

  // ==========================================================================
  // EMISSION HELPERS
  // ==========================================================================

  /**
   * Emit a token via the callback (if provided) and return it.
   * Convenience method that combines callback invocation with return.
   *
   * @param token - The token to emit
   * @returns The same token (for chaining)
   */
  emit(token: Token): Token {
    this.tokenCallback?.(token);
    return token;
  }

  /**
   * Emit a token and push it to an array.
   * Convenience method for the common pattern of emit + push.
   *
   * @param token - The token to emit
   * @param tokens - The array to push to
   */
  emitAndPush(token: Token, tokens: Token[]): void {
    this.tokenCallback?.(token);
    tokens.push(token);
  }
}
