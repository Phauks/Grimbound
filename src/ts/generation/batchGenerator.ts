/**
 * Blood on the Clocktower Token Generator
 * Batch Token Generation - Orchestrates bulk token creation with parallel processing
 *
 * Architecture:
 * - Uses TokenGenerator for canvas rendering (low-level)
 * - Uses TokenFactory for Token object creation (metadata assembly)
 * - Orchestrates batching, progress, and abort handling (high-level)
 */

import type { TextLayoutResult } from '@/ts/canvas/index.js';
import CONFIG from '@/ts/config.js';
import { getAllCharacterImageUrls } from '@/ts/data/characterUtils.js';
import {
  createPreloadTasks,
  preResolveAssetsWithPriority,
} from '@/ts/services/upload/assetResolver.js';
import type {
  Character,
  GenerationOptions,
  ProgressCallback,
  ScriptMeta,
  Token,
  TokenCallback,
} from '@/ts/types/index.js';
import type { ProgressState } from '@/ts/utils/index.js';
import {
  createProgressState,
  generateUniqueFilename,
  logger,
  sanitizeFilename,
  updateProgress,
} from '@/ts/utils/index.js';
import { TokenFactory } from './TokenFactory.js';
import { TokenGenerator } from './TokenGenerator.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Context object passed to generation functions.
 * Reduces parameter count and groups related dependencies.
 */
interface BatchContext {
  generator: TokenGenerator;
  factory: TokenFactory;
  progress: ProgressState;
  options: Partial<GenerationOptions>;
  scriptMeta: ScriptMeta | null;
  signal?: AbortSignal;
}

/**
 * Variant information for characters with multiple images
 */
interface CharacterVariant {
  filename: string;
  imageUrl: string | undefined;
  variantIndex: number;
  totalVariants: number;
}

/**
 * Pre-computed batch info for a character
 */
interface CharacterBatchInfo {
  variants: CharacterVariant[];
  isOfficial: boolean;
}

// ============================================================================
// UTILITY HELPERS
// ============================================================================

/**
 * Check if generation has been aborted and throw if so.
 * @throws DOMException with 'AbortError' name if aborted
 */
function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('Token generation aborted', 'AbortError');
  }
}

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
  if (options.generateBootleggerRules && scriptMeta?.bootlegger?.length) {
    metaTokenCount += scriptMeta.bootlegger.length;
  }

  const characterTokenCount = characters.reduce((sum, char) => {
    const imageCount = options.generateImageVariants
      ? getAllCharacterImageUrls(char.image).length || 1
      : 1;
    return sum + imageCount + (char.reminders?.length ?? 0);
  }, 0);

  return characterTokenCount + metaTokenCount;
}

// ============================================================================
// META TOKEN GENERATION - Individual Token Functions
// ============================================================================

/**
 * Generate Pandemonium token if enabled
 */
async function generatePandemoniumIfEnabled(ctx: BatchContext): Promise<Token | null> {
  if (!ctx.options.pandemoniumToken) return null;

  checkAbort(ctx.signal);

  try {
    const canvas = await ctx.generator.generatePandemoniumToken();
    const token = ctx.factory.createMetaToken({
      canvas,
      type: 'pandemonium',
      name: 'Pandemonium Institute',
      filename: '_pandemonium_institute',
    });
    return ctx.factory.emit(token);
  } catch (error) {
    logger.error('BatchGenerator', 'Failed to generate pandemonium token', error);
    return null;
  } finally {
    updateProgress(ctx.progress);
  }
}

/**
 * Generate Script Name token if enabled
 */
async function generateScriptNameIfEnabled(ctx: BatchContext): Promise<Token | null> {
  if (!(ctx.options.scriptNameToken && ctx.scriptMeta?.name)) return null;

  checkAbort(ctx.signal);

  try {
    const hideAuthor = ctx.options.hideScriptNameAuthor ?? false;
    const canvas = await ctx.generator.generateScriptNameToken(
      ctx.scriptMeta.name,
      ctx.scriptMeta.author,
      hideAuthor
    );
    const token = ctx.factory.createMetaToken({
      canvas,
      type: 'script-name',
      name: ctx.scriptMeta.name,
      filename: '_script_name',
    });
    return ctx.factory.emit(token);
  } catch (error) {
    logger.error('BatchGenerator', 'Failed to generate script name token', error);
    return null;
  } finally {
    updateProgress(ctx.progress);
  }
}

/**
 * Generate Almanac QR token if enabled
 */
async function generateAlmanacIfEnabled(ctx: BatchContext): Promise<Token | null> {
  if (!(ctx.options.almanacToken && ctx.scriptMeta?.almanac && ctx.scriptMeta?.name)) return null;

  checkAbort(ctx.signal);

  try {
    const canvas = await ctx.generator.generateAlmanacQRToken(
      ctx.scriptMeta.almanac,
      ctx.scriptMeta.name,
      ctx.scriptMeta.logo
    );
    const token = ctx.factory.createMetaToken({
      canvas,
      type: 'almanac',
      name: `${ctx.scriptMeta.name} Almanac`,
      filename: '_almanac_qr',
    });
    return ctx.factory.emit(token);
  } catch (error) {
    logger.error('BatchGenerator', 'Failed to generate almanac QR token', error);
    return null;
  } finally {
    updateProgress(ctx.progress);
  }
}

/**
 * Calculate normalized layout for bootlegger tokens (for consistent icon sizing)
 */
function calculateNormalizedBootleggerLayout(
  generator: TokenGenerator,
  entries: string[],
  normalize: boolean
): TextLayoutResult | undefined {
  if (!normalize || entries.length <= 1) return undefined;

  let maxTextHeight = 0;
  let normalizedLayout: TextLayoutResult | undefined;

  for (const text of entries) {
    const layout = generator.calculateBootleggerLayout(text);
    if (layout && layout.totalHeight > maxTextHeight) {
      maxTextHeight = layout.totalHeight;
      normalizedLayout = layout;
    }
  }

  return normalizedLayout;
}

/**
 * Generate all Bootlegger tokens if enabled
 */
async function generateBootleggerTokens(ctx: BatchContext): Promise<Token[]> {
  const tokens: Token[] = [];

  if (!(ctx.options.generateBootleggerRules && ctx.scriptMeta?.bootlegger?.length)) {
    return tokens;
  }

  const bootleggerEntries = ctx.scriptMeta.bootlegger.filter((text) => text?.trim());
  const normalizedLayout = calculateNormalizedBootleggerLayout(
    ctx.generator,
    bootleggerEntries,
    ctx.options.bootleggerNormalizeIcons ?? false
  );

  for (let i = 0; i < ctx.scriptMeta.bootlegger.length; i++) {
    const abilityText = ctx.scriptMeta.bootlegger[i];

    checkAbort(ctx.signal);

    // Skip empty entries but still update progress
    if (!abilityText?.trim()) {
      updateProgress(ctx.progress);
      continue;
    }

    try {
      const canvas = await ctx.generator.generateBootleggerToken(abilityText, normalizedLayout);
      const token = ctx.factory.createMetaToken({
        canvas,
        type: 'bootlegger',
        name: `Bootlegger ${i + 1}`,
        filename: `_bootlegger_${i + 1}`,
        order: i,
      });
      ctx.factory.emitAndPush(token, tokens);
    } catch (error) {
      logger.error('BatchGenerator', `Failed to generate bootlegger token ${i + 1}`, error);
    }
    updateProgress(ctx.progress);
  }

  return tokens;
}

/**
 * Generate all meta tokens (Pandemonium, Script Name, Almanac QR, Bootlegger)
 */
async function generateMetaTokens(ctx: BatchContext): Promise<Token[]> {
  const tokens: Token[] = [];

  // Generate each meta token type
  const pandemonium = await generatePandemoniumIfEnabled(ctx);
  if (pandemonium) tokens.push(pandemonium);

  const scriptName = await generateScriptNameIfEnabled(ctx);
  if (scriptName) tokens.push(scriptName);

  const almanac = await generateAlmanacIfEnabled(ctx);
  if (almanac) tokens.push(almanac);

  const bootleggers = await generateBootleggerTokens(ctx);
  tokens.push(...bootleggers);

  return tokens;
}

// ============================================================================
// CHARACTER & REMINDER TOKEN GENERATION
// ============================================================================

/**
 * Pre-compute batch info for a character (filenames, variant info, official status)
 */
function computeCharacterBatchInfo(
  character: Character,
  generateImageVariants: boolean,
  nameCount: Map<string, number>
): CharacterBatchInfo {
  if (!character.name) {
    return { variants: [], isOfficial: false };
  }

  const isOfficial = character.source === 'official';

  // Check for multiple image variants
  if (generateImageVariants) {
    const imageUrls = getAllCharacterImageUrls(character.image);
    if (imageUrls.length > 1) {
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
  return {
    variants: [{ filename, imageUrl: undefined, variantIndex: 0, totalVariants: 1 }],
    isOfficial,
  };
}

/**
 * Generate a single character token variant
 */
async function generateCharacterVariant(
  ctx: BatchContext,
  character: Character,
  variant: CharacterVariant,
  order: number
): Promise<Token | null> {
  try {
    const canvas = await ctx.generator.generateCharacterToken(character, variant.imageUrl);
    updateProgress(ctx.progress);

    const token = ctx.factory.createCharacterToken({
      canvas,
      character,
      filename: variant.filename,
      order,
      imageUrl: variant.imageUrl,
      variantInfo:
        variant.totalVariants > 1
          ? { variantIndex: variant.variantIndex, totalVariants: variant.totalVariants }
          : undefined,
    });

    return ctx.factory.emit(token);
  } catch (error) {
    logger.error('BatchGenerator', `Failed to generate token for ${character.name}`, error);
    updateProgress(ctx.progress);
    return null;
  }
}

/**
 * Generate reminder tokens for a character
 */
async function generateReminderTokens(
  ctx: BatchContext,
  character: Character,
  order: number,
  generateVariants: boolean
): Promise<Token[]> {
  const tokens: Token[] = [];

  if (!(character.reminders && Array.isArray(character.reminders))) {
    return tokens;
  }

  const reminderNameCount = new Map<string, number>();
  const imageUrls = generateVariants ? getAllCharacterImageUrls(character.image) : [undefined];
  const hasVariants = imageUrls.length > 1 && generateVariants;

  for (const reminder of character.reminders) {
    checkAbort(ctx.signal);

    // Generate reminder for each image variant (or just once if no variants)
    for (let variantIndex = 0; variantIndex < imageUrls.length; variantIndex++) {
      const imageUrl = imageUrls[variantIndex];

      try {
        const canvas = await ctx.generator.generateReminderToken(character, reminder, imageUrl);
        const variantSuffix = hasVariants ? `_v${variantIndex + 1}` : '';
        const reminderBaseName = sanitizeFilename(`${character.name}_${reminder}${variantSuffix}`);
        const filename = generateUniqueFilename(reminderNameCount, reminderBaseName);

        const token = ctx.factory.createReminderToken({
          canvas,
          character,
          reminderText: reminder,
          filename,
          order,
          variantInfo: hasVariants ? { variantIndex, totalVariants: imageUrls.length } : undefined,
        });

        ctx.factory.emitAndPush(token, tokens);
      } catch (error) {
        logger.error(
          'BatchGenerator',
          `Failed to generate reminder token "${reminder}" for ${character.name}`,
          error
        );
      }
      updateProgress(ctx.progress);
    }
  }

  return tokens;
}

/**
 * Generate character and reminder tokens for all characters using parallel batching
 */
async function generateCharacterAndReminderTokens(
  ctx: BatchContext,
  characters: Character[],
  generateImageVariants: boolean,
  generateReminderVariants: boolean
): Promise<Token[]> {
  const tokens: Token[] = [];
  const nameCount = new Map<string, number>();
  const batchSize = CONFIG.GENERATION.BATCH_SIZE;

  for (let i = 0; i < characters.length; i += batchSize) {
    checkAbort(ctx.signal);

    const batch = characters.slice(i, i + batchSize);

    // Pre-compute filenames and official status for this batch
    const batchInfo = batch.map((character) =>
      computeCharacterBatchInfo(character, generateImageVariants, nameCount)
    );

    // Generate character tokens in parallel (including variants)
    const charTokenPromises: Promise<Token | null>[] = [];

    batch.forEach((character, idx) => {
      const { variants } = batchInfo[idx];
      if (!character.name || variants.length === 0) return;

      const absoluteIndex = i + idx;

      for (const variant of variants) {
        charTokenPromises.push(generateCharacterVariant(ctx, character, variant, absoluteIndex));
      }
    });

    const charTokens = await Promise.all(charTokenPromises);
    for (const token of charTokens) {
      if (token !== null) tokens.push(token);
    }

    // Generate reminder tokens in parallel for this batch
    const reminderPromises = batch.map((character, idx) => {
      const absoluteIndex = i + idx;
      return generateReminderTokens(ctx, character, absoluteIndex, generateReminderVariants);
    });

    const reminderResults = await Promise.all(reminderPromises);
    for (const reminders of reminderResults) {
      tokens.push(...reminders);
    }
  }

  return tokens;
}

// ============================================================================
// MAIN BATCH GENERATION FUNCTION
// ============================================================================

/**
 * Build TokenGenerator options from GenerationOptions and ScriptMeta
 */
function buildGeneratorOptions(options: Partial<GenerationOptions>, scriptMeta: ScriptMeta | null) {
  return {
    ...options,
    transparentBackground: options.pngSettings?.transparentBackground ?? false,
    bootleggerRules: options.generateBootleggerRules ? scriptMeta?.bootlegger : undefined,
    bootleggerIconType: options.bootleggerIconType,
    bootleggerNormalizeIcons: options.bootleggerNormalizeIcons,
    bootleggerHideName: options.bootleggerHideName,
    logoUrl: scriptMeta?.logo,
  };
}

/**
 * Pre-warm caches for better performance
 */
async function prewarmCaches(generator: TokenGenerator, characters: Character[]): Promise<void> {
  // Pre-warm image cache
  await generator.prewarmImageCache(characters);

  // Pre-resolve asset references with priority-based loading
  const imageFields = characters.map((c) => c.image);
  const preloadTasks = createPreloadTasks(imageFields, 10); // First 10 get high priority

  if (preloadTasks.length > 0) {
    await preResolveAssetsWithPriority(preloadTasks, {
      concurrency: 15,
      onProgress: (_loaded, _total) => {
        // Optional: could emit progress event here
      },
    });
  }
}

/**
 * Generate all tokens for a list of characters
 *
 * @param characters - Array of character data (must have source field set)
 * @param options - Generation options
 * @param progressCallback - Optional callback for progress updates
 * @param scriptMeta - Optional script metadata for meta tokens
 * @param tokenCallback - Optional callback for incremental token updates
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
  checkAbort(signal);

  // Create generator and factory
  const generatorOptions = buildGeneratorOptions(options, scriptMeta);
  const generator = new TokenGenerator(generatorOptions);
  const dpi = options.dpi ?? CONFIG.PDF.DPI;
  const factory = new TokenFactory(dpi, tokenCallback);

  // Pre-warm caches
  await prewarmCaches(generator, characters);

  // Create progress tracker
  const total = calculateTotalTokenCount(characters, options, scriptMeta);
  const progress = createProgressState(total, progressCallback);

  // Build batch context
  const ctx: BatchContext = {
    generator,
    factory,
    progress,
    options,
    scriptMeta,
    signal,
  };

  // Generate meta tokens first (so they appear quickly)
  const metaTokens = await generateMetaTokens(ctx);

  checkAbort(signal);

  // Generate character and reminder tokens
  const characterTokens = await generateCharacterAndReminderTokens(
    ctx,
    characters,
    options.generateImageVariants ?? false,
    options.generateReminderVariants ?? false
  );

  // Return character tokens first, meta tokens last (for display ordering)
  return [...characterTokens, ...metaTokens];
}
