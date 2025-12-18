/**
 * Characters tab pre-rendering strategy.
 * Pre-renders first character + reminders for instant characters view display.
 */

import type { Character, GenerationOptions, Token } from '@/ts/types/index.js';
import { regenerateCharacterAndReminders } from '@/ts/ui/detailViewUtils.js';
import { globalImageCache } from '@/ts/utils/imageCache.js';
import type {
  ICacheStrategy,
  IPreRenderStrategy,
  PreRenderContext,
  PreRenderResult,
} from '@/ts/cache/core/index.js';

/**
 * Cache entry for pre-rendered character tokens.
 */
export interface CharactersPreRenderEntry {
  /** Main character token */
  characterToken: Token;
  /** Array of reminder tokens */
  reminderTokens: Token[];
  /** Character UUID for identity */
  characterUuid: string;
  /** Hash of generation options */
  optionsHash: string;
}

/**
 * Configuration options for characters pre-rendering.
 */
export interface CharactersStrategyOptions {
  /** Include reminder tokens (default: true) */
  includeReminders: boolean;
}

/**
 * Domain Service: Characters pre-rendering strategy.
 * Pre-renders first character and its reminders for instant characters view.
 */
export class CharactersPreRenderStrategy implements IPreRenderStrategy {
  readonly name = 'characters';
  readonly priority = 2;

  constructor(
    private cache: ICacheStrategy<string, CharactersPreRenderEntry>,
    private options: CharactersStrategyOptions = {
      includeReminders: true,
    }
  ) {}

  shouldTrigger(context: PreRenderContext): boolean {
    return (
      context.type === 'characters-hover' &&
      context.characters != null &&
      context.characters.length > 0 &&
      context.generationOptions != null
    );
  }

  async preRender(context: PreRenderContext): Promise<PreRenderResult> {
    const { characters, generationOptions } = context;

    if (!characters || characters.length === 0 || !generationOptions) {
      return {
        success: false,
        rendered: 0,
        skipped: 0,
        error: 'Missing characters or generation options',
      };
    }

    // Pre-render only first character
    const character = characters[0];
    const cacheKey = this.getCacheKey(character, generationOptions);

    // Check if already cached with same options
    if (this.cache.has(cacheKey)) {
      return {
        success: true,
        rendered: 0,
        skipped: 1,
        metadata: {
          strategy: this.name,
          cached: true,
        },
      };
    }

    try {
      // Generate character and reminder tokens
      const { characterToken, reminderTokens } = await regenerateCharacterAndReminders(
        character,
        generationOptions
      );

      // Store in cache
      const entry: CharactersPreRenderEntry = {
        characterToken,
        reminderTokens: this.options.includeReminders ? reminderTokens : [],
        characterUuid: character.id,
        optionsHash: this.hashOptions(generationOptions),
      };

      await this.cache.set(cacheKey, entry);

      return {
        success: true,
        rendered: 1,
        skipped: 0,
        metadata: {
          strategy: this.name,
          characterId: character.id,
          reminderCount: reminderTokens.length,
          cacheStats: this.cache.getStats(),
        },
      };
    } catch (error) {
      return {
        success: false,
        rendered: 0,
        skipped: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get pre-rendered tokens for a character if cached.
   * @param character - Character to retrieve
   * @param options - Generation options
   * @returns Cached entry or null
   */
  async getPreRendered(
    character: Character,
    options: GenerationOptions
  ): Promise<CharactersPreRenderEntry | null> {
    const cacheKey = this.getCacheKey(character, options);
    const entry = await this.cache.get(cacheKey);
    return entry?.value ?? null;
  }

  /**
   * Preload images for character and variants during idle time.
   * Uses requestIdleCallback to avoid blocking user interactions.
   *
   * @param context - Pre-render context with characters
   * @param onProgress - Optional progress callback (loaded, total)
   * @returns Promise that resolves when preloading completes
   */
  async preloadImages(
    context: PreRenderContext,
    onProgress?: (loaded: number, total: number) => void
  ): Promise<void> {
    const { characters, generationOptions } = context;

    if (!characters || characters.length === 0) {
      onProgress?.(0, 0);
      return;
    }

    // Extract image URLs from first character (customize view focuses on one character)
    const imageUrls = new Set<string>();
    const character = characters[0];

    // Add character images (including variants)
    if (character.image) {
      if (Array.isArray(character.image)) {
        for (const url of character.image) {
          imageUrls.add(url);
        }
      } else {
        imageUrls.add(character.image);
      }
    }

    // Add background images from generation options
    if (generationOptions) {
      const { characterBackground, reminderBackground, logoUrl } = generationOptions;
      if (characterBackground) imageUrls.add(characterBackground);
      if (reminderBackground) imageUrls.add(reminderBackground);
      if (logoUrl) imageUrls.add(logoUrl);
    }

    // Filter out already cached images
    const urlsToLoad = Array.from(imageUrls).filter((url) => !globalImageCache.has(url));

    if (urlsToLoad.length === 0) {
      // All images already cached
      onProgress?.(0, 0);
      return;
    }

    // Preload images using idle callback for non-blocking behavior
    return new Promise((resolve) => {
      const preload = async () => {
        await globalImageCache.preloadMany(urlsToLoad, false, onProgress);
        resolve();
      };

      if ('requestIdleCallback' in window) {
        (
          window as Window & {
            requestIdleCallback: (callback: () => void, options?: { timeout: number }) => number;
          }
        ).requestIdleCallback(preload, { timeout: 2000 });
      } else {
        // Fallback: use setTimeout for non-blocking behavior
        setTimeout(preload, 0);
      }
    });
  }

  /**
   * Generate cache key for character + options.
   * @param character - Character
   * @param options - Generation options
   * @returns Cache key string
   */
  private getCacheKey(character: Character, options: GenerationOptions): string {
    const optionsHash = this.hashOptions(options);
    return `${character.id}_${optionsHash}`;
  }

  /**
   * Hash generation options that affect rendering.
   * Only includes options that actually change the visual output.
   *
   * @param options - Generation options
   * @returns Hash string
   */
  private hashOptions(options: GenerationOptions): string {
    // Hash all appearance-affecting options
    // Note: We exclude non-visual options like generateImageVariants, tokenCount badge
    const relevantOptions = {
      displayAbilityText: options.displayAbilityText,
      generateBootleggerRules: options.generateBootleggerRules,
      setupStyle: options.setupStyle,
      reminderBackground: options.reminderBackground,
      reminderBackgroundImage: options.reminderBackgroundImage,
      reminderBackgroundType: options.reminderBackgroundType,
      characterBackground: options.characterBackground,
      characterBackgroundColor: options.characterBackgroundColor,
      characterBackgroundType: options.characterBackgroundType,
      characterNameFont: options.characterNameFont,
      characterNameColor: options.characterNameColor,
      dpi: options.dpi,
      // Note: Omitting generateImageVariants, tokenCount as they don't affect individual token appearance
    };

    // Simple hash: stringify and create hash code
    const str = JSON.stringify(relevantOptions);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
}
