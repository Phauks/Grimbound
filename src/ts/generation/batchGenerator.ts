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
import { getAllCharacterImageUrls, getCharacterImageUrl } from '@/ts/data/characterUtils.js';
import {
  createPreloadTasks,
  preResolveAssetsWithPriority,
} from '@/ts/services/upload/assetResolver.js';
import type {
  AutoGenerateTeam,
  Character,
  CharacterMetadata,
  GenerationOptions,
  ProgressCallback,
  ScriptMeta,
  Token,
  TokenCallback,
} from '@/ts/types/index.js';
import { DEFAULT_AUTO_GENERATE_TEAMS } from '@/ts/types/index.js';
import { resolveCharacterImageUrl } from '@/ts/utils/characterImageResolver.js';
import { createEffectiveOptions } from '@/ts/utils/decorativeUtils.js';
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
import {
  createRecoloredImageUrl,
  getTeamDisplayName,
  getTeamsToGenerate,
} from './teamVariantGenerator.js';

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
  characterMetadata?: Map<string, CharacterMetadata>;
  signal?: AbortSignal;
  /** Pre-resolved character image URLs (characterId:variantIndex -> resolved URL) */
  resolvedImageUrls: Map<string, string>;
}

/**
 * Variant information for characters with multiple images or team variants
 */
interface CharacterVariant {
  filename: string;
  imageUrl: string | undefined;
  variantIndex: number;
  totalVariants: number;
  /** If set, this is an auto-generated team variant */
  teamVariant?: AutoGenerateTeam;
  /** Display name for the team variant (e.g., "Townsfolk") */
  teamDisplayName?: string;
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
 * Calculate total token count including meta tokens and team variants
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

  // Get auto-generation settings
  const autoGenCharacters = options.autoGenerateCharacterVariants ?? false;
  const autoGenReminders = options.autoGenerateReminderVariants ?? false;
  const enabledTeams = options.autoGenerateTeams ?? DEFAULT_AUTO_GENERATE_TEAMS;

  const characterTokenCount = characters.reduce((sum, char) => {
    // Base image count (from image array variants)
    const imageCount = options.generateImageVariants
      ? getAllCharacterImageUrls(char.image).length || 1
      : 1;

    // Calculate team variants for character tokens
    let charTokens = imageCount;
    if (autoGenCharacters && char.team) {
      const teamsToGenerate = getTeamsToGenerate(char.team, enabledTeams);
      charTokens += teamsToGenerate.length; // One variant per enabled team (excluding current team)
    }

    // Calculate reminder token count
    const reminderCount = char.reminders?.length ?? 0;
    let reminderTokens = reminderCount;
    if (autoGenReminders && reminderCount > 0 && char.team) {
      const teamsToGenerate = getTeamsToGenerate(char.team, enabledTeams);
      reminderTokens += reminderCount * teamsToGenerate.length;
    }

    return sum + charTokens + reminderTokens;
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
 * Options for computing character batch info
 */
interface CharacterBatchOptions {
  generateImageVariants: boolean;
  autoGenerateCharacterVariants: boolean;
  autoGenerateTeams: AutoGenerateTeam[];
}

/**
 * Pre-compute batch info for a character (filenames, variant info, official status)
 * Includes both image variants and auto-generated team variants.
 */
function computeCharacterBatchInfo(
  character: Character,
  options: CharacterBatchOptions,
  nameCount: Map<string, number>
): CharacterBatchInfo {
  if (!character.name) {
    return { variants: [], isOfficial: false };
  }

  const isOfficial = character.source === 'official';
  const variants: CharacterVariant[] = [];

  // Get base image URL for the character
  const baseImageUrl = getCharacterImageUrl(character.image);

  // Check for multiple image variants
  if (options.generateImageVariants) {
    const imageUrls = getAllCharacterImageUrls(character.image);
    if (imageUrls.length > 1) {
      // Multiple image variants
      for (let variantIndex = 0; variantIndex < imageUrls.length; variantIndex++) {
        const baseName = sanitizeFilename(`${character.name}_v${variantIndex + 1}`);
        const filename = generateUniqueFilename(nameCount, baseName);
        variants.push({
          filename,
          imageUrl: imageUrls[variantIndex],
          variantIndex,
          totalVariants: imageUrls.length,
        });
      }
    } else {
      // Single image - add as base variant
      const baseName = sanitizeFilename(character.name);
      const filename = generateUniqueFilename(nameCount, baseName);
      variants.push({
        filename,
        imageUrl: baseImageUrl || undefined,
        variantIndex: 0,
        totalVariants: 1,
      });
    }
  } else {
    // Image variants disabled - single base variant
    const baseName = sanitizeFilename(character.name);
    const filename = generateUniqueFilename(nameCount, baseName);
    variants.push({
      filename,
      imageUrl: baseImageUrl || undefined,
      variantIndex: 0,
      totalVariants: 1,
    });
  }

  // Add auto-generated team variants
  if (options.autoGenerateCharacterVariants && character.team) {
    const teamsToGenerate = getTeamsToGenerate(character.team, options.autoGenerateTeams);
    const baseVariantCount = variants.length;

    for (const targetTeam of teamsToGenerate) {
      const teamDisplayName = getTeamDisplayName(targetTeam);
      const baseName = sanitizeFilename(`${character.name}_${targetTeam}`);
      const filename = generateUniqueFilename(nameCount, baseName);

      variants.push({
        filename,
        imageUrl: baseImageUrl || undefined,
        variantIndex: baseVariantCount + teamsToGenerate.indexOf(targetTeam),
        totalVariants: baseVariantCount + teamsToGenerate.length,
        teamVariant: targetTeam,
        teamDisplayName,
      });
    }

    // Update totalVariants for all variants
    const totalVariants = variants.length;
    for (const variant of variants) {
      variant.totalVariants = totalVariants;
    }
  }

  return { variants, isOfficial };
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
    // For team variants, use the base variant index (0) for URL lookup
    const urlLookupIndex = variant.teamVariant ? 0 : variant.variantIndex;
    // Look up pre-resolved image URL from context (SSOT)
    let resolvedImageUrl =
      ctx.resolvedImageUrls.get(`${character.id}:${urlLookupIndex}`) ?? variant.imageUrl;

    // For team variants, recolor the icon BEFORE token generation
    if (variant.teamVariant && resolvedImageUrl) {
      try {
        resolvedImageUrl = await createRecoloredImageUrl(resolvedImageUrl, variant.teamVariant);
        logger.debug(
          'BatchGenerator',
          `Recolored icon for ${character.name} -> ${variant.teamDisplayName}`
        );
      } catch (error) {
        logger.warn(
          'BatchGenerator',
          `Failed to recolor icon for ${character.name}, using original`,
          error
        );
      }
    }

    // Check if character has decorative overrides
    const metadata = ctx.characterMetadata?.get(character.uuid || '');
    const decoratives = metadata?.decoratives;
    const hasDecorativeOverrides = decoratives?.useCustomSettings ?? false;

    let canvas: HTMLCanvasElement;

    if (hasDecorativeOverrides && decoratives) {
      // Create merged options with character-specific decoratives
      const effectiveOptions = createEffectiveOptions(
        ctx.options as GenerationOptions,
        decoratives
      );
      // Create a temporary generator with the merged options
      const tempGenerator = new TokenGenerator({
        ...effectiveOptions,
        transparentBackground: effectiveOptions.pngSettings?.transparentBackground ?? false,
      });
      canvas = await tempGenerator.generateCharacterToken(character, resolvedImageUrl);
    } else {
      // Use the shared generator with global options
      canvas = await ctx.generator.generateCharacterToken(character, resolvedImageUrl);
    }

    updateProgress(ctx.progress);

    // Create token without displayName override - tokens keep their original name
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
      hasDecorativeOverrides,
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
  generateVariants: boolean,
  autoGenerateReminders: boolean = false,
  autoGenerateTeams: AutoGenerateTeam[] = []
): Promise<Token[]> {
  const tokens: Token[] = [];

  if (!(character.reminders && Array.isArray(character.reminders))) {
    return tokens;
  }

  // Check if character has decorative overrides
  const metadata = ctx.characterMetadata?.get(character.uuid || '');
  const decoratives = metadata?.decoratives;
  const hasDecorativeOverrides = decoratives?.useCustomSettings ?? false;

  // Create a generator for this character (temp if has overrides, shared otherwise)
  let generator = ctx.generator;
  if (hasDecorativeOverrides && decoratives) {
    const effectiveOptions = createEffectiveOptions(ctx.options as GenerationOptions, decoratives);
    generator = new TokenGenerator({
      ...effectiveOptions,
      transparentBackground: effectiveOptions.pngSettings?.transparentBackground ?? false,
    });
  }

  const reminderNameCount = new Map<string, number>();
  const imageUrls = generateVariants ? getAllCharacterImageUrls(character.image) : [undefined];
  const hasVariants = imageUrls.length > 1 && generateVariants;

  // Get teams to generate for auto-generation
  const teamsToGenerate =
    autoGenerateReminders && character.team
      ? getTeamsToGenerate(character.team, autoGenerateTeams)
      : [];

  for (const reminder of character.reminders) {
    checkAbort(ctx.signal);

    // Generate base reminder for each image variant (or just once if no variants)
    for (let variantIndex = 0; variantIndex < imageUrls.length; variantIndex++) {
      const imageUrl = imageUrls[variantIndex];
      // Look up pre-resolved image URL from context (SSOT)
      const resolvedImageUrl =
        ctx.resolvedImageUrls.get(`${character.id}:${variantIndex}`) ?? imageUrl;

      try {
        const canvas = await generator.generateReminderToken(character, reminder, resolvedImageUrl);
        const variantSuffix = hasVariants ? `_v${variantIndex + 1}` : '';
        const reminderBaseName = sanitizeFilename(`${character.name}_${reminder}${variantSuffix}`);
        const filename = generateUniqueFilename(reminderNameCount, reminderBaseName);

        const totalVariants = hasVariants
          ? imageUrls.length + teamsToGenerate.length
          : 1 + teamsToGenerate.length;

        const token = ctx.factory.createReminderToken({
          canvas,
          character,
          reminderText: reminder,
          filename,
          order,
          variantInfo: totalVariants > 1 ? { variantIndex, totalVariants } : undefined,
          hasDecorativeOverrides,
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

    // Generate team variants for this reminder
    if (autoGenerateReminders && teamsToGenerate.length > 0) {
      const baseImageUrl = imageUrls[0];
      const baseResolvedUrl = ctx.resolvedImageUrls.get(`${character.id}:0`) ?? baseImageUrl;

      for (const targetTeam of teamsToGenerate) {
        try {
          // Recolor the icon BEFORE token generation
          let recoloredImageUrl = baseResolvedUrl;
          if (baseResolvedUrl) {
            try {
              recoloredImageUrl = await createRecoloredImageUrl(baseResolvedUrl, targetTeam);
            } catch (recolorError) {
              logger.warn(
                'BatchGenerator',
                `Failed to recolor reminder icon for ${character.name}, using original`,
                recolorError
              );
            }
          }

          const canvas = await generator.generateReminderToken(
            character,
            reminder,
            recoloredImageUrl
          );

          const teamDisplayName = getTeamDisplayName(targetTeam);
          const reminderBaseName = sanitizeFilename(`${character.name}_${reminder}_${targetTeam}`);
          const filename = generateUniqueFilename(reminderNameCount, reminderBaseName);

          const totalVariants = hasVariants
            ? imageUrls.length + teamsToGenerate.length
            : 1 + teamsToGenerate.length;
          const variantIndex = hasVariants
            ? imageUrls.length + teamsToGenerate.indexOf(targetTeam)
            : 1 + teamsToGenerate.indexOf(targetTeam);

          // Keep original reminder text - no team name suffix
          const token = ctx.factory.createReminderToken({
            canvas,
            character,
            reminderText: reminder,
            filename,
            order,
            variantInfo: { variantIndex, totalVariants },
            hasDecorativeOverrides,
          });

          ctx.factory.emitAndPush(token, tokens);

          logger.debug(
            'BatchGenerator',
            `Generated team reminder variant for ${character.name}/${reminder} -> ${teamDisplayName}`
          );
        } catch (error) {
          logger.error(
            'BatchGenerator',
            `Failed to generate team reminder variant "${reminder}" for ${character.name} -> ${targetTeam}`,
            error
          );
        }
        updateProgress(ctx.progress);
      }
    }
  }

  return tokens;
}

/**
 * Options for character and reminder token generation
 */
interface CharacterReminderOptions {
  generateImageVariants: boolean;
  generateReminderVariants: boolean;
  autoGenerateCharacterVariants: boolean;
  autoGenerateReminderVariants: boolean;
  autoGenerateTeams: AutoGenerateTeam[];
}

/**
 * Generate character and reminder tokens for all characters using parallel batching
 */
async function generateCharacterAndReminderTokens(
  ctx: BatchContext,
  characters: Character[],
  charReminderOptions: CharacterReminderOptions
): Promise<Token[]> {
  const tokens: Token[] = [];
  const nameCount = new Map<string, number>();
  const batchSize = CONFIG.GENERATION.BATCH_SIZE;

  // Build options for batch info computation
  const batchOptions: CharacterBatchOptions = {
    generateImageVariants: charReminderOptions.generateImageVariants,
    autoGenerateCharacterVariants: charReminderOptions.autoGenerateCharacterVariants,
    autoGenerateTeams: charReminderOptions.autoGenerateTeams,
  };

  for (let i = 0; i < characters.length; i += batchSize) {
    checkAbort(ctx.signal);

    const batch = characters.slice(i, i + batchSize);

    // Pre-compute filenames and official status for this batch
    const batchInfo = batch.map((character) =>
      computeCharacterBatchInfo(character, batchOptions, nameCount)
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
      return generateReminderTokens(
        ctx,
        character,
        absoluteIndex,
        charReminderOptions.generateReminderVariants,
        charReminderOptions.autoGenerateReminderVariants,
        charReminderOptions.autoGenerateTeams
      );
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
 * Pre-resolve all character image URLs using SSOT (characterImageResolver)
 * Returns a map of characterId:variantIndex -> resolved URL
 *
 * This ensures all image types are properly resolved:
 * - Asset references (asset:uuid)
 * - Sync storage images (official characters)
 * - External URLs (http/https)
 * - Local asset paths
 */
async function preResolveCharacterImageUrls(
  characters: Character[],
  generateVariants: boolean
): Promise<Map<string, string>> {
  const resolved = new Map<string, string>();

  // Build list of all image URLs to resolve
  const resolutionTasks = characters.flatMap((char) => {
    const imageUrls = generateVariants
      ? getAllCharacterImageUrls(char.image)
      : [getCharacterImageUrl(char.image)].filter(Boolean);

    return imageUrls.map((url, variantIndex) => ({
      characterId: char.id,
      variantIndex,
      url,
    }));
  });

  if (resolutionTasks.length === 0) {
    return resolved;
  }

  logger.info(
    'BatchGenerator',
    `Pre-resolving ${resolutionTasks.length} character image URLs using SSOT`
  );

  // Resolve in parallel batches to avoid overwhelming the browser
  const BATCH_SIZE = 20;
  for (let i = 0; i < resolutionTasks.length; i += BATCH_SIZE) {
    const batch = resolutionTasks.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (task) => {
        if (!task.url) return;
        try {
          const result = await resolveCharacterImageUrl(task.url, task.characterId, {
            logContext: 'BatchGenerator',
          });
          resolved.set(`${task.characterId}:${task.variantIndex}`, result.url);
        } catch {
          // Fallback to original URL on error
          resolved.set(`${task.characterId}:${task.variantIndex}`, task.url);
        }
      })
    );
  }

  logger.debug('BatchGenerator', `Resolved ${resolved.size} character image URLs`);
  return resolved;
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
 * @param characterMetadata - Optional map of character UUID to metadata (for decorative overrides)
 * @returns Promise resolving to array of generated tokens
 */
export async function generateAllTokens(
  characters: Character[],
  options: Partial<GenerationOptions> = {},
  progressCallback: ProgressCallback | null = null,
  scriptMeta: ScriptMeta | null = null,
  tokenCallback: TokenCallback | null = null,
  signal?: AbortSignal,
  characterMetadata?: Map<string, CharacterMetadata>
): Promise<Token[]> {
  checkAbort(signal);

  // Create generator and factory
  const generatorOptions = buildGeneratorOptions(options, scriptMeta);
  const generator = new TokenGenerator(generatorOptions);
  const dpi = options.dpi ?? CONFIG.PDF.DPI;
  const factory = new TokenFactory(dpi, tokenCallback);

  // Pre-warm caches
  await prewarmCaches(generator, characters);

  // Pre-resolve all character image URLs using SSOT
  const resolvedImageUrls = await preResolveCharacterImageUrls(
    characters,
    options.generateImageVariants ?? false
  );

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
    characterMetadata,
    signal,
    resolvedImageUrls,
  };

  // Generate meta tokens first (so they appear quickly)
  const metaTokens = await generateMetaTokens(ctx);

  checkAbort(signal);

  // Build character/reminder generation options
  const charReminderOptions: CharacterReminderOptions = {
    generateImageVariants: options.generateImageVariants ?? false,
    generateReminderVariants: options.generateReminderVariants ?? false,
    autoGenerateCharacterVariants: options.autoGenerateCharacterVariants ?? false,
    autoGenerateReminderVariants: options.autoGenerateReminderVariants ?? false,
    autoGenerateTeams: options.autoGenerateTeams ?? DEFAULT_AUTO_GENERATE_TEAMS,
  };

  // Generate character and reminder tokens
  const characterTokens = await generateCharacterAndReminderTokens(
    ctx,
    characters,
    charReminderOptions
  );

  // Return character tokens first, meta tokens last (for display ordering)
  return [...characterTokens, ...metaTokens];
}
