/**
 * Utility functions for Token Detail View
 * Handles regeneration, editing, and exporting individual tokens
 */

import CONFIG from '../config.js';
import { createTokensZip } from '../export/index.js';
import { TokenGenerator } from '../generation/index.js';
import type { Character, GenerationOptions, Team, Token } from '../types/index.js';
import { downloadFile, sanitizeFilename } from '../utils/index.js';

/**
 * Regenerate a single character token with edited data
 */
export async function regenerateSingleToken(
  editedCharacter: Character,
  _originalCharacter: Character,
  generationOptions: GenerationOptions
): Promise<HTMLCanvasElement> {
  // Extract transparentBackground from pngSettings for TokenGenerator
  const generatorOptions = {
    ...generationOptions,
    transparentBackground: generationOptions.pngSettings?.transparentBackground ?? false,
  };
  const generator = new TokenGenerator(generatorOptions);

  try {
    const canvas = await generator.generateCharacterToken(editedCharacter);
    return canvas;
  } catch (error) {
    console.error('Failed to regenerate character token:', error);
    throw error;
  }
}

/**
 * Regenerate character token and all associated reminder tokens
 * Returns the new tokens that should replace the old ones
 * @param editedCharacter - The character data to generate tokens for
 * @param generationOptions - Token generation options
 * @param imageOverride - Optional specific image URL to use (for variant preview)
 */
export async function regenerateCharacterAndReminders(
  editedCharacter: Character,
  generationOptions: GenerationOptions,
  imageOverride?: string
): Promise<{ characterToken: Token; reminderTokens: Token[] }> {
  const generatorOptions = {
    ...generationOptions,
    transparentBackground: generationOptions.pngSettings?.transparentBackground ?? false,
  };
  const generator = new TokenGenerator(generatorOptions);
  const dpi = generationOptions.dpi ?? CONFIG.PDF.DPI;

  try {
    // Generate character token (with optional image override for variant preview)
    const charCanvas = await generator.generateCharacterToken(editedCharacter, imageOverride);
    const charFilename = sanitizeFilename(editedCharacter.name);

    const characterToken: Token = {
      type: 'character',
      name: editedCharacter.name,
      filename: charFilename,
      team: (editedCharacter.team || 'townsfolk') as Team,
      canvas: charCanvas,
      diameter: CONFIG.TOKEN.ROLE_DIAMETER_INCHES * dpi,
      parentUuid: editedCharacter.uuid,
    };

    // Generate reminder tokens
    const reminderTokens: Token[] = [];

    if (editedCharacter.reminders && Array.isArray(editedCharacter.reminders)) {
      const reminderNameCount = new Map<string, number>();

      for (const reminder of editedCharacter.reminders) {
        try {
          const canvas = await generator.generateReminderToken(
            editedCharacter,
            reminder,
            imageOverride
          );
          const reminderBaseName = sanitizeFilename(`${editedCharacter.name}_${reminder}`);

          // Handle duplicate reminders
          if (!reminderNameCount.has(reminderBaseName)) {
            reminderNameCount.set(reminderBaseName, 0);
          }
          const count = reminderNameCount.get(reminderBaseName) ?? 0;
          reminderNameCount.set(reminderBaseName, count + 1);

          const filename =
            count === 0
              ? reminderBaseName
              : `${reminderBaseName}_${String(count).padStart(2, '0')}`;

          reminderTokens.push({
            type: 'reminder',
            name: `${editedCharacter.name} - ${reminder}`,
            filename,
            team: (editedCharacter.team || 'townsfolk') as Team,
            canvas,
            diameter: CONFIG.TOKEN.REMINDER_DIAMETER_INCHES * dpi,
            parentCharacter: editedCharacter.name,
            parentUuid: editedCharacter.uuid,
            reminderText: reminder,
          });
        } catch (error) {
          console.error(
            `Failed to generate reminder token "${reminder}" for ${editedCharacter.name}:`,
            error
          );
        }
      }
    }

    return { characterToken, reminderTokens };
  } catch (error) {
    console.error('Failed to regenerate character and reminders:', error);
    throw error;
  }
}

/**
 * Update a character in the script JSON
 */
export function updateCharacterInJson(
  jsonString: string,
  characterId: string,
  updatedCharacter: Character
): string {
  try {
    const parsed = JSON.parse(jsonString);

    // Handle both array-based and object-based scripts
    if (Array.isArray(parsed)) {
      const index = parsed.findIndex((item: unknown) => {
        if (typeof item === 'string') return item === characterId;
        if (typeof item === 'object' && item !== null && (item as { id?: string }).id === characterId) return true;
        return false;
      });

      if (index !== -1) {
        parsed[index] = updatedCharacter;
      }
    }

    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    console.error('Failed to update character in JSON:', error);
    throw error;
  }
}

/**
 * Update the _meta entry in the script JSON
 * If no _meta exists, it will be added at the beginning
 */
export function updateMetaInJson(
  jsonString: string,
  updatedMeta: {
    id: '_meta';
    name?: string;
    author?: string;
    version?: string;
    logo?: string;
    almanac?: string;
    background?: string;
  }
): string {
  try {
    const parsed = JSON.parse(jsonString);

    // Handle array-based scripts
    if (Array.isArray(parsed)) {
      const index = parsed.findIndex((item: unknown) => {
        return typeof item === 'object' && item !== null && (item as { id?: string }).id === '_meta';
      });

      if (index !== -1) {
        // Update existing _meta
        parsed[index] = updatedMeta;
      } else {
        // Add _meta at the beginning
        parsed.unshift(updatedMeta);
      }
    }

    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    console.error('Failed to update meta in JSON:', error);
    throw error;
  }
}

/**
 * Create and download a ZIP file with character + reminder tokens + JSON
 */
export async function downloadCharacterTokensAsZip(
  characterToken: Token,
  reminderTokens: Token[],
  characterName: string,
  pngSettings?: { embedMetadata: boolean; transparentBackground: boolean },
  characterData?: Character,
  progressCallback?: (current: number, total: number) => void
): Promise<void> {
  try {
    // Combine all tokens for this character
    const tokensToZip = [characterToken, ...reminderTokens];

    // Create character JSON if provided
    const characterJson = characterData ? JSON.stringify(characterData, null, 2) : undefined;

    // Use the existing createTokensZip function
    const blob = await createTokensZip(
      tokensToZip,
      progressCallback || null,
      {
        saveInTeamFolders: false,
        saveRemindersSeparately: false,
        metaTokenFolder: false,
        includeScriptJson: !!characterJson,
        compressionLevel: 'normal',
      },
      characterJson, // scriptJson - we'll use this for character JSON
      pngSettings // pngSettings for metadata embedding
    );

    // Download as ZIP
    downloadFile(blob, `${characterName}_tokens.zip`);
  } catch (error) {
    console.error('Failed to create ZIP file:', error);
    throw error;
  }
}

/**
 * Download only the character token as a PNG file
 */
export async function downloadCharacterTokenOnly(
  characterToken: Token,
  characterName: string,
  _pngSettings?: { embedMetadata: boolean; transparentBackground: boolean }
): Promise<void> {
  try {
    const canvas = characterToken.canvas;
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      }, 'image/png');
    });

    const filename = `${sanitizeFilename(characterName)}.png`;
    downloadFile(blob, filename);
  } catch (error) {
    console.error('Failed to download character token:', error);
    throw error;
  }
}

/**
 * Download only reminder tokens as a ZIP file
 */
export async function downloadReminderTokensOnly(
  reminderTokens: Token[],
  characterName: string,
  pngSettings?: { embedMetadata: boolean; transparentBackground: boolean }
): Promise<void> {
  if (reminderTokens.length === 0) {
    throw new Error('No reminder tokens to download');
  }

  try {
    // Use the existing createTokensZip function
    const blob = await createTokensZip(
      reminderTokens,
      null,
      {
        saveInTeamFolders: false,
        saveRemindersSeparately: false,
        metaTokenFolder: false,
        includeScriptJson: false,
        compressionLevel: 'normal',
      },
      undefined, // scriptJson
      pngSettings // pngSettings for metadata embedding
    );

    // Download as ZIP
    downloadFile(blob, `${characterName}_reminders.zip`);
  } catch (error) {
    console.error('Failed to create reminders ZIP file:', error);
    throw error;
  }
}

/**
 * Calculate changes between original and edited character
 */
export function getCharacterChanges(original: Character, edited: Character): Partial<Character> {
  const changes: Partial<Character> = {};
  const keys = Object.keys(edited) as (keyof Character)[];

  for (const key of keys) {
    if (JSON.stringify(original[key]) !== JSON.stringify(edited[key])) {
      (changes as Record<string, unknown>)[key] = edited[key];
    }
  }

  return changes;
}
