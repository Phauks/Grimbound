/**
 * Tab Pre-Render Service
 *
 * Unified service for handling all tab hover pre-rendering.
 * Consolidates previously scattered pre-render logic into a single,
 * consistent API with proper caching and invalidation.
 *
 * Architecture: Application Service (Facade Pattern) with Strategy Pattern
 *
 * @module ts/cache/TabPreRenderService
 */

import { isCharacter } from '@/ts/data/scriptParser.js';
import type { NightOrderResult } from '@/ts/nightOrder/nightOrderUtils.js';
import { buildNightOrder } from '@/ts/nightOrder/nightOrderUtils.js';
import type {
  Character,
  GenerationOptions,
  ScriptEntry,
  ScriptMeta,
  Token,
} from '@/ts/types/index.js';
import { regenerateCharacterAndReminders } from '@/ts/ui/detailViewUtils.js';
import { resolveCharacterImageUrl } from '@/ts/utils/characterImageResolver.js';
import { cacheManager } from './CacheManager.js';
import { CacheLogger } from './utils/CacheLogger.js';
import { hashArray, hashGenerationOptions } from './utils/hashUtils.js';

// ============================================================================
// Constants
// ============================================================================

/** Timeout for image preload idle callback (ms) */
const IMAGE_PRELOAD_TIMEOUT_MS = 200;

// ============================================================================
// Types
// ============================================================================

/** Supported tab types for pre-rendering */
export type PreRenderableTab = 'characters' | 'tokens' | 'script';

/** Context for tab pre-rendering */
export interface TabPreRenderContext {
  /** Characters from the current script */
  characters: Character[];
  /** Generated tokens */
  tokens: Token[];
  /** Script metadata (optional) */
  scriptMeta?: ScriptMeta | null;
  /** Token generation options */
  generationOptions?: GenerationOptions;
  /** Last selected character UUID (for characters tab) */
  lastSelectedCharacterUuid?: string;
}

/** Result of a tab pre-render operation */
export interface TabPreRenderResult {
  /** Whether the pre-render was successful */
  success: boolean;
  /** Tab that was pre-rendered */
  tab: PreRenderableTab;
  /** Whether data was served from cache */
  fromCache: boolean;
  /** Number of items processed */
  itemCount: number;
  /** Error message if failed */
  error?: string;
}

/** Cached night order data */
interface NightOrderCacheEntry {
  hash: string;
  firstNight: NightOrderResult;
  otherNight: NightOrderResult;
  timestamp: number;
}

/** Cached resolved character image URLs for night order */
interface CharacterImageCacheEntry {
  resolvedUrls: Map<string, string>;
  timestamp: number;
}

/** Cached pre-rendered character tokens for instant display */
interface CharacterTokenCacheEntry {
  characterToken: Token;
  reminderTokens: Token[];
  characterUuid: string;
  optionsHash: string;
}

/** Dependencies that can be injected for testing */
export interface TabPreRenderServiceDeps {
  cacheManager: typeof cacheManager;
  resolveImageUrl: typeof resolveCharacterImageUrl;
  buildNightOrder: typeof buildNightOrder;
  regenerateTokens: typeof regenerateCharacterAndReminders;
}

// ============================================================================
// Utility Functions (Pure, Testable)
// ============================================================================

/**
 * Extract a usable image URL from a character's image field.
 * Handles arrays, AssetReference objects, and plain strings.
 */
function extractImageUrl(image: Character['image']): string | null {
  if (Array.isArray(image)) {
    return typeof image[0] === 'string' ? image[0] : null;
  }
  if (typeof image === 'object' && image !== null) {
    return (image as { url?: string }).url || null;
  }
  return typeof image === 'string' ? image : null;
}

/** Idle deadline interface for requestIdleCallback */
interface IdleDeadline {
  readonly didTimeout: boolean;
  timeRemaining(): number;
}

/** Type for window with requestIdleCallback */
type WindowWithIdle = Window & {
  requestIdleCallback: (
    cb: (deadline: IdleDeadline) => void,
    opts?: { timeout?: number }
  ) => number;
};

/**
 * Schedule work during browser idle time.
 * Falls back to setTimeout if requestIdleCallback unavailable.
 */
function scheduleIdleWork(
  callback: (deadline: IdleDeadline | null) => void,
  timeoutMs: number
): void {
  if ('requestIdleCallback' in window) {
    (window as WindowWithIdle).requestIdleCallback(callback, { timeout: timeoutMs });
  } else {
    // Fallback: pass null deadline (no time remaining info)
    setTimeout(() => callback(null), 0);
  }
}

/**
 * Create an empty result for early returns.
 */
function emptyResult(tab: PreRenderableTab): TabPreRenderResult {
  return { success: true, tab, fromCache: true, itemCount: 0 };
}

// ============================================================================
// Tab Pre-Render Service
// ============================================================================

/**
 * Unified service for tab hover pre-rendering.
 *
 * Provides a consistent API for pre-rendering data when users hover over tabs,
 * improving perceived performance when navigating between views.
 *
 * @example
 * ```typescript
 * // In TabNavigation component
 * tabPreRenderService.preRenderTab('script', { characters, tokens, scriptMeta });
 *
 * // In target view component
 * const cached = tabPreRenderService.getCachedNightOrder(scriptData);
 * ```
 */
export class TabPreRenderService {
  // Dependencies (injectable for testing)
  private readonly deps: TabPreRenderServiceDeps;

  // Night order cache (lightweight data computation)
  private nightOrderCache: NightOrderCacheEntry | null = null;

  // Character image URL cache (for night order)
  private characterImageCache: CharacterImageCacheEntry = {
    resolvedUrls: new Map(),
    timestamp: 0,
  };

  // Character token cache (for instant display on view mount)
  // Keyed by `${characterUuid}:${optionsHash}`
  private characterTokenCache: Map<string, CharacterTokenCacheEntry> = new Map();
  private static readonly MAX_CHARACTER_TOKEN_CACHE_SIZE = 10;

  // Concurrency guards
  private isPreRenderingCharacterImages = false;
  private isPreRenderingCharacterTokens = false;

  constructor(deps: Partial<TabPreRenderServiceDeps> = {}) {
    this.deps = {
      cacheManager: deps.cacheManager ?? cacheManager,
      resolveImageUrl: deps.resolveImageUrl ?? resolveCharacterImageUrl,
      buildNightOrder: deps.buildNightOrder ?? buildNightOrder,
      regenerateTokens: deps.regenerateTokens ?? regenerateCharacterAndReminders,
    };
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Pre-render data for a specific tab.
   * Call this on tab hover to warm caches.
   *
   * @param tab - Tab to pre-render for
   * @param context - Pre-render context with required data
   * @returns Result of pre-render operation
   */
  preRenderTab(tab: PreRenderableTab, context: TabPreRenderContext): TabPreRenderResult {
    CacheLogger.debug(`Pre-rendering tab: ${tab}`, {
      characterCount: context.characters.length,
      tokenCount: context.tokens.length,
    });

    switch (tab) {
      case 'characters':
        return this.preRenderCharacters(context);
      case 'tokens':
        // Token gallery has its own caching in TokenCard - no pre-render needed here
        return emptyResult('tokens');
      case 'script':
        return this.preRenderScript(context);
      default:
        return {
          success: false,
          tab,
          fromCache: false,
          itemCount: 0,
          error: `Unknown tab: ${tab}`,
        };
    }
  }

  /**
   * Get cached night order if available and valid.
   *
   * @param scriptData - Script data to validate cache against
   * @returns Cached night order or null if cache miss
   */
  getCachedNightOrder(scriptData: ScriptEntry[]): {
    firstNight: NightOrderResult;
    otherNight: NightOrderResult;
  } | null {
    if (!this.nightOrderCache) return null;

    const hash = this.hashScriptData(scriptData);
    if (this.nightOrderCache.hash !== hash) return null;

    return {
      firstNight: this.nightOrderCache.firstNight,
      otherNight: this.nightOrderCache.otherNight,
    };
  }

  /**
   * Get cached resolved image URL for a character.
   * Used by NightOrderEntry to avoid async image resolution flash.
   *
   * @param characterId - Character ID
   * @returns Resolved URL or undefined if not cached
   */
  getCachedCharacterImageUrl(characterId: string): string | undefined {
    return this.characterImageCache.resolvedUrls.get(characterId);
  }

  /**
   * Check if a character image URL is cached.
   *
   * @param characterId - Character ID
   * @returns True if cached
   */
  hasCharacterImageUrl(characterId: string): boolean {
    return this.characterImageCache.resolvedUrls.has(characterId);
  }

  /**
   * Get cached pre-rendered character tokens.
   * Used by CharactersView for instant display on mount.
   *
   * @param characterUuid - Character UUID
   * @param options - Generation options
   * @returns Cached entry or null if not available
   */
  getCachedCharacterTokens(
    characterUuid: string,
    options: GenerationOptions
  ): CharacterTokenCacheEntry | null {
    const optionsHash = hashGenerationOptions(options);
    const key = `${characterUuid}:${optionsHash}`;
    return this.characterTokenCache.get(key) ?? null;
  }

  /**
   * Check if character tokens are cached.
   *
   * @param characterUuid - Character UUID
   * @param options - Generation options
   * @returns True if cached
   */
  hasCharacterTokens(characterUuid: string, options: GenerationOptions): boolean {
    const optionsHash = hashGenerationOptions(options);
    const key = `${characterUuid}:${optionsHash}`;
    return this.characterTokenCache.has(key);
  }

  /**
   * Clear all tab pre-render caches.
   */
  clearAll(): void {
    this.nightOrderCache = null;
    this.characterImageCache.resolvedUrls.clear();
    this.characterTokenCache.clear();
    CacheLogger.info('All tab pre-render caches cleared');
  }

  /**
   * Clear cache for a specific tab.
   */
  clearCache(tab: PreRenderableTab): void {
    switch (tab) {
      case 'script':
        this.nightOrderCache = null;
        this.characterImageCache.resolvedUrls.clear();
        break;
      case 'tokens':
        // Token gallery has its own caching in TokenCard - nothing to clear here
        break;
      case 'characters':
        this.characterTokenCache.clear();
        break;
      default:
        // Exhaustive check - should never reach here
        break;
    }
    CacheLogger.debug(`Cache cleared for tab: ${tab}`);
  }

  // ============================================================================
  // Private: Tab-Specific Pre-Render Methods
  // ============================================================================

  /**
   * Pre-render for Characters tab.
   * Generates character token and stores in sync cache for instant display.
   */
  private preRenderCharacters(context: TabPreRenderContext): TabPreRenderResult {
    const { characters, generationOptions, lastSelectedCharacterUuid } = context;

    if (characters.length === 0 || !generationOptions) {
      return emptyResult('characters');
    }

    const character = this.findCharacterToPreRender(characters, lastSelectedCharacterUuid);
    const characterUuid = character.uuid ?? character.id;
    const optionsHash = hashGenerationOptions(generationOptions);
    const key = `${characterUuid}:${optionsHash}`;

    // Check if already cached
    if (this.characterTokenCache.has(key)) {
      return { success: true, tab: 'characters', fromCache: true, itemCount: 1 };
    }

    // Prevent concurrent pre-rendering
    if (this.isPreRenderingCharacterTokens) {
      return { success: true, tab: 'characters', fromCache: false, itemCount: 0 };
    }

    this.isPreRenderingCharacterTokens = true;

    // Generate tokens (async, fire-and-forget)
    this.deps
      .regenerateTokens(character, generationOptions)
      .then(({ characterToken, reminderTokens }) => {
        // LRU eviction if cache is full
        if (
          this.characterTokenCache.size >= TabPreRenderService.MAX_CHARACTER_TOKEN_CACHE_SIZE &&
          !this.characterTokenCache.has(key)
        ) {
          const firstKey = this.characterTokenCache.keys().next().value as string | undefined;
          if (firstKey) this.characterTokenCache.delete(firstKey);
        }

        // Store in cache
        this.characterTokenCache.set(key, {
          characterToken,
          reminderTokens,
          characterUuid,
          optionsHash,
        });

        CacheLogger.debug(`Pre-rendered character: ${character.name}`);
      })
      .catch((err) => {
        CacheLogger.warn('Characters pre-render failed', { error: err });
      })
      .finally(() => {
        this.isPreRenderingCharacterTokens = false;
      });

    return { success: true, tab: 'characters', fromCache: false, itemCount: 1 };
  }

  /** Find character to pre-render: last selected or first in list */
  private findCharacterToPreRender(characters: Character[], lastSelectedUuid?: string): Character {
    if (lastSelectedUuid) {
      const found = characters.find((c) => c.uuid === lastSelectedUuid);
      if (found) return found;
    }
    return characters[0];
  }

  /**
   * Pre-render for Script tab.
   * Builds night order data structures and preloads character images.
   */
  private preRenderScript(context: TabPreRenderContext): TabPreRenderResult {
    const { characters, scriptMeta } = context;

    if (characters.length === 0) {
      return emptyResult('script');
    }

    const scriptData = scriptMeta ? [scriptMeta, ...characters] : characters;
    const hash = this.hashScriptData(scriptData);

    // Check cache hit
    if (this.nightOrderCache?.hash === hash) {
      this.preloadCharacterImages(characters);
      return {
        success: true,
        tab: 'script',
        fromCache: true,
        itemCount: this.nightOrderCache.firstNight.entries.length,
      };
    }

    // Build and cache night order
    const firstNight = this.deps.buildNightOrder(scriptData, 'first');
    const otherNight = this.deps.buildNightOrder(scriptData, 'other');

    this.nightOrderCache = { hash, firstNight, otherNight, timestamp: Date.now() };
    this.preloadCharacterImages(characters);

    return { success: true, tab: 'script', fromCache: false, itemCount: firstNight.entries.length };
  }

  /**
   * Preload character images for night order display.
   */
  private preloadCharacterImages(characters: Character[]): void {
    if (this.isPreRenderingCharacterImages) return;

    const toResolve = characters.filter((c) => !this.characterImageCache.resolvedUrls.has(c.id));
    if (toResolve.length === 0) return;

    this.isPreRenderingCharacterImages = true;
    CacheLogger.debug(`Preloading ${toResolve.length} character images for night order`);

    // Async image resolution - callback returns immediately, so deadline not needed
    scheduleIdleWork(() => {
      this.resolveCharacterImages(toResolve);
    }, IMAGE_PRELOAD_TIMEOUT_MS);
  }

  /** Resolve character images asynchronously */
  private async resolveCharacterImages(characters: Character[]): Promise<void> {
    for (const character of characters) {
      const imageUrl = extractImageUrl(character.image);
      if (!imageUrl) continue;

      try {
        const result = await this.deps.resolveImageUrl(imageUrl, character.id, {
          logContext: 'TabPreRenderService',
        });
        this.characterImageCache.resolvedUrls.set(character.id, result.url);
      } catch {
        // Use original URL as fallback
        this.characterImageCache.resolvedUrls.set(character.id, imageUrl);
      }
    }

    this.characterImageCache.timestamp = Date.now();
    this.isPreRenderingCharacterImages = false;
    CacheLogger.debug(`Finished preloading ${characters.length} character images`);
  }

  // ============================================================================
  // Private: Hash Utilities
  // ============================================================================

  /**
   * Hash script data for cache key validation.
   */
  private hashScriptData(scriptData: ScriptEntry[]): string {
    return hashArray(scriptData, (entry) =>
      typeof entry === 'string' ? entry : isCharacter(entry) ? entry.id : '_meta'
    );
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Global tab pre-render service singleton.
 *
 * @example
 * ```typescript
 * import { tabPreRenderService } from '@/ts/cache/TabPreRenderService.js';
 *
 * // Pre-render on tab hover
 * tabPreRenderService.preRenderTab('script', {
 *   characters,
 *   tokens,
 *   scriptMeta,
 * });
 *
 * // Get cached data
 * const cached = tabPreRenderService.getCachedNightOrder(scriptData);
 * ```
 */
export const tabPreRenderService = new TabPreRenderService();
