/**
 * Blood on the Clocktower Token Generator
 * Batch Token Generation - Orchestrates bulk token creation with parallel processing
 */

import CONFIG from '../config.js';
import {
    sanitizeFilename,
    generateUniqueFilename,
    createProgressState,
    updateProgress
} from '../utils/index.js';
import type { ProgressState } from '../utils/index.js';
import { TokenGenerator } from './tokenGenerator.js';
import { getAllCharacterImageUrls } from '../data/characterUtils.js';
import type { Character, Token, GenerationOptions, ProgressCallback, TokenCallback, Team, ScriptMeta } from '../types/index.js';

// ============================================================================
// TOKEN COUNT CALCULATION
// ============================================================================

/**
 * Calculate total token count including meta tokens
 */
function calculateTotalTokenCount(
    characters: Character[],
    options: Partial<GenerationOptions>,
    scriptMeta: ScriptMeta | null
): number {
    let metaTokenCount = 0;
    if (options.pandemoniumToken) metaTokenCount++;
    if (options.scriptNameToken && scriptMeta?.name) metaTokenCount++;
    if (options.almanacToken && scriptMeta?.almanac) metaTokenCount++;

    const characterTokenCount = characters.reduce((sum, char) => {
        // If generating variants, count all image variants for each character
        const imageCount = options.generateImageVariants 
            ? getAllCharacterImageUrls(char.image).length || 1
            : 1;
        return sum + imageCount + (char.reminders?.length ?? 0);
    }, 0);

    return characterTokenCount + metaTokenCount;
}

// ============================================================================
// META TOKEN GENERATION
// ============================================================================

/**
 * Generate meta tokens (Pandemonium, Script Name, Almanac QR)
 */
async function generateMetaTokens(
    generator: TokenGenerator,
    options: Partial<GenerationOptions>,
    scriptMeta: ScriptMeta | null,
    progress: ProgressState,
    dpi: number,
    tokenCallback: TokenCallback | null = null,
    signal?: AbortSignal
): Promise<Token[]> {
    const tokens: Token[] = [];

    if (options.pandemoniumToken) {
        // Check for cancellation
        if (signal?.aborted) {
            throw new DOMException('Token generation aborted', 'AbortError');
        }
        
        try {
            const canvas = await generator.generatePandemoniumToken();
            const token: Token = {
                type: 'pandemonium',
                name: 'Pandemonium Institute',
                filename: '_pandemonium_institute',
                team: 'meta',
                canvas,
                diameter: CONFIG.TOKEN.ROLE_DIAMETER_INCHES * dpi
            };
            if (tokenCallback) tokenCallback(token);
            tokens.push(token);
        } catch (error) {
            console.error('Failed to generate pandemonium token:', error);
        }
        updateProgress(progress);
    }

    if (options.scriptNameToken && scriptMeta?.name) {
        // Check for cancellation
        if (signal?.aborted) {
            throw new DOMException('Token generation aborted', 'AbortError');
        }
        
        try {
            const hideAuthor = options.hideScriptNameAuthor ?? false;
            const canvas = await generator.generateScriptNameToken(scriptMeta.name, scriptMeta.author, hideAuthor);
            const token: Token = {
                type: 'script-name',
                name: scriptMeta.name,
                filename: '_script_name',
                team: 'meta',
                canvas,
                diameter: CONFIG.TOKEN.ROLE_DIAMETER_INCHES * dpi
            };
            if (tokenCallback) tokenCallback(token);
            tokens.push(token);
        } catch (error) {
            console.error('Failed to generate script name token:', error);
        }
        updateProgress(progress);
    }

    if (options.almanacToken && scriptMeta?.almanac && scriptMeta?.name) {
        // Check for cancellation
        if (signal?.aborted) {
            throw new DOMException('Token generation aborted', 'AbortError');
        }
        
        try {
            const canvas = await generator.generateAlmanacQRToken(scriptMeta.almanac, scriptMeta.name);
            const token: Token = {
                type: 'almanac',
                name: `${scriptMeta.name} Almanac`,
                filename: '_almanac_qr',
                team: 'meta',
                canvas,
                diameter: CONFIG.TOKEN.ROLE_DIAMETER_INCHES * dpi
            };
            if (tokenCallback) tokenCallback(token);
            tokens.push(token);
        } catch (error) {
            console.error('Failed to generate almanac QR token:', error);
        }
        updateProgress(progress);
    }

    return tokens;
}

// ============================================================================
// CHARACTER TOKEN GENERATION
// ============================================================================

/**
 * Generate a single character token with unique filename
 */
async function generateSingleCharacterToken(
    generator: TokenGenerator,
    character: Character,
    nameCount: Map<string, number>,
    dpi: number
): Promise<Token | null> {
    if (!character.name) return null;

    try {
        const canvas = await generator.generateCharacterToken(character);
        const baseName = sanitizeFilename(character.name);
        const filename = generateUniqueFilename(nameCount, baseName);

        // Check if character is official based on source field
        const isOfficial = character.source === 'official';

        return {
            type: 'character',
            name: character.name,
            filename,
            team: (character.team || 'townsfolk') as Team,
            canvas,
            diameter: CONFIG.TOKEN.ROLE_DIAMETER_INCHES * dpi,
            hasReminders: (character.reminders?.length ?? 0) > 0,
            reminderCount: character.reminders?.length ?? 0,
            parentUuid: character.uuid,
            isOfficial,
        };
    } catch (error) {
        console.error(`Failed to generate token for ${character.name}:`, error);
        return null;
    }
}

// ============================================================================
// REMINDER TOKEN GENERATION
// ============================================================================

/**
 * Generate reminder tokens for a character
 */
async function generateReminderTokensForCharacter(
    generator: TokenGenerator,
    character: Character,
    progress: ProgressState,
    dpi: number,
    isCharacterOfficial: boolean,
    characterOrder: number,
    generateVariants: boolean = false,
    tokenCallback: TokenCallback | null = null,
    signal?: AbortSignal
): Promise<Token[]> {
    const tokens: Token[] = [];
    if (!character.reminders || !Array.isArray(character.reminders)) return tokens;

    const reminderNameCount = new Map<string, number>();
    
    // Get image URLs for variants
    const imageUrls = generateVariants ? getAllCharacterImageUrls(character.image) : [undefined];
    const hasVariants = imageUrls.length > 1 && generateVariants;

    for (const reminder of character.reminders) {
        // Check for cancellation
        if (signal?.aborted) {
            throw new DOMException('Token generation aborted', 'AbortError');
        }

        // Generate reminder for each image variant (or just once if no variants)
        for (let variantIndex = 0; variantIndex < imageUrls.length; variantIndex++) {
            const imageUrl = imageUrls[variantIndex];
            
            try {
                const canvas = await generator.generateReminderToken(character, reminder, imageUrl);
                const variantSuffix = hasVariants ? `_v${variantIndex + 1}` : '';
                const reminderBaseName = sanitizeFilename(`${character.name}_${reminder}${variantSuffix}`);
                const filename = generateUniqueFilename(reminderNameCount, reminderBaseName);

                const token: Token = {
                    type: 'reminder',
                    name: `${character.name} - ${reminder}`,
                    filename,
                    team: (character.team || 'townsfolk') as Team,
                    canvas,
                    diameter: CONFIG.TOKEN.REMINDER_DIAMETER_INCHES * dpi,
                    parentCharacter: character.name,
                    parentUuid: character.uuid,
                    reminderText: reminder,
                    isOfficial: isCharacterOfficial,
                    order: characterOrder,
                    // Only set variant properties if there are multiple variants
                    ...(hasVariants && { variantIndex, totalVariants: imageUrls.length }),
                };
                // Emit token immediately if callback provided
                if (tokenCallback) tokenCallback(token);
                tokens.push(token);
            } catch (error) {
                console.error(`Failed to generate reminder token "${reminder}" for ${character.name}:`, error);
            }
            updateProgress(progress);
        }
    }

    return tokens;
}

/**
 * Generate character and reminder tokens for all characters using parallel batching
 */
async function generateCharacterAndReminderTokens(
    generator: TokenGenerator,
    characters: Character[],
    progress: ProgressState,
    dpi: number,
    generateImageVariants: boolean = false,
    generateReminderVariants: boolean = false,
    tokenCallback: TokenCallback | null = null,
    signal?: AbortSignal
): Promise<Token[]> {
    const tokens: Token[] = [];
    const nameCount = new Map<string, number>();
    const batchSize = CONFIG.GENERATION.BATCH_SIZE;

    // Process characters in parallel batches
    for (let i = 0; i < characters.length; i += batchSize) {
        // Check for cancellation before each batch
        if (signal?.aborted) {
            throw new DOMException('Token generation aborted', 'AbortError');
        }

        const batch = characters.slice(i, i + batchSize);

        // Pre-compute filenames and official status for this batch
        // When generating variants, each image needs a unique filename
        const batchInfo = batch.map(character => {
            if (!character.name) return { variants: [] as Array<{ filename: string; imageUrl: string | undefined; variantIndex: number; totalVariants: number }>, isOfficial: false };
            // Check if character is official based on source field
            const isOfficial = character.source === 'official';
            
            if (generateImageVariants) {
                const imageUrls = getAllCharacterImageUrls(character.image);
                if (imageUrls.length > 1) {
                    // Multiple images - generate variant filenames
                    const totalVariants = imageUrls.length;
                    const variants = imageUrls.map((imageUrl, variantIndex) => {
                        const baseName = sanitizeFilename(`${character.name}_v${variantIndex + 1}`);
                        const filename = generateUniqueFilename(nameCount, baseName);
                        return { filename, imageUrl, variantIndex, totalVariants };
                    });
                    return { variants, isOfficial };
                }
            }
            
            // Single image or variants disabled
            const baseName = sanitizeFilename(character.name);
            const filename = generateUniqueFilename(nameCount, baseName);
            return { variants: [{ filename, imageUrl: undefined, variantIndex: 0, totalVariants: 1 }], isOfficial };
        });

        // Generate character tokens in parallel (including variants)
        const charTokenPromises: Promise<Token | null>[] = [];
        
        batch.forEach((character, idx) => {
            const { variants, isOfficial } = batchInfo[idx];
            if (!character.name || variants.length === 0) return;
            
            // Calculate the absolute index in the original characters array
            const absoluteIndex = i + idx;

            for (const { filename, imageUrl, variantIndex, totalVariants } of variants) {
                charTokenPromises.push((async () => {
                    try {
                        const canvas = await generator.generateCharacterToken(character, imageUrl);
                        updateProgress(progress);
                        const token: Token = {
                            type: 'character' as const,
                            name: character.name,
                            filename,
                            team: (character.team || 'townsfolk') as Team,
                            canvas,
                            diameter: CONFIG.TOKEN.ROLE_DIAMETER_INCHES * dpi,
                            hasReminders: (character.reminders?.length ?? 0) > 0,
                            reminderCount: character.reminders?.length ?? 0,
                            isOfficial,
                            order: absoluteIndex,
                            // Only set variant properties if there are multiple variants
                            ...(totalVariants > 1 && { variantIndex, totalVariants }),
                        };
                        // Emit token immediately if callback provided
                        if (tokenCallback) tokenCallback(token);
                        return token;
                    } catch (error) {
                        console.error(`Failed to generate token for ${character.name}:`, error);
                        updateProgress(progress);
                        return null;
                    }
                })());
            }
        });

        const charTokens = await Promise.all(charTokenPromises);
        for (const token of charTokens) {
            if (token !== null) tokens.push(token);
        }

        // Generate reminder tokens in parallel for this batch (only once per character, not per variant)
        const reminderPromises = batch.map((character, idx) => {
            const absoluteIndex = i + idx;
            return generateReminderTokensForCharacter(generator, character, progress, dpi, batchInfo[idx].isOfficial, absoluteIndex, generateReminderVariants, tokenCallback, signal);
        });
        const reminderResults = await Promise.all(reminderPromises);
        reminderResults.forEach(reminders => tokens.push(...reminders));
    }

    return tokens;
}

// ============================================================================
// MAIN BATCH GENERATION FUNCTION
// ============================================================================

/**
 * Generate all tokens for a list of characters
 * @param characters - Array of character data (must have source field set)
 * @param options - Generation options
 * @param progressCallback - Optional callback for progress updates
 * @param scriptMeta - Optional script metadata for meta tokens
 * @param tokenCallback - Optional callback for incremental token updates (called as each token is generated)
 * @param signal - Optional AbortSignal for cancellation
 * @returns Promise resolving to array of generated tokens
 */
export async function generateAllTokens(
    characters: Character[],
    options: Partial<GenerationOptions> = {},
    progressCallback: ProgressCallback | null = null,
    scriptMeta: ScriptMeta | null = null,
    tokenCallback: TokenCallback | null = null,
    signal?: AbortSignal
): Promise<Token[]> {
    // Check for cancellation before starting
    if (signal?.aborted) {
        throw new DOMException('Token generation aborted', 'AbortError');
    }

    const generatorOptions = {
        ...options,
        transparentBackground: options.pngSettings?.transparentBackground ?? false,
        bootleggerRules: options.generateBootleggerRules ? scriptMeta?.bootlegger : undefined,
        logoUrl: scriptMeta?.logo,
    };
    const generator = new TokenGenerator(generatorOptions);

    const total = calculateTotalTokenCount(characters, options, scriptMeta);
    const progress = createProgressState(total, progressCallback);

    const dpi = options.dpi ?? CONFIG.PDF.DPI;

    // Generate meta tokens first (so they appear quickly)
    const metaTokens = await generateMetaTokens(generator, options, scriptMeta, progress, dpi, tokenCallback, signal);

    // Check for cancellation between meta and character tokens
    if (signal?.aborted) {
        throw new DOMException('Token generation aborted', 'AbortError');
    }

    const characterTokens = await generateCharacterAndReminderTokens(generator, characters, progress, dpi, options.generateImageVariants ?? false, options.generateReminderVariants ?? false, tokenCallback, signal);

    // Return character tokens first, meta tokens last (for display ordering)
    return [...characterTokens, ...metaTokens];
}

/**
 * Generate only the script-name token for a project (for hover pre-rendering)
 */
export async function generateScriptNameTokenOnly(
    options: Partial<GenerationOptions>,
    scriptMeta: ScriptMeta | null,
    signal?: AbortSignal
): Promise<Token | null> {
    if (!scriptMeta?.name || !options.scriptNameToken) {
        return null;
    }

    if (signal?.aborted) {
        throw new DOMException('Token generation aborted', 'AbortError');
    }

    const generatorOptions = {
        ...options,
        transparentBackground: options.pngSettings?.transparentBackground ?? false,
        logoUrl: scriptMeta?.logo,
    };
    const generator = new TokenGenerator(generatorOptions);
    const dpi = options.dpi ?? CONFIG.PDF.DPI;

    try {
        const hideAuthor = options.hideScriptNameAuthor ?? false;
        const canvas = await generator.generateScriptNameToken(scriptMeta.name, scriptMeta.author, hideAuthor);
        const token: Token = {
            type: 'script-name',
            name: scriptMeta.name,
            filename: '_script_name',
            team: 'meta',
            canvas,
            diameter: CONFIG.TOKEN.ROLE_DIAMETER_INCHES * dpi
        };
        return token;
    } catch (error) {
        console.error('Failed to generate script name token:', error);
        return null;
    }
}
