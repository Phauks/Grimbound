/**
 * Blood on the Clocktower Token Generator
 * Batch Token Generation - Orchestrates bulk token creation with parallel processing
 *
 * Architecture:
 * - Uses TokenGenerator for canvas rendering (low-level)
 * - Uses TokenFactory for Token object creation (metadata assembly)
 * - Orchestrates batching, progress, and abort handling (high-level)
 */

import { hashObject } from '@/ts/cache/utils/hashUtils.js';
import type { TextLayoutResult } from '@/ts/canvas/index.js';
import { getAllCharacterImageUrls, getCharacterImageUrl } from '@/ts/data/characterUtils.js';
import {
  createPreloadTasks,
  preResolveAssetsWithPriority,
} from '@/ts/services/upload/assetResolver.js';
import type {
  AutoGenerateTeam,
  Character,
  CharacterMetadata,
  DetailedProgressCallback,
  GenerationOptions,
  GenerationProgress,
  Jinx,
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
  /** Detailed progress tracker for character/reminder/meta breakdown */
  detailedProgress: DetailedProgressTracker | null;
  options: Partial<GenerationOptions>;
  scriptMeta: ScriptMeta | null;
  characters: Character[];
  characterMetadata?: Map<string, CharacterMetadata>;
  signal?: AbortSignal;
  /** Pre-resolved character image URLs (characterId:variantIndex -> resolved URL) */
  resolvedImageUrls: Map<string, string>;
  /** Cache for decorated TokenGenerators (hash -> generator) to avoid recreation per-token */
  decoratedGeneratorCache: Map<string, TokenGenerator>;
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
 * Token counts broken down by type
 */
export interface TokenCountsByType {
  character: number;
  reminder: number;
  meta: number;
  total: number;
}

/**
 * Calculate token counts broken down by type (character, reminder, meta)
 */
export function calculateTokenCountsByType(
  characters: Character[],
  options: Partial<GenerationOptions>,
  scriptMeta: ScriptMeta | null
): TokenCountsByType {
  // Calculate meta token count
  let metaCount = 0;
  if (options.pandemoniumToken) metaCount++;
  if (options.scriptNameToken && scriptMeta?.name) metaCount++;
  if (options.almanacToken && scriptMeta?.almanac) metaCount++;
  if (
    options.generateBootleggerRules &&
    scriptMeta?.bootlegger &&
    scriptMeta.bootlegger.length > 0
  ) {
    metaCount += scriptMeta.bootlegger.length;
  }
  if (options.jinxTokens) {
    const activeJinxes = findActiveJinxes(characters);
    metaCount += activeJinxes.length;
  }

  // Get auto-generation settings
  const autoGenCharacters = options.autoGenerateCharacterVariants ?? false;
  const autoGenReminders = options.autoGenerateReminderVariants ?? false;
  const enabledTeams = options.autoGenerateTeams ?? DEFAULT_AUTO_GENERATE_TEAMS;

  let characterCount = 0;
  let reminderCount = 0;

  for (const char of characters) {
    // Base image count (from image array variants)
    const imageCount = options.generateImageVariants
      ? getAllCharacterImageUrls(char.image).length || 1
      : 1;

    // Calculate character token count including team variants
    let charTokens = imageCount;
    if (autoGenCharacters && char.team) {
      const teamsToGenerate = getTeamsToGenerate(char.team, enabledTeams);
      charTokens += teamsToGenerate.length;
    }
    characterCount += charTokens;

    // Calculate reminder token count including team variants
    const baseReminderCount = char.reminders?.length ?? 0;
    let reminderTokens = baseReminderCount;
    if (autoGenReminders && baseReminderCount > 0 && char.team) {
      const teamsToGenerate = getTeamsToGenerate(char.team, enabledTeams);
      reminderTokens += baseReminderCount * teamsToGenerate.length;
    }
    reminderCount += reminderTokens;
  }

  return {
    character: characterCount,
    reminder: reminderCount,
    meta: metaCount,
    total: characterCount + reminderCount + metaCount,
  };
}

/**
 * Detailed progress tracker for token generation
 */
class DetailedProgressTracker {
  private counts: TokenCountsByType;
  private current: { character: number; reminder: number; meta: number };
  private phase: GenerationProgress['phase'];
  private callback: DetailedProgressCallback | null;

  constructor(counts: TokenCountsByType, callback: DetailedProgressCallback | null) {
    this.counts = counts;
    this.current = { character: 0, reminder: 0, meta: 0 };
    this.phase = 'meta'; // Meta tokens are generated first
    this.callback = callback;
  }

  setPhase(phase: GenerationProgress['phase']): void {
    this.phase = phase;
    this.notify();
  }

  incrementCharacter(): void {
    this.current.character++;
    this.notify();
  }

  incrementReminder(): void {
    this.current.reminder++;
    this.notify();
  }

  incrementMeta(): void {
    this.current.meta++;
    this.notify();
  }

  private notify(): void {
    if (!this.callback) return;

    const overallCurrent = this.current.character + this.current.reminder + this.current.meta;

    this.callback({
      phase: this.phase,
      character: { current: this.current.character, total: this.counts.character },
      reminder: { current: this.current.reminder, total: this.counts.reminder },
      meta: { current: this.current.meta, total: this.counts.meta },
      overall: { current: overallCurrent, total: this.counts.total },
    });
  }
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
    ctx.detailedProgress?.incrementMeta();
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
    ctx.detailedProgress?.incrementMeta();
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
    ctx.detailedProgress?.incrementMeta();
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

  const bootlegger = ctx.scriptMeta?.bootlegger;
  if (!(ctx.options.generateBootleggerRules && bootlegger && bootlegger.length > 0)) {
    return tokens;
  }

  const bootleggerEntries = bootlegger.filter((text) => text?.trim());
  const normalizedLayout = calculateNormalizedBootleggerLayout(
    ctx.generator,
    bootleggerEntries,
    ctx.options.bootleggerNormalizeIcons ?? false
  );

  for (let i = 0; i < bootlegger.length; i++) {
    const abilityText = bootlegger[i];

    checkAbort(ctx.signal);

    // Skip empty entries but still update progress
    if (!abilityText?.trim()) {
      updateProgress(ctx.progress);
      ctx.detailedProgress?.incrementMeta();
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
    ctx.detailedProgress?.incrementMeta();
  }

  return tokens;
}

/**
 * Represents an active jinx between two characters on the script
 */
interface ActiveJinx {
  jinx: Jinx;
  char1: Character;
  char2: Character;
}

/**
 * Find all unique jinxes where both characters are on the script
 */
function findActiveJinxes(characters: Character[]): ActiveJinx[] {
  const scriptCharIds = new Set(characters.map((c) => c.id));
  const activeJinxes: ActiveJinx[] = [];
  const seenJinxes = new Set<string>();

  for (const char of characters) {
    if (!char.jinxes) continue;

    for (const jinx of char.jinxes) {
      // Only include if target is also on script
      if (scriptCharIds.has(jinx.id)) {
        const targetChar = characters.find((c) => c.id === jinx.id);
        if (targetChar) {
          // Avoid duplicates (A->B and B->A would be the same jinx)
          const key = [char.id, jinx.id].sort().join(':');
          if (!seenJinxes.has(key)) {
            seenJinxes.add(key);
            activeJinxes.push({ jinx, char1: char, char2: targetChar });
          }
        }
      }
    }
  }

  return activeJinxes;
}

/**
 * Generate jinx tokens if enabled (parallelized with Promise.all)
 */
async function generateJinxTokensIfEnabled(ctx: BatchContext): Promise<Token[]> {
  if (!ctx.options.jinxTokens) return [];

  const activeJinxes = findActiveJinxes(ctx.characters);
  if (activeJinxes.length === 0) return [];

  logger.info('BatchGenerator', `Generating ${activeJinxes.length} jinx tokens in parallel`);

  // Check abort before starting parallel generation
  checkAbort(ctx.signal);

  // Generate all jinx tokens in parallel (pass pre-resolved URLs to avoid redundant resolution)
  const results = await Promise.all(
    activeJinxes.map(async ({ jinx, char1, char2 }) => {
      try {
        const canvas = await ctx.generator.generateJinxToken(
          jinx,
          char1,
          char2,
          ctx.resolvedImageUrls
        );
        const token = ctx.factory.createMetaToken({
          canvas,
          type: 'jinx',
          name: `${char1.name} / ${char2.name}`,
          filename: `_jinx_${char1.id}_${char2.id}`,
          jinxData: {
            reason: jinx.reason,
            char1: {
              id: char1.id,
              name: char1.name,
              image: Array.isArray(char1.image) ? (char1.image[0] ?? '') : (char1.image ?? ''),
            },
            char2: {
              id: char2.id,
              name: char2.name,
              image: Array.isArray(char2.image) ? (char2.image[0] ?? '') : (char2.image ?? ''),
            },
          },
        });
        return token;
      } catch (error) {
        logger.error(
          'BatchGenerator',
          `Failed to generate jinx token: ${char1.name} / ${char2.name}`,
          error
        );
        return null;
      }
    })
  );

  // Filter out failed tokens and emit
  const tokens: Token[] = [];
  for (const token of results) {
    if (token) {
      ctx.factory.emitAndPush(token, tokens);
    }
    updateProgress(ctx.progress);
    ctx.detailedProgress?.incrementMeta();
  }

  return tokens;
}

/**
 * Generate all meta tokens (Pandemonium, Script Name, Almanac QR, Bootlegger, Jinx)
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

  // Generate jinx tokens
  const jinxTokens = await generateJinxTokensIfEnabled(ctx);
  tokens.push(...jinxTokens);

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
 * Get or create a cached TokenGenerator for decorative overrides.
 * This avoids creating a new generator instance for each token with the same decoratives.
 */
function getOrCreateDecoratedGenerator(
  ctx: BatchContext,
  decoratives: NonNullable<CharacterMetadata['decoratives']>
): TokenGenerator {
  // Create a hash of the decoratives to use as cache key
  const hash = hashObject(decoratives as unknown as Record<string, unknown>);

  let generator = ctx.decoratedGeneratorCache.get(hash);
  if (!generator) {
    const effectiveOptions = createEffectiveOptions(ctx.options as GenerationOptions, decoratives);
    generator = new TokenGenerator({
      ...effectiveOptions,
      transparentBackground: false,
    });
    ctx.decoratedGeneratorCache.set(hash, generator);
    logger.debug(
      'BatchGenerator',
      `Created cached generator for decorative hash: ${hash.slice(0, 8)}`
    );
  }

  return generator;
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
      // Use cached generator for decorated tokens (avoids recreation overhead)
      const decoratedGenerator = getOrCreateDecoratedGenerator(ctx, decoratives);
      canvas = await decoratedGenerator.generateCharacterToken(character, resolvedImageUrl);
    } else {
      // Use the shared generator with global options
      canvas = await ctx.generator.generateCharacterToken(character, resolvedImageUrl);
    }

    updateProgress(ctx.progress);
    ctx.detailedProgress?.incrementCharacter();

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
    ctx.detailedProgress?.incrementCharacter();
    return null;
  }
}

// ============================================================================
// REMINDER TOKEN GENERATION HELPERS
// ============================================================================

/**
 * Context for reminder token generation
 */
interface ReminderGenerationContext {
  ctx: BatchContext;
  generator: TokenGenerator;
  character: Character;
  reminder: string;
  order: number;
  nameCount: Map<string, number>;
  hasDecorativeOverrides: boolean;
  imageUrls: (string | undefined)[];
  teamsToGenerate: AutoGenerateTeam[];
}

/**
 * Get or create a token generator for a character (handles decorative overrides)
 */
function getGeneratorForCharacter(
  ctx: BatchContext,
  character: Character
): {
  generator: TokenGenerator;
  hasDecorativeOverrides: boolean;
} {
  const metadata = ctx.characterMetadata?.get(character.uuid || '');
  const decoratives = metadata?.decoratives;
  const hasDecorativeOverrides = decoratives?.useCustomSettings ?? false;

  if (!(hasDecorativeOverrides && decoratives)) {
    return { generator: ctx.generator, hasDecorativeOverrides: false };
  }

  const effectiveOptions = createEffectiveOptions(ctx.options as GenerationOptions, decoratives);
  const generator = new TokenGenerator(effectiveOptions);

  return { generator, hasDecorativeOverrides: true };
}

/**
 * Calculate total variants for a reminder (image variants + team variants)
 */
function calculateTotalReminderVariants(
  hasImageVariants: boolean,
  imageUrlCount: number,
  teamCount: number
): number {
  return hasImageVariants ? imageUrlCount + teamCount : 1 + teamCount;
}

/**
 * Generate a single base reminder token for an image variant
 */
async function generateSingleReminderToken(
  rctx: ReminderGenerationContext,
  variantIndex: number,
  totalVariants: number
): Promise<Token | null> {
  const {
    ctx,
    generator,
    character,
    reminder,
    order,
    nameCount,
    hasDecorativeOverrides,
    imageUrls,
  } = rctx;
  const hasImageVariants = imageUrls.length > 1;

  const imageUrl = imageUrls[variantIndex];
  const resolvedImageUrl = ctx.resolvedImageUrls.get(`${character.id}:${variantIndex}`) ?? imageUrl;

  try {
    const canvas = await generator.generateReminderToken(character, reminder, resolvedImageUrl);
    const variantSuffix = hasImageVariants ? `_v${variantIndex + 1}` : '';
    const reminderBaseName = sanitizeFilename(`${character.name}_${reminder}${variantSuffix}`);
    const filename = generateUniqueFilename(nameCount, reminderBaseName);

    return ctx.factory.createReminderToken({
      canvas,
      character,
      reminderText: reminder,
      filename,
      order,
      variantInfo: totalVariants > 1 ? { variantIndex, totalVariants } : undefined,
      hasDecorativeOverrides,
    });
  } catch (error) {
    logger.error(
      'BatchGenerator',
      `Failed to generate reminder token "${reminder}" for ${character.name}`,
      error
    );
    return null;
  }
}

/**
 * Get recolored image URL for a team variant
 */
async function getRecoloredImageUrl(
  baseUrl: string | undefined,
  targetTeam: AutoGenerateTeam,
  characterName: string
): Promise<string | undefined> {
  if (!baseUrl) return baseUrl;

  try {
    return await createRecoloredImageUrl(baseUrl, targetTeam);
  } catch (error) {
    logger.warn(
      'BatchGenerator',
      `Failed to recolor reminder icon for ${characterName}, using original`,
      error
    );
    return baseUrl;
  }
}

/**
 * Generate a single team variant reminder token
 */
async function generateTeamReminderToken(
  rctx: ReminderGenerationContext,
  targetTeam: AutoGenerateTeam,
  variantIndex: number,
  totalVariants: number
): Promise<Token | null> {
  const {
    ctx,
    generator,
    character,
    reminder,
    order,
    nameCount,
    hasDecorativeOverrides,
    imageUrls,
  } = rctx;

  const baseResolvedUrl = ctx.resolvedImageUrls.get(`${character.id}:0`) ?? imageUrls[0];
  const recoloredImageUrl = await getRecoloredImageUrl(baseResolvedUrl, targetTeam, character.name);

  try {
    const canvas = await generator.generateReminderToken(character, reminder, recoloredImageUrl);
    const reminderBaseName = sanitizeFilename(`${character.name}_${reminder}_${targetTeam}`);
    const filename = generateUniqueFilename(nameCount, reminderBaseName);

    const token = ctx.factory.createReminderToken({
      canvas,
      character,
      reminderText: reminder,
      filename,
      order,
      variantInfo: { variantIndex, totalVariants },
      hasDecorativeOverrides,
    });

    logger.debug(
      'BatchGenerator',
      `Generated team reminder variant for ${character.name}/${reminder} -> ${getTeamDisplayName(targetTeam)}`
    );

    return token;
  } catch (error) {
    logger.error(
      'BatchGenerator',
      `Failed to generate team reminder variant "${reminder}" for ${character.name} -> ${targetTeam}`,
      error
    );
    return null;
  }
}

/**
 * Generate all variants (image + team) for a single reminder
 */
async function generateReminderVariants(rctx: ReminderGenerationContext): Promise<Token[]> {
  const { ctx, imageUrls, teamsToGenerate } = rctx;
  const tokens: Token[] = [];
  const hasImageVariants = imageUrls.length > 1;
  const totalVariants = calculateTotalReminderVariants(
    hasImageVariants,
    imageUrls.length,
    teamsToGenerate.length
  );

  // Generate base reminder for each image variant
  for (let variantIndex = 0; variantIndex < imageUrls.length; variantIndex++) {
    const token = await generateSingleReminderToken(rctx, variantIndex, totalVariants);
    if (token) {
      ctx.factory.emitAndPush(token, tokens);
    }
    updateProgress(ctx.progress);
    ctx.detailedProgress?.incrementReminder();
  }

  // Generate team variants
  for (let teamIndex = 0; teamIndex < teamsToGenerate.length; teamIndex++) {
    const targetTeam = teamsToGenerate[teamIndex];
    const variantIndex = hasImageVariants ? imageUrls.length + teamIndex : 1 + teamIndex;

    const token = await generateTeamReminderToken(rctx, targetTeam, variantIndex, totalVariants);
    if (token) {
      ctx.factory.emitAndPush(token, tokens);
    }
    updateProgress(ctx.progress);
    ctx.detailedProgress?.incrementReminder();
  }

  return tokens;
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

  const { generator, hasDecorativeOverrides } = getGeneratorForCharacter(ctx, character);
  const imageUrls = generateVariants ? getAllCharacterImageUrls(character.image) : [undefined];
  const teamsToGenerate =
    autoGenerateReminders && character.team
      ? getTeamsToGenerate(character.team, autoGenerateTeams)
      : [];

  const nameCount = new Map<string, number>();

  for (const reminder of character.reminders) {
    checkAbort(ctx.signal);

    const rctx: ReminderGenerationContext = {
      ctx,
      generator,
      character,
      reminder,
      order,
      nameCount,
      hasDecorativeOverrides,
      imageUrls,
      teamsToGenerate,
    };

    const reminderTokens = await generateReminderVariants(rctx);
    tokens.push(...reminderTokens);
  }

  return tokens;
}

/**
 * Options for character token generation
 */
interface CharacterTokenOptions {
  generateImageVariants: boolean;
  autoGenerateCharacterVariants: boolean;
  autoGenerateTeams: AutoGenerateTeam[];
}

/**
 * Options for reminder token generation
 */
interface ReminderTokenOptions {
  generateReminderVariants: boolean;
  autoGenerateReminderVariants: boolean;
  autoGenerateTeams: AutoGenerateTeam[];
}

/**
 * Options for character and reminder token generation (combined)
 */
interface CharacterReminderOptions extends CharacterTokenOptions, ReminderTokenOptions {}

/**
 * Generate only character tokens for all characters using unbounded parallel execution
 */
async function generateCharacterTokensOnly(
  ctx: BatchContext,
  characters: Character[],
  options: CharacterTokenOptions
): Promise<Token[]> {
  const nameCount = new Map<string, number>();

  const batchOptions: CharacterBatchOptions = {
    generateImageVariants: options.generateImageVariants,
    autoGenerateCharacterVariants: options.autoGenerateCharacterVariants,
    autoGenerateTeams: options.autoGenerateTeams,
  };

  // Pre-compute all batch info
  const allBatchInfo = characters.map((character) =>
    computeCharacterBatchInfo(character, batchOptions, nameCount)
  );

  // Collect all token generation promises
  const charTokenPromises: Promise<Token | null>[] = [];

  characters.forEach((character, charIndex) => {
    const { variants } = allBatchInfo[charIndex];
    if (!character.name || variants.length === 0) return;

    for (const variant of variants) {
      charTokenPromises.push(generateCharacterVariant(ctx, character, variant, charIndex));
    }
  });

  checkAbort(ctx.signal);

  // Execute ALL in parallel - no batching
  const charTokens = await Promise.all(charTokenPromises);
  return charTokens.filter((token): token is Token => token !== null);
}

/**
 * Generate only reminder tokens for all characters using unbounded parallel execution
 */
async function generateReminderTokensOnly(
  ctx: BatchContext,
  characters: Character[],
  options: ReminderTokenOptions
): Promise<Token[]> {
  checkAbort(ctx.signal);

  // Generate all reminder promises upfront
  const reminderPromises = characters.map((character, charIndex) =>
    generateReminderTokens(
      ctx,
      character,
      charIndex,
      options.generateReminderVariants,
      options.autoGenerateReminderVariants,
      options.autoGenerateTeams
    )
  );

  // Execute ALL in parallel - no batching
  const reminderResults = await Promise.all(reminderPromises);
  return reminderResults.flat();
}

/**
 * Token generation task for unified parallel processing
 */
interface TokenGenerationTask {
  type: 'character' | 'reminder';
  execute: () => Promise<Token | Token[] | null>;
}

/**
 * Generate character and reminder tokens for all characters using UNBOUNDED parallel execution.
 *
 * Performance optimization: Instead of sequential phases (all chars, then all reminders),
 * we generate ALL tokens in a single Promise.all - exactly like jinx tokens do.
 * This eliminates artificial batching constraints and maximizes parallelism.
 *
 * Approach: Collect ALL token generation tasks upfront, then execute ALL in parallel.
 */
async function generateCharacterAndReminderTokens(
  ctx: BatchContext,
  characters: Character[],
  charReminderOptions: CharacterReminderOptions
): Promise<Token[]> {
  const tokens: Token[] = [];
  const nameCount = new Map<string, number>();

  // Build options for batch info computation
  const batchOptions: CharacterBatchOptions = {
    generateImageVariants: charReminderOptions.generateImageVariants,
    autoGenerateCharacterVariants: charReminderOptions.autoGenerateCharacterVariants,
    autoGenerateTeams: charReminderOptions.autoGenerateTeams,
  };

  // Pre-compute all batch info upfront (needed for filename generation)
  const allBatchInfo = characters.map((character) =>
    computeCharacterBatchInfo(character, batchOptions, nameCount)
  );

  // Collect ALL token generation tasks (character + reminder) into a single array
  const allTasks: TokenGenerationTask[] = [];

  characters.forEach((character, charIndex) => {
    const { variants } = allBatchInfo[charIndex];

    // Skip invalid characters
    if (!character.name || variants.length === 0) return;

    // Add character variant tasks
    for (const variant of variants) {
      allTasks.push({
        type: 'character',
        execute: () => generateCharacterVariant(ctx, character, variant, charIndex),
      });
    }

    // Add reminder tasks (if character has reminders)
    if (character.reminders && character.reminders.length > 0) {
      allTasks.push({
        type: 'reminder',
        execute: () =>
          generateReminderTokens(
            ctx,
            character,
            charIndex,
            charReminderOptions.generateReminderVariants,
            charReminderOptions.autoGenerateReminderVariants,
            charReminderOptions.autoGenerateTeams
          ),
      });
    }
  });

  logger.info(
    'BatchGenerator',
    `Processing ${allTasks.length} token tasks in parallel (no batching)`
  );

  // Set phase to combined generation (since we're interleaving)
  ctx.detailedProgress?.setPhase('character');

  // Check abort before starting
  checkAbort(ctx.signal);

  // Execute ALL tasks in parallel - no artificial batching (like jinx tokens)
  // This maximizes parallelism and eliminates sequential wait between batches
  const results = await Promise.all(allTasks.map((task) => task.execute()));

  // Collect results (handle both single tokens and token arrays from reminders)
  for (const result of results) {
    if (result === null) continue;
    if (Array.isArray(result)) {
      tokens.push(...result);
    } else {
      tokens.push(result);
    }
  }

  // Set final phase
  ctx.detailedProgress?.setPhase('reminder');

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
 * @param progressCallback - Optional callback for progress updates (legacy, use detailedProgressCallback for breakdown)
 * @param scriptMeta - Optional script metadata for meta tokens
 * @param tokenCallback - Optional callback for incremental token updates
 * @param signal - Optional AbortSignal for cancellation
 * @param characterMetadata - Optional map of character UUID to metadata (for decorative overrides)
 * @param detailedProgressCallback - Optional callback for detailed progress with character/reminder/meta breakdown
 * @returns Promise resolving to array of generated tokens
 */
export async function generateAllTokens(
  characters: Character[],
  options: Partial<GenerationOptions> = {},
  progressCallback: ProgressCallback | null = null,
  scriptMeta: ScriptMeta | null = null,
  tokenCallback: TokenCallback | null = null,
  signal?: AbortSignal,
  characterMetadata?: Map<string, CharacterMetadata>,
  detailedProgressCallback?: DetailedProgressCallback | null
): Promise<Token[]> {
  checkAbort(signal);

  // Create generator and factory
  const generatorOptions = buildGeneratorOptions(options, scriptMeta);
  const generator = new TokenGenerator(generatorOptions);
  const factory = new TokenFactory(tokenCallback);

  // Pre-warm caches
  await prewarmCaches(generator, characters);

  // Pre-resolve all character image URLs using SSOT
  const resolvedImageUrls = await preResolveCharacterImageUrls(
    characters,
    options.generateImageVariants ?? false
  );

  // Calculate token counts by type for accurate progress tracking
  const tokenCounts = calculateTokenCountsByType(characters, options, scriptMeta);

  // Create progress trackers
  const progress = createProgressState(tokenCounts.total, progressCallback);
  const detailedProgress = detailedProgressCallback
    ? new DetailedProgressTracker(tokenCounts, detailedProgressCallback)
    : null;

  // Build batch context
  const ctx: BatchContext = {
    generator,
    factory,
    progress,
    detailedProgress,
    options,
    scriptMeta,
    characters,
    characterMetadata,
    signal,
    resolvedImageUrls,
    decoratedGeneratorCache: new Map(),
  };

  // Generate meta tokens first (so they appear quickly)
  detailedProgress?.setPhase('meta');
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

  // Mark generation complete
  detailedProgress?.setPhase('complete');

  // Return character tokens first, meta tokens last (for display ordering)
  return [...characterTokens, ...metaTokens];
}

// ============================================================================
// PARTIAL GENERATION FUNCTIONS (for regenerating specific token types)
// ============================================================================

/**
 * Common setup for partial generation functions
 */
async function createPartialGenerationContext(
  characters: Character[],
  options: Partial<GenerationOptions>,
  scriptMeta: ScriptMeta | null,
  tokenCallback: TokenCallback | null,
  signal?: AbortSignal,
  characterMetadata?: Map<string, CharacterMetadata>,
  tokenCounts?: TokenCountsByType,
  detailedProgressCallback?: DetailedProgressCallback | null
): Promise<BatchContext> {
  checkAbort(signal);

  const generatorOptions = buildGeneratorOptions(options, scriptMeta);
  const generator = new TokenGenerator(generatorOptions);
  const factory = new TokenFactory(tokenCallback);

  await prewarmCaches(generator, characters);

  const resolvedImageUrls = await preResolveCharacterImageUrls(
    characters,
    options.generateImageVariants ?? false
  );

  // Progress will be set by caller based on expected token count
  const progress = createProgressState(0, null);

  // Create detailed progress tracker if counts and callback provided
  const detailedProgress =
    tokenCounts && detailedProgressCallback
      ? new DetailedProgressTracker(tokenCounts, detailedProgressCallback)
      : null;

  return {
    generator,
    factory,
    progress,
    detailedProgress,
    options,
    scriptMeta,
    characters,
    characterMetadata,
    signal,
    resolvedImageUrls,
    decoratedGeneratorCache: new Map(),
  };
}

/**
 * Generate only character tokens (no reminders, no meta)
 */
export async function generateCharacterTokens(
  characters: Character[],
  options: Partial<GenerationOptions> = {},
  progressCallback: ProgressCallback | null = null,
  scriptMeta: ScriptMeta | null = null,
  tokenCallback: TokenCallback | null = null,
  signal?: AbortSignal,
  characterMetadata?: Map<string, CharacterMetadata>,
  detailedProgressCallback?: DetailedProgressCallback | null
): Promise<Token[]> {
  // Calculate character token count using full calculation
  const fullCounts = calculateTokenCountsByType(characters, options, scriptMeta);
  const partialCounts: TokenCountsByType = {
    character: fullCounts.character,
    reminder: 0,
    meta: 0,
    total: fullCounts.character,
  };

  const ctx = await createPartialGenerationContext(
    characters,
    options,
    scriptMeta,
    tokenCallback,
    signal,
    characterMetadata,
    partialCounts,
    detailedProgressCallback
  );

  // Calculate character token count
  const charOptions: CharacterTokenOptions = {
    generateImageVariants: options.generateImageVariants ?? false,
    autoGenerateCharacterVariants: options.autoGenerateCharacterVariants ?? false,
    autoGenerateTeams: options.autoGenerateTeams ?? DEFAULT_AUTO_GENERATE_TEAMS,
  };

  ctx.progress = createProgressState(fullCounts.character, progressCallback);
  ctx.detailedProgress?.setPhase('character');

  return generateCharacterTokensOnly(ctx, characters, charOptions);
}

/**
 * Generate only reminder tokens (no characters, no meta)
 */
export async function generateReminders(
  characters: Character[],
  options: Partial<GenerationOptions> = {},
  progressCallback: ProgressCallback | null = null,
  scriptMeta: ScriptMeta | null = null,
  tokenCallback: TokenCallback | null = null,
  signal?: AbortSignal,
  characterMetadata?: Map<string, CharacterMetadata>,
  detailedProgressCallback?: DetailedProgressCallback | null
): Promise<Token[]> {
  // Calculate reminder token count using full calculation
  const fullCounts = calculateTokenCountsByType(characters, options, scriptMeta);
  const partialCounts: TokenCountsByType = {
    character: 0,
    reminder: fullCounts.reminder,
    meta: 0,
    total: fullCounts.reminder,
  };

  const ctx = await createPartialGenerationContext(
    characters,
    options,
    scriptMeta,
    tokenCallback,
    signal,
    characterMetadata,
    partialCounts,
    detailedProgressCallback
  );

  const reminderOptions: ReminderTokenOptions = {
    generateReminderVariants: options.generateReminderVariants ?? false,
    autoGenerateReminderVariants: options.autoGenerateReminderVariants ?? false,
    autoGenerateTeams: options.autoGenerateTeams ?? DEFAULT_AUTO_GENERATE_TEAMS,
  };

  ctx.progress = createProgressState(fullCounts.reminder, progressCallback);
  ctx.detailedProgress?.setPhase('reminder');

  return generateReminderTokensOnly(ctx, characters, reminderOptions);
}

/**
 * Generate only meta tokens (no characters, no reminders)
 */
export async function generateMeta(
  characters: Character[],
  options: Partial<GenerationOptions> = {},
  progressCallback: ProgressCallback | null = null,
  scriptMeta: ScriptMeta | null = null,
  tokenCallback: TokenCallback | null = null,
  signal?: AbortSignal,
  characterMetadata?: Map<string, CharacterMetadata>,
  detailedProgressCallback?: DetailedProgressCallback | null
): Promise<Token[]> {
  // Calculate meta token count using full calculation
  const fullCounts = calculateTokenCountsByType(characters, options, scriptMeta);
  const partialCounts: TokenCountsByType = {
    character: 0,
    reminder: 0,
    meta: fullCounts.meta,
    total: fullCounts.meta,
  };

  const ctx = await createPartialGenerationContext(
    characters,
    options,
    scriptMeta,
    tokenCallback,
    signal,
    characterMetadata,
    partialCounts,
    detailedProgressCallback
  );

  ctx.progress = createProgressState(fullCounts.meta, progressCallback);
  ctx.detailedProgress?.setPhase('meta');

  return generateMetaTokens(ctx);
}
