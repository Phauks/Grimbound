/**
 * Blood on the Clocktower Token Generator
 * Token Factory - Creates Token objects from rendered canvases
 *
 * Separates Token object creation from canvas rendering (TokenGenerator).
 * This factory handles metadata assembly, callback emission, and consistent Token structure.
 */

import CONFIG from '@/ts/config.js';
import type { Character, Team, Token, TokenCallback } from '@/ts/types/index.js';

// ============================================================================
// TYPES
// ============================================================================

/** Token types for meta tokens */
export type MetaTokenType = 'script-name' | 'almanac' | 'pandemonium' | 'bootlegger';

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

/** Options for creating a meta token */
export interface MetaTokenOptions {
  canvas: HTMLCanvasElement;
  type: MetaTokenType;
  name: string;
  filename: string;
  order?: number;
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
   * @param dpi - DPI for diameter calculations
   * @param tokenCallback - Optional callback to invoke when emitting tokens
   */
  constructor(
    dpi: number,
    private readonly tokenCallback?: TokenCallback | null
  ) {
    // Pre-calculate diameters (used for every token)
    this.characterDiameter = CONFIG.TOKEN.ROLE_DIAMETER_INCHES * dpi;
    this.reminderDiameter = CONFIG.TOKEN.REMINDER_DIAMETER_INCHES * dpi;
  }

  // ==========================================================================
  // CHARACTER TOKENS
  // ==========================================================================

  /**
   * Create a character token from a rendered canvas
   */
  createCharacterToken(options: CharacterTokenOptions): Token {
    const { canvas, character, filename, order, imageUrl, variantInfo, hasDecorativeOverrides } =
      options;

    const token: Token = {
      type: 'character',
      name: character.name,
      filename,
      team: (character.team || 'townsfolk') as Team,
      canvas,
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
   * Create a reminder token from a rendered canvas
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

    const token: Token = {
      type: 'reminder',
      name: `${character.name} - ${reminderText}`,
      filename,
      team: (character.team || 'townsfolk') as Team,
      canvas,
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
   * Create a meta token (script-name, almanac, pandemonium, bootlegger)
   */
  createMetaToken(options: MetaTokenOptions): Token {
    const { canvas, type, name, filename, order } = options;

    const token: Token = {
      type,
      name,
      filename,
      team: 'meta',
      canvas,
      diameter: this.characterDiameter, // Meta tokens use character size
    };

    if (order !== undefined) {
      token.order = order;
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
